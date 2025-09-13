const API_BASE = "http://localhost:8000";

// Fetch recommendations
export const getRecommendations = async (userId, top_k = 15, exclude_event_id = null) => {
  if (!userId) return [];
  try {
    let url = `${API_BASE}/recommendations/${userId}?top_k=${top_k}`;
    if (exclude_event_id) url += `&exclude_event_id=${exclude_event_id}`;

    const res = await fetch(url);
    const data = await res.json();
    return data.recommendations || data; // Adjust depending on backend
  } catch (err) {
    console.error("API Error:", err);
    return [];
  }
};

// Log an interaction (view, register, tag_click)
export const logInteraction = async (userId, eventId = null, interactionType, meta = null) => {
  try {
    const res = await fetch(`${API_BASE}/api/interactions`, {
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

export const getEventById = async (eventId) => {
  try {
    const res = await fetch(`${API_BASE}/events/${eventId}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Fetch event error:", err);
    return null;
  }
};