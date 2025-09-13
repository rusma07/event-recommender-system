import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getEventById, getRecommendations } from "../../services/recommend_api";
import { logInteraction } from "../../services/recommend_api";

export const ViewEvents = ({ userId }) => {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [similarEvents, setSimilarEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEventAndRecommendations = async () => {
      // Get event details
      const eventData = await getEventById(eventId);
      setEvent(eventData);

      // Log that user viewed this event
      await logInteraction(userId, parseInt(eventId), "view");

      // Get similar events
      const recommendations = await getRecommendations(userId, 10); // can filter for similarity
      const filtered = recommendations.filter(e => e.event_id !== parseInt(eventId));
      setSimilarEvents(filtered);

      setLoading(false);
    };
    fetchEventAndRecommendations();
  }, [eventId, userId]);

  if (loading) return <div>Loading event...</div>;
  if (!event) return <div>Event not found</div>;

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", gap: "20px" }}>
        <div style={{ flex: 2 }}>
          <h2>{event.title}</h2>
          <img src={event.image} alt={event.title} style={{ width: "100%", maxHeight: "400px", objectFit: "cover", borderRadius: "12px" }} />
          <p>{event.start_date} - {event.end_date || "TBD"}</p>
          <p>{event.location}</p>
          <p>Tags: {event.tags.join(", ")}</p>
          <p>Price: {event.price}</p>
          <a href={event.url} target="_blank" rel="noopener noreferrer">Visit Event Website</a>
        </div>

        {/* Right panel: Similar events */}
        <div style={{ flex: 1 }}>
          <h4>Similar Events</h4>
          {similarEvents.map((e, idx) => (
            <div key={idx} style={{ marginBottom: "10px", cursor: "pointer" }} onClick={() => navigate(`/event/${e.event_id}`)}>
              <p>{e.title}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
