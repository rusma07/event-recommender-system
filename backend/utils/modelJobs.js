// backend/utils/modelJobs.js
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Config ───────────────────────────────────────────────────────────────────
const PROJECT_ROOT = process.cwd(); // ensure server is started from project root
const TMP_DIR = process.env.MODEL_CHANGES_DIR || path.join(PROJECT_ROOT, "tmp");
const CHANGES_FILE = path.join(TMP_DIR, "model_changes.json");
const STATUS_FILE = path.join(TMP_DIR, "model_last_status.json");

const BUILD_REL = process.env.BUILD_SCRIPT  || "scripts/build_model.py";
const INGEST_REL = process.env.INGEST_SCRIPT || "scripts/ingest.py";
const BUILD = path.resolve(PROJECT_ROOT, BUILD_REL);
const INGEST = path.resolve(PROJECT_ROOT, INGEST_REL);

// resolve Python on Windows reliably
function resolvePython() {
  const envBin = process.env.PYTHON_BIN;
  if (envBin && fs.existsSync(envBin)) return envBin;
  const winVenv = process.platform === "win32" ? ".\\venv\\Scripts\\python.exe" : "./venv/bin/python";
  if (fs.existsSync(winVenv)) return winVenv;
  if (process.platform === "win32") return "py"; // Windows launcher
  return "python";
}
const PY = resolvePython();

// Execution controls (set debounceMs=0 while debugging)
const DEFAULTS = {
  debounceMs: Number(process.env.MODEL_DEBOUNCE_MS ?? 0),
  timeoutMs:  Number(process.env.MODEL_TIMEOUT_MS  ?? 30 * 60 * 1000),
  maxAttempts: Number(process.env.MODEL_MAX_ATTEMPTS ?? 1),
};

// Debounce/lock
let pendingTimer = null;
let running = false;

// Accumulate incremental changes
const pending = {
  upserts: new Map(), // id -> event
  deletes: new Set(), // id
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function writeStatus(statusObj) {
  try {
    ensureTmp();
    fs.writeFileSync(STATUS_FILE, JSON.stringify({ at: new Date().toISOString(), ...statusObj }, null, 2));
  } catch (e) {
    console.warn("⚠️ writeStatus failed:", e.message);
  }
}

function flushChangesToFile() {
  try {
    ensureTmp();
    const payload = {
      upserts: Array.from(pending.upserts.values()),
      deletes: Array.from(pending.deletes),
      queued_at: new Date().toISOString(),
    };
    fs.writeFileSync(CHANGES_FILE, JSON.stringify(payload, null, 2));
    pending.upserts.clear();
    pending.deletes.clear();
    return CHANGES_FILE;
  } catch (e) {
    console.warn("⚠️ Could not write changes file:", e.message);
    return null;
  }
}

function runScript(cmd, args = [], { timeoutMs, env = {} } = {}) {
  console.log(`▶️ spawn: ${cmd} ${args.join(" ")}`);
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: false,                  // ok on Windows for "py" and absolute exe; no needless shell
      env: { ...process.env, ...env }
    });

    const to = timeoutMs ? setTimeout(() => {
      console.error(`⏱️ timeout after ${timeoutMs}ms, killing: ${cmd}`);
      // SIGKILL isn't a thing on Windows; plain kill works and maps to TerminateProcess
      child.kill();
    }, timeoutMs) : null;

    child.on("error", (err) => {
      if (to) clearTimeout(to);
      writeStatus({ ok: false, phase: "spawn", err: String(err) });
      reject(err);
    });

    child.on("close", (code) => {
      if (to) clearTimeout(to);
      if (code === 0) {
        resolve();
      } else {
        const err = new Error(`${cmd} exited with code ${code}`);
        writeStatus({ ok: false, phase: "close", code });
        reject(err);
      }
    });
  });
}

async function runPipeline({ timeoutMs, maxAttempts }) {
  // sanity checks & helpful logs
  if (!fs.existsSync(BUILD)) {
    console.error(`❌ build script not found at: ${BUILD}`);
    writeStatus({ ok: false, err: "build script missing", build: BUILD });
    throw new Error("build script missing");
  }
  if (!fs.existsSync(INGEST)) {
    console.error(`❌ ingest script not found at: ${INGEST}`);
    writeStatus({ ok: false, err: "ingest script missing", ingest: INGEST });
    throw new Error("ingest script missing");
  }

  console.log("🔎 config:", { PY, BUILD, INGEST, PROJECT_ROOT });

  const cf = flushChangesToFile();
  const buildArgs  = [BUILD, ...(cf ? ["--rebuild", "--changes-file", cf] : ["--rebuild"])];
  const ingestArgs = [INGEST, ...(cf ? ["--ingest-all", "--changes-file", cf] : ["--ingest-all"])];

  let attempt = 0;
  let lastErr = null;
  while (attempt < Math.max(1, maxAttempts)) {
    attempt += 1;
    console.log(`🔧 pipeline attempt ${attempt}/${maxAttempts}`);
    try {
      await runScript(PY, buildArgs,  { timeoutMs, env: { CHANGES_FILE: cf || "" } });
      await runScript(PY, ingestArgs, { timeoutMs, env: { CHANGES_FILE: cf || "" } });
      writeStatus({ ok: true, cf: cf || null });
      console.log("✅ Model rebuild + ingest complete");
      return;
    } catch (e) {
      console.error("❌ pipeline error:", e.message);
      lastErr = e;
    }
  }
  writeStatus({ ok: false, err: String(lastErr) });
  throw lastErr;
}

// ─── Public API (used by your controller) ─────────────────────────────────────
export function upsertEventToIndexer(event) {
  try {
    if (!event || event.event_id == null) return;
    const id = String(event.event_id);
    pending.upserts.set(id, event);
    pending.deletes.delete(id);
    scheduleRebuild();
  } catch (e) {
    console.error("upsertEventToIndexer error:", e);
  }
}

export function deleteEventFromIndexer(eventId) {
  try {
    if (eventId == null) return;
    const id = String(eventId);
    pending.deletes.add(id);
    pending.upserts.delete(id);
    scheduleRebuild();
  } catch (e) {
    console.error("deleteEventFromIndexer error:", e);
  }
}

export function scheduleRebuild({
  debounceMs = DEFAULTS.debounceMs,
  timeoutMs = DEFAULTS.timeoutMs,
  maxAttempts = DEFAULTS.maxAttempts,
} = {}) {
  if (pendingTimer) clearTimeout(pendingTimer);
  console.log(`⏳ scheduleRebuild called (debounce ${debounceMs} ms)`);
  pendingTimer = setTimeout(async () => {
    if (running) {
      console.log("⏭️ run skipped: already running");
      return;
    }
    running = true;
    try {
      await runPipeline({ timeoutMs, maxAttempts });
    } catch (e) {
      console.error("🚨 Model pipeline failed:", e.message);
    } finally {
      running = false;
    }
  }, Math.max(0, debounceMs));
}

export async function runIndexerNow() {
  if (running) return;
  running = true;
  try {
    await runPipeline({ timeoutMs: DEFAULTS.timeoutMs, maxAttempts: DEFAULTS.maxAttempts });
  } finally {
    running = false;
  }
}
