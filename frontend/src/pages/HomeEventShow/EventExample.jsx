// Example usage in React component
import React, { useEffect, useState } from "react";
import { getRecommendations } from "./services/api";

function Recommendations({ userId }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    getRecommendations(userId).then(setEvents);
  }, [userId]);

  return (
    <div>
      <h2>Recommended Events</h2>
      <ul>
        {events.map((event, idx) => (
          <li key={idx}>{event.title}</li>
        ))}
      </ul>
    </div>
  );
}
