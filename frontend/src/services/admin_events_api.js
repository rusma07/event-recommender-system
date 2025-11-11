// src/services/admin_events_api.js
const BACKEND_URL = import.meta.env.VITE_API_BACKEND_URL || ""; // e.g. http://localhost:5000/api

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchAllEvents() {
  const res = await fetch(`${BACKEND_URL}/events`);
  if (!res.ok) throw new Error("Failed to load events");
  return res.json();
}

export async function createEventApi(payload) {
  const res = await fetch(`${BACKEND_URL}/events`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Create failed");
  return res.json(); // { message, event }
}

export async function updateEventApi(eventId, payload) {
  const res = await fetch(`${BACKEND_URL}/events/${eventId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Update failed");
  return res.json(); // { message, event }
}

export async function deleteEventApi(eventId) {
  const res = await fetch(`${BACKEND_URL}/events/${eventId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
  return res.json(); // { message }
}
