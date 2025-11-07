// services/recommend_api.js

// ✅ Load from environment
const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const BACKEND_URL = import.meta.env.VITE_API_BACKEND_URL;

// =============================
// 🔹 Fetch Recommendations
// =============================
export const getRecommendations = async (userId, top_k = 15, exclude_event_id = null) => {
  if (!userId) return [];
  try {
    let url = `${BASE_URL}/recommendations/${userId}?top_k=${top_k}`;
    if (exclude_event_id) url += `&exclude_event_id=${exclude_event_id}`;

    const res = await fetch(url);
    const data = await res.json();
    return data.recommendations || data;
  } catch (err) {
    console.error("API Error:", err);
    return [];
  }
};

// =============================
// 🔹 Log Interaction (view, register, tag_click)
// =============================
export const logInteraction = async (userId, eventId = null, interactionType, meta = null) => {
  try {
    const res = await fetch(`${BACKEND_URL}/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, event_id: eventId, interaction_type: interactionType, meta }),
    });
    return await res.json();
  } catch (err) {
    console.error("Interaction logging error:", err);
    return null;
  }
};

// =============================
// 🔹 Get Event by ID
// =============================
export const getEventById = async (eventId) => {
  try {
    const res = await fetch(`${BASE_URL}/${eventId}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Fetch event error:", err);
    return null;
  }
};

// =============================
// 🔹 Search Events (Hybrid Search via FastAPI)
// =============================
export const searchEvents = async (userId, query, size = 50) => {
  if (!query?.trim()) return [];
  try {
    const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}&size=${size}`;
    const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
    if (!res.ok) throw new Error("Hybrid search failed");

    const data = await res.json();
    if (userId) {
      await logInteraction(userId, null, "search", { query });
    }

    // backend returns array of events with scores
    return Array.isArray(data) ? data : data.events || [];
  } catch (err) {
    console.error("Hybrid search error:", err);
    return [];
  }
};

// =============================
// 🔹 Get Events by User Tags
// =============================
export const getEventsByUserTags = async (userId) => {
  if (!userId) return [];
  try {
    const res = await fetch(`${BACKEND_URL}/events/${userId}/tags`);
    const data = await res.json();
    return data.events || [];
  } catch (err) {
    console.error("Error fetching events by user tags:", err);
    return [];
  }
};
