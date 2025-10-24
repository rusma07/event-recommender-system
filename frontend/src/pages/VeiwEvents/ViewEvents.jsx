import React, { useRef, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getEventById,
  getRecommendations,
  logInteraction,
} from "../../services/recommend_api";

export const ViewEvents = ({ userId }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [similarEvents, setSimilarEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const loggedEventsRef = useRef(new Set());

  const fetchEventAndRecommendations = async (id) => {
    setLoading(true);

    const eventData = await getEventById(id);
    setEvent(eventData);

    // Log view interaction once per event
    if (!loggedEventsRef.current.has(id)) {
      await logInteraction(userId, parseInt(id), "view");
      loggedEventsRef.current.add(id);
    }

    const recommendations = await getRecommendations(userId, 15);
    const filtered = recommendations.filter((e) => e.event_id !== parseInt(id));
    setSimilarEvents(filtered);
    setLoading(false);
  };

  useEffect(() => {
    fetchEventAndRecommendations(eventId);
  }, [eventId, userId]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-[80vh] text-gray-500 text-lg">
        Loading event details...
      </div>
    );

  if (!event)
    return (
      <div className="flex items-center justify-center h-[80vh] text-red-500 text-lg">
        Event not found.
      </div>
    );

  return (
    <div className="flex flex-col md:flex-row gap-8 p-8 bg-gray-100 min-h-[90vh]">
      {/* === Event Details === */}
      <div className="md:w-3/5 bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col">
        <div className="relative">
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-72 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
            <h2 className="text-3xl md:text-4xl font-bold text-white p-6">
              {event.title}
            </h2>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-4 text-gray-700">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
            <p className="text-sm">
              📅 {event.start_date} - {event.end_date || "TBD"}
            </p>
            <p className="text-sm">📍 {event.location}</p>
          </div>

          <p className="text-base leading-relaxed text-gray-600">
            {event.description || "No description available for this event."}
          </p>

          <div className="flex flex-wrap gap-2 mt-2">
            {event.tags.map((tag, index) => (
              <span
                key={index}
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-full text-xs font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>

          <p className="text-gray-800 font-semibold text-lg mt-2">
            🎟 Price: <span className="font-bold">{event.price}</span>
          </p>

          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={async () => {
              await logInteraction(userId, parseInt(eventId), "register");
            }}
            className="mt-4 inline-block text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:scale-[1.02] transition-transform duration-200"
          >
            Register Now
          </a>
        </div>
      </div>

      {/* === Similar Events Sidebar === */}
      <div className="md:w-2/5 bg-white rounded-2xl shadow-lg p-6 h-fit sticky top-8 self-start">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4 border-b pb-2">
          Similar Events
        </h3>

        {similarEvents.length === 0 ? (
          <p className="text-gray-500 text-sm">No similar events found.</p>
        ) : (
          <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-2">
            {similarEvents.map((e) => (
              <div
                key={e.event_id}
                onClick={() => fetchEventAndRecommendations(e.event_id)}
                className="flex gap-4 bg-gray-50 hover:bg-gray-100 rounded-lg p-3 cursor-pointer transition duration-200"
              >
                <img
                  src={e.image}
                  alt={e.title}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div className="flex flex-col justify-center flex-1">
                  <h4 className="font-semibold text-gray-800 text-sm md:text-base truncate">
                    {e.title}
                  </h4>
                  <p className="text-gray-500 text-xs">{e.start_date}</p>
                  <p className="text-gray-500 text-xs">{e.location}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
