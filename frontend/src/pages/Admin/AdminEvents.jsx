import React, { useEffect, useMemo, useState } from "react";
import {
  fetchAllEvents,
  createEventApi,
  updateEventApi,
  deleteEventApi,
} from "../../services/admin_events_api";
import ConfirmationModal from "../../components/Modal/ConfirmationModal";

const emptyForm = {
  title: "",
  image: "",
  start_date: "",
  end_date: "",
  location: "",
  tags: [],
  price: "", // "" = no price (null on submit). 0 => Free
  url: "",
};

// --- helpers ---
function parseTagsInput(value) {
  if (Array.isArray(value)) return value;
  return String(value || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// normalize to YYYY-MM-DD for inputs & submission
function dateOnly(value) {
  if (!value) return "";
  const s = String(value);
  if (s.includes("T")) return s.split("T")[0];
  return s.slice(0, 10);
}

function formatPrice(p) {
  if (p === 0) return "Free";
  if (p == null || p === "") return "—";
  return String(p);
}

function EventForm({ initial = emptyForm, onCancel, onSave, saving }) {
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    ...initial,
    start_date: dateOnly(initial?.start_date),
    end_date: dateOnly(initial?.end_date),
    tags: initial?.tags || [],
    price:
      initial?.price === 0
        ? 0
        : initial?.price == null
        ? ""
        : Number(initial.price),
  }));
  const isEdit = Boolean(initial?.event_id);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();

    // derive price:
    // - "" -> null
    // - "Free" (if ever passed) -> 0
    // - number/string -> Number(...)
    let priceOut =
      form.price === "" || form.price === null || form.price === undefined
        ? null
        : form.price;

    if (typeof priceOut === "string") {
      const s = priceOut.trim().toLowerCase();
      priceOut = s === "free" ? 0 : Number(priceOut);
    }

    if (typeof priceOut === "number" && Number.isNaN(priceOut)) {
      priceOut = null;
    }

    const payload = {
      ...form,
      start_date: form.start_date ? dateOnly(form.start_date) : null,
      end_date: form.end_date ? dateOnly(form.end_date) : null,
      tags: parseTagsInput(form.tags),
      price: priceOut,
    };

    onSave(payload);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium">Title *</label>
        <input
          className="w-full border p-2 rounded"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">Start Date *</label>
          <input
            type="date"
            className="w-full border p-2 rounded"
            value={form.start_date}
            onChange={(e) => set("start_date", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">End Date</label>
          <input
            type="date"
            className="w-full border p-2 rounded"
            value={form.end_date || ""}
            onChange={(e) => set("end_date", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Location</label>
        <input
          className="w-full border p-2 rounded"
          value={form.location || ""}
          onChange={(e) => set("location", e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Image URL</label>
        <input
          className="w-full border p-2 rounded"
          value={form.image || ""}
          onChange={(e) => set("image", e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Event URL</label>
        <input
          className="w-full border p-2 rounded"
          value={form.url || ""}
          onChange={(e) => set("url", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">Price</label>
          <input
            className="w-full border p-2 rounded"
            type="number"
            min="0"
            step="0.01"
            placeholder="0 = Free • leave blank = no price"
            value={form.price === "" ? "" : form.price}
            onChange={(e) => {
              const v = e.target.value;
              // keep state as "" or Number
              set("price", v === "" ? "" : Number(v));
            }}
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter <strong>0</strong> to mark as Free.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium">
            Tags (comma separated)
          </label>
          <input
            className="w-full border p-2 rounded"
            placeholder="AI, Tech, Startup"
            value={Array.isArray(form.tags) ? form.tags.join(", ") : form.tags}
            onChange={(e) => set("tags", e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-60"
          disabled={saving}
        >
          {saving ? "Saving..." : isEdit ? "Update" : "Create"}
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded border"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState(null); // event or null
  const [showForm, setShowForm] = useState(false);

  const [confirmEvent, setConfirmEvent] = useState(null); // for delete modal
  const [deletingId, setDeletingId] = useState(null); // track deletion

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchAllEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => {
      const hay = [
        e.title,
        e.location,
        ...(Array.isArray(e.tags) ? e.tags : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [events, filter]);

  const onCreateClick = () => {
    setEditing(null);
    setShowForm(true);
  };

  const onEditClick = (ev) => {
    setEditing(ev);
    setShowForm(true);
  };

  // --- delete with confirmation modal ---
  const askDelete = (ev) => {
    setConfirmEvent(ev);
  };

  const cancelDelete = () => {
    setConfirmEvent(null);
    setDeletingId(null);
  };

  const confirmDelete = async () => {
    if (!confirmEvent) return;

    const event_id = confirmEvent.event_id;

    try {
      setDeletingId(event_id);
      setError("");

      // optimistic update
      setEvents((list) => list.filter((e) => e.event_id !== event_id));
      await deleteEventApi(event_id);
      cancelDelete();
    } catch (e) {
      setError(e.message || "Delete failed");
      await load(); // restore events if delete failed
      cancelDelete();
    }
  };

  const onSave = async (payload) => {
    try {
      setSaving(true);
      setError("");

      // ensure backend-friendly price (optional redundancy)
      if (typeof payload.price === "string") {
        const s = payload.price.trim().toLowerCase();
        payload.price = s === "free" ? 0 : Number(payload.price);
        if (Number.isNaN(payload.price)) payload.price = null;
      }

      if (editing?.event_id) {
        const { event } = await updateEventApi(editing.event_id, payload);
        setEvents((list) =>
          list.map((e) => (e.event_id === event.event_id ? event : e))
        );
      } else {
        const { event } = await createEventApi(payload);
        setEvents((list) => [event, ...list]);
      }

      setShowForm(false);
      setEditing(null);
    } catch (e) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin • Events</h1>
        <button
          onClick={onCreateClick}
          className="px-4 py-2 rounded bg-indigo-600 text-white"
        >
          + Create Event
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 border border-red-200 bg-red-50 text-red-700 rounded">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 p-4 border rounded bg-white shadow">
          <h2 className="font-semibold mb-3">
            {editing ? "Edit Event" : "Create Event"}
          </h2>
          <EventForm
            initial={editing || emptyForm}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
            onSave={onSave}
            saving={saving}
          />
        </div>
      )}

      <div className="mb-4">
        <input
          className="w-full md:w-80 border p-2 rounded"
          placeholder="Filter by title, location or tags…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {loading ? (
        <div>Loading events…</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-600">No events found.</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((ev) => (
            <div
              key={ev.event_id}
              className="p-4 bg-white border rounded shadow-sm flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="font-semibold">{ev.title}</div>
                <div className="text-sm text-gray-600">
                  {ev.location || "—"} •{" "}
                  {Array.isArray(ev.tags) && ev.tags.length
                    ? ev.tags.join(", ")
                    : "no tags"}
                </div>
                <div className="text-xs text-gray-500">
                  {dateOnly(ev.start_date)}{" "}
                  {ev.end_date ? `→ ${dateOnly(ev.end_date)}` : ""}
                </div>
                <div className="text-xs text-gray-700">
                  Price: {formatPrice(ev.price)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEditClick(ev)}
                  className="px-3 py-1.5 rounded border"
                >
                  Edit
                </button>
                <button
                  onClick={() => askDelete(ev)}
                  className="px-3 py-1.5 rounded bg-red-600 text-white"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      <ConfirmationModal
        open={!!confirmEvent}
        title="Delete Event?"
        message={
          confirmEvent
            ? `Are you sure you want to delete "${confirmEvent.title}"? This action cannot be undone.`
            : ""
        }
        confirmText="Delete"
        cancelText="Cancel"
        danger
        loading={!!deletingId}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
