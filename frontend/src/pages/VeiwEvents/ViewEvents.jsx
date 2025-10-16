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
  const loggedEventsRef = useRef(new Set()); // Track all logged event IDs

  const fetchEventAndRecommendations = async (id) => {
    setLoading(true);

    const eventData = await getEventById(id);
    setEvent(eventData);

    // Log view only if not logged yet
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
      <div className="text-center mt-10 text-gray-500">Loading event...</div>
    );
  if (!event)
    return (
      <div className="text-center mt-10 text-red-500">Event not found</div>
    );

  return (
    <div className="flex flex-col md:flex-row gap-6 p-6 h-[90vh]">
      {/* Main Event */}
      <div className="md:w-3/5 bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4 overflow-y-auto h-full">
        <div className="flex flex-col md:flex-row gap-4">
          <img
            src={event.image}
            alt={event.title}
            className="w-full md:w-1/2 h-56 md:h-64 object-cover rounded-lg shadow-sm"
          />
          <div className="flex flex-col justify-between md:w-1/2 gap-2">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              {event.title}
            </h2>
            <p className="text-gray-600 text-sm md:text-base">
              {event.start_date} - {event.end_date || "TBD"}
            </p>
            <p className="text-gray-600 text-sm md:text-base">
              {event.location}
            </p>
            <p className="text-gray-600 text-sm md:text-base">
              Tags: <span className="font-medium">{event.tags.join(", ")}</span>
            </p>
            <p className="text-gray-800 font-semibold text-sm md:text-base">
              Price: {event.price}
            </p>
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={async () => {
                await logInteraction(userId, parseInt(eventId), "register");
              }}
              className="mt-2 inline-block text-center bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-2 px-5 rounded-lg shadow-md hover:shadow-xl transition duration-300 text-sm md:text-base"
            >
              Register
            </a>
          </div>
        </div>
      </div>

      {/* Similar Events */}
      <div className="md:w-2/5 bg-gray-50 rounded-xl p-6 flex flex-col gap-4 overflow-y-auto h-full">
        <h3 className="text-2xl font-semibold text-gray-700 mb-4">
          Similar Events
        </h3>
        <div className="flex flex-col gap-3">
          {similarEvents.map((e) => (
            <div
              key={e.event_id}
              className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md cursor-pointer transition duration-200 flex gap-3"
              onClick={() => fetchEventAndRecommendations(e.event_id)}
            >
              <img
                src={e.image}
                alt={e.title}
                className="w-20 h-20 object-cover rounded-lg"
              />
              <div className="flex flex-col justify-between">
                <h4 className="font-semibold text-gray-800">{e.title}</h4>
                <p className="text-gray-500 text-sm">{e.start_date}</p>
                <p className="text-gray-600 text-sm">{e.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
