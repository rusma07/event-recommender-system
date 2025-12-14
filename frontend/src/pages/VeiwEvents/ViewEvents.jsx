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
  const [imageError, setImageError] = useState(false);
  const loggedEventsRef = useRef(new Set());

  // === Helper: Format date like "Wed, Sep 23 2025" ===
  const formatDate = (dateString) => {
    if (!dateString) return "TBD";
    const options = {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchEventAndRecommendations = async (id) => {
    setLoading(true);
    setImageError(false);

    try {
      const eventData = await getEventById(id);
      setEvent(eventData);

      // Log view once per event
      if (!loggedEventsRef.current.has(id)) {
        await logInteraction(userId, parseInt(id), "view");
        loggedEventsRef.current.add(id);
      }

      const recommendations = await getRecommendations(userId, 15);
      const filtered = recommendations.filter(
        (e) => e.event_id !== parseInt(id)
      );
      setSimilarEvents(filtered);
    } catch (error) {
      console.error("Error fetching event:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventAndRecommendations(eventId);
  }, [eventId, userId]);

  if (loading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          </div>
          <p className="mt-4 text-lg font-semibold text-gray-700">
            Loading event details...
          </p>
          <p className="text-gray-500 mt-2">Getting everything ready for you</p>
        </div>
      </div>
    );

  if (!event)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-red-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Event Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The event you're looking for doesn't exist or may have been removed.
          </p>
          <button
            onClick={() => navigate("/event")} 
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Back to Events
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* === Main Event Content === */}
          <div className="lg:w-2/3">
            {/* Back Button - FIXED NAVIGATION */}
            <button
              onClick={() => navigate("/event")} 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors duration-200 group"
            >
              <svg
                className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Events
            </button>

            {/* Event Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
              {/* Hero Image */}
              <div className="relative h-80 sm:h-96">
                {imageError ? (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <div className="text-center text-white">
                      <svg
                        className="w-16 h-16 mx-auto mb-4 opacity-80"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                        />
                      </svg>
                      <p className="text-xl font-semibold">Event Image</p>
                    </div>
                  </div>
                ) : (
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end">
                  <div className="p-8 w-full">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
                      {event.title}
                    </h1>

                    {/* Quick Info Bar */}
                    <div className="flex flex-wrap items-center gap-6 text-white/90">
                      <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-2xl">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                          />
                        </svg>
                        <span className="font-semibold">
                          {formatDate(event.start_date)}
                          {event.end_date && event.end_date !== event.start_date
                            ? ` – ${formatDate(event.end_date)}`
                            : ""}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-2xl">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                          />
                        </svg>
                        <span className="font-semibold">{event.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div className="p-8">
                {/* Tags */}
                <div className="flex flex-wrap gap-3 mb-6">
                  {event.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-2xl text-sm font-semibold shadow-lg hover:shadow-xl transition-shadow duration-200 transform hover:scale-105 cursor-default"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Description Section */}
                {event.description && (
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-indigo-600"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                        />
                      </svg>
                      About This Event
                    </h3>
                    <p className="text-gray-700 leading-relaxed text-lg">
                      {event.description}
                    </p>
                  </div>
                )}

                {/* Price & Registration */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Price</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        {event.price}
                      </p>
                    </div>

                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={async () => {
                        await logInteraction(
                          userId,
                          parseInt(eventId),
                          "register"
                        );
                      }}
                      className="group relative inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                      <span className="relative flex items-center gap-2">
                        Register Now
                        <svg
                          className="w-5 h-5 transform group-hover:translate-x-1 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                          />
                        </svg>
                      </span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* === Similar Events Sidebar === */}
          <div className="lg:w-1/3">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/60 p-6 sticky top-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Similar Events
                </h3>
              </div>

              {similarEvents.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">
                    No similar events found
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Check back later for new events
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
                  {similarEvents.map((e) => (
                    <div
                      key={e.event_id}
                      onClick={() => {
                        navigate(`/event/${e.event_id}`);
                        window.scrollTo(0, 0);
                      }}
                      className="group bg-gray-50 hover:bg-white rounded-2xl p-4 cursor-pointer transition-all duration-300 border border-gray-100 hover:border-indigo-200 hover:shadow-lg transform hover:scale-[1.02]"
                    >
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                          <img
                            src={e.image}
                            alt={e.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 group-hover:text-indigo-700 transition-colors">
                            {e.title}
                          </h4>

                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                            <svg
                              className="w-3 h-3 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                              />
                            </svg>
                            <span>{formatDate(e.start_date)}</span>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                            <svg
                              className="w-3 h-3 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                              />
                            </svg>
                            <span className="truncate">{e.location}</span>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex flex-wrap gap-1">
                              {e.tags?.slice(0, 2).map((tag, index) => (
                                <span
                                  key={index}
                                  className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 py-0.5 rounded-full text-xs font-medium"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                              {e.price}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};