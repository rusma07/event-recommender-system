// utils/indexerClient.js
export async function upsertEventToIndexer(event) {
  try {
    const INDEXER_URL = process.env.INDEXER_URL || "http://localhost:8000"; // FastAPI host
    const payload = {
      event_id: event.event_id,
      title: event.title,
      description: event.description || "",
      tags: event.tags || [],
      location: event.location || "",
      url: event.url || "",
      image: event.image || "",
    };
    // don't block the request: set a short timeout
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${INDEXER_URL}/index/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(t);

    if (!res || !res.ok) {
      console.warn("Indexer upsert failed (non-blocking).");
    }
  } catch (e) {
    console.warn("Indexer upsert error (non-blocking):", e.message);
  }
}

export async function deleteEventFromIndexer(eventId) {
  try {
    const INDEXER_URL = process.env.INDEXER_URL || "http://localhost:8000";
    await fetch(`${INDEXER_URL}/index/event/${eventId}`, { method: "DELETE" }).catch(() => null);
  } catch {}
}
