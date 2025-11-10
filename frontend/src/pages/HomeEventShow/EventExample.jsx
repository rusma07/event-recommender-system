import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getRecommendations } from "../../services/recommend_api";

function Recommendations({ userId }) {
  const [events, setEvents] = useState([]);
  const scrollRef = useRef(null);
  const isPaused = useRef(false); // 🟢 Track if scrolling is paused
  const navigate = useNavigate();

  useEffect(() => {
    getRecommendations(userId).then(setEvents);
  }, [userId]);

  // Auto-scroll
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || events.length === 0) return;

    let animationFrameId;
    const scrollStep = 0.5;

    const autoScroll = () => {
      if (!isPaused.current) { // 🟢 Only scroll when not paused
        container.scrollLeft += scrollStep;
        if (container.scrollLeft >= container.scrollWidth / 2) {
          container.scrollLeft = 0;
        }
      }
      animationFrameId = requestAnimationFrame(autoScroll);
    };

    animationFrameId = requestAnimationFrame(autoScroll);

    return () => cancelAnimationFrame(animationFrameId);
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        Loading recommended events...
      </div>
    );
  }

  const displayEvents = [...events, ...events];

  const handleEventClick = (eventId) => {
    navigate("/event", { state: { selectedEventId: eventId } });
  };

  return (
    <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 min-h-[80vh]">
      <h2 className="text-3xl font-bold text-gray-400 mb-6 text-center">
        🎯 Upcoming and Ongoing Events
      </h2>

      <div ref={scrollRef} className="flex overflow-hidden gap-6 pb-4">
        {displayEvents.map((event, idx) => {
          return (
            <div
              key={idx}
              onMouseEnter={() => (isPaused.current = true)} // 🟢 Pause on hover
              onMouseLeave={() => (isPaused.current = false)} // 🟢 Resume on leave
              onClick={() => handleEventClick(event.event_id)}
              className="cursor-pointer flex-shrink-0 w-80 md:w-96 bg-slate-800/70 backdrop-blur-md shadow-lg rounded-2xl border border-slate-700 h-[440px] transition-transform duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <div className="relative h-56 overflow-hidden rounded-t-2xl">
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover" />
                <span className="absolute top-3 right-3 bg-sky-600 text-white text-xs px-3 py-1 rounded-full shadow">
                  {event.price && event.price !== "0"
                    ? `NPR ${event.price}`
                    : "Free"}
                </span>
              </div>

              <div className="p-5 flex flex-col justify-start gap-2 text-[1.2rem] leading-snug text-slate-100">
                <h3 className="text-lg font-semibold text-white truncate">
                  {event.title}
                </h3>
                <p className="text-sm text-slate-300">
                  📅 {formatDate(event.start_date)} – {formatDate(event.end_date) || "TBD"}
                </p>
                <p className="text-sm text-slate-300">📍 {event.location}</p>
                <p className="text-sm text-slate-300 line-clamp-2">
                  🏷️ {Array.isArray(event.tags) ? event.tags.join(", ") : event.tags}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default Recommendations;
