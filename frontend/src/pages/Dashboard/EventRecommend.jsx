import React, { useRef, useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getRecommendations,
  searchEvents,
  logInteraction,
  getEventsByUserTags,
  getEventsByTags,
} from "../../services/recommend_api";
import EventCard from "../../components/EventCard";
import {
  setEvents,
  setLoading,
  setSearch,
  setSelectedTags,
  setCurrentPage,
} from "../../store/eventSlice";

const TAGS = [
  "Ai",
  "Art",
  "Badminton",
  "Blockchain",
  "Business",
  "Chess",
  "Community",
  "Cybersecurity",
  "Culture",
  "Data Analysis",
  "Devops",
  "Education",
  "Engineering",
  "Entertainment",
  "Environment",
  "Free",
  "Football",
  "Gaming",
  "Global",
  "Graphic Design",
  "Health",
  "Hybrid",
  "Local",
  "Literature",
  "Marketing",
  "Mobile Development",
  "Networking",
  "Online",
  "Physical",
  "Pitching",
  "Robotics",
  "Startup",
  "Sustainability",
  "Tech",
  "Web",
];

// --- helpers ---
// Make sure tags are always an array of trimmed strings
function parseTagsInput(value) {
  if (Array.isArray(value)) {
    return value
      .map((t) => (t == null ? "" : String(t).trim()))
      .filter(Boolean);
  }
  return String(value || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export const Dashboard = ({ userId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { events, loading, search, selectedTags, currentPage, eventsPerPage } =
    useSelector((state) => state.dashboard);

  const [searchParams, setSearchParams] = useSearchParams();
  const [localSearch, setLocalSearch] = useState(search || "");
  const loggedEventsRef = useRef(new Set());
  const queryParam = searchParams.get("query") || "";

  // =============================
  // 🔹 SINGLE useEffect: Fetch Events
  // =============================
  useEffect(() => {
    const fetchEvents = async () => {
      console.log("🔄 fetchEvents triggered", {
        queryParam,
        selectedTags,
        userId,
      });

      dispatch(setLoading(true));
      let data = [];

      try {
        if (queryParam.trim() !== "") {
          console.log("🔍 Using searchEvents with query:", queryParam);
          data = await searchEvents(userId, queryParam);
          dispatch(setSearch(queryParam));
        } else if (selectedTags.length > 0) {
          console.log(
            "🏷️ Using getEventsByTags with CURRENT tags:",
            selectedTags
          );

          const eventsByTags = await getEventsByTags(selectedTags);
          data = eventsByTags || [];
        } else {
          console.log("🎯 Using getRecommendations");
          data = await getRecommendations(userId, 50);
          dispatch(setSearch(""));
        }

        // Final normalization of tags for everything we store
        const finalDataRaw = Array.isArray(data) ? data : [];
        const finalData = finalDataRaw.map((event) => ({
          ...event,
          tags: parseTagsInput(event.tags),
        }));

        console.log("🚀 Dispatching events to Redux:", finalData.length);
        dispatch(setEvents(finalData));
      } catch (error) {
        console.error("❌ Error fetching events:", error);
        dispatch(setEvents([]));
      } finally {
        dispatch(setLoading(false));
      }
    };

    const delay = setTimeout(fetchEvents, 400);
    return () => clearTimeout(delay);
  }, [queryParam, userId, selectedTags, dispatch]);

  // =============================
  // 🔹 View Event Handler
  // =============================
  const handleViewEvent = async (event) => {
    if (!event?.event_id) return;

    console.log("👁️ Viewing event:", event.event_id, event.title);

    if (!loggedEventsRef.current.has(event.event_id)) {
      try {
        await logInteraction(userId, event.event_id, "view");
        loggedEventsRef.current.add(event.event_id);
      } catch (err) {
        console.error("❌ Failed to log view:", err);
      }
    }
    navigate(`/event/${event.event_id}`);
  };

  // =============================
  // 🔹 Tag Toggle (local filter)
  // =============================
  const toggleTag = async (tag) => {
    console.log("🏷️ Toggling tag:", tag);

    const isSelected = selectedTags.includes(tag);
    const newTags = isSelected
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];

    // ✅ Clear search when clicking a tag
    setLocalSearch("");
    dispatch(setSearch(""));
    setSearchParams({}); // remove ?query from URL

    dispatch(setSelectedTags(newTags));
    dispatch(setCurrentPage(1));

    if (!isSelected) {
      try {
        await logInteraction(userId, null, "tag_click", { tags: newTags });
        console.log("✅ Logged tag click with tags:", newTags);
      } catch (err) {
        console.error("❌ Failed to log tag click:", err);
      }
    }
  };

  // =============================
  // 🔹 Search Handler
  // =============================
  const handleSearchChange = (e) => {
    setLocalSearch(e.target.value);
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    const trimmed = localSearch.trim();

    if (trimmed === "") {
      dispatch(setSearch(""));
      dispatch(setEvents([]));
      setSearchParams({});
      return;
    }

    try {
      dispatch(setSearch(trimmed));
      dispatch(setSelectedTags([]));
      setSearchParams({ query: trimmed });

      const results = await searchEvents(userId, trimmed);
      console.log(`🔍 Found ${results.length} events for query: "${trimmed}"`);

      const normalizedResults = (results || []).map((event) => ({
        ...event,
        tags: parseTagsInput(event.tags),
      }));

      dispatch(setEvents(normalizedResults));
      setLocalSearch("");
    } catch (err) {
      console.error("❌ Error fetching search results:", err);
      dispatch(setEvents([]));
    }
  };

  const handleClearSearch = () => {
    setLocalSearch("");
    dispatch(setSearch(""));
    dispatch(setEvents([]));
    setSearchParams({});
  };

  // =============================
  // 🔹 Clear All Tags
  // =============================
  const clearAllTags = () => {
    console.log("🧹 Clearing all tags");
    dispatch(setSelectedTags([]));
    dispatch(setCurrentPage(1));
  };

  // =============================
  // 🔹 Pagination Logic
  // =============================
  const totalPages = Math.max(Math.ceil(events.length / eventsPerPage), 1);
  const indexOfLast = currentPage * eventsPerPage;
  const indexOfFirst = indexOfLast - eventsPerPage;
  const currentEvents = events.slice(indexOfFirst, indexOfLast);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          </div>
          <p className="mt-4 text-lg font-semibold text-gray-700">
            Discovering amazing events...
          </p>
          <p className="text-gray-500 mt-2">Just a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-8">
          {/* Hero Search Section */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Discover Events
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Find your next unforgettable experience. From tech conferences to
              creative workshops.
            </p>
          </div>

          {/* Enhanced Search Bar */}
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSearchSubmit} className="relative group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center px-4">
                    {/* Search Icon */}
                    <div className="flex-shrink-0 text-gray-400 group-hover:text-indigo-500 transition-colors duration-300">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1110.5 3a7.5 7.5 0 016.15 13.65z"
                        />
                      </svg>
                    </div>

                    {/* Search Input */}
                    <input
                      type="text"
                      value={localSearch}
                      onChange={handleSearchChange}
                      placeholder="Search events, conferences, workshops..."
                      className="w-full px-4 py-5 text-lg bg-transparent border-0 focus:ring-0 placeholder-gray-400 text-gray-700 focus:outline-none"
                    />

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {localSearch && (
                        <button
                          type="button"
                          onClick={handleClearSearch}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
                        >
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={!localSearch.trim()}
                        className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:scale-100 shadow-lg hover:shadow-xl"
                      >
                        Search
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-10">
        <div className="flex gap-8">
          {/* Enhanced Tags Sidebar */}
          <div className="flex-shrink-0 w-80">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/60 p-6 sticky top-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Filters</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Find by interests
                  </p>
                </div>
                {selectedTags.length > 0 && (
                  <button
                    onClick={clearAllTags}
                    className="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors duration-200"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Tags Grid */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 transform hover:scale-[1.02] ${
                      selectedTags.includes(tag)
                        ? "bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 text-indigo-700 shadow-md"
                        : "bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:shadow-lg"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{tag}</span>
                      {selectedTags.includes(tag) && (
                        <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <p className="text-sm font-semibold text-blue-900">
                      Active Filters ({selectedTags.length})
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-sm bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full font-medium border border-blue-200"
                      >
                        {tag}
                        <button
                          onClick={() => toggleTag(tag)}
                          className="ml-1 text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Events Content */}
          <div className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/60 p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {queryParam
                      ? `Results for "${queryParam}"`
                      : selectedTags.length > 0
                      ? "Filtered Events"
                      : "Recommended for You"}
                  </h2>
                  <p className="text-gray-600 mt-2 flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        events.length > 0 ? "bg-green-500" : "bg-gray-400"
                      }`}
                    ></span>
                    {events.length > 0
                      ? `Found ${events.length} events • Showing ${currentEvents.length} on this page`
                      : "No events match your criteria"}
                  </p>
                </div>

                {events.length > 0 && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text">
                      {currentPage}
                    </div>
                    <div className="text-sm text-gray-500">
                      of {totalPages} pages
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Events Grid */}
            <div className="space-y-4">
              {currentEvents.length === 0 && !loading && (
                <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/60">
                  <div className="max-w-md mx-auto">
                    <div className="w-24 h-24 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg
                        className="w-10 h-10 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 9a1 1 0 11-2 0 1 1 0 012 0zm3 0a1 1 0 11-2 0 1 1 0 012 0zm3 0a1 1 0 11-2 0 1 1 0 012 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {queryParam
                        ? `No results for "${queryParam}"`
                        : selectedTags.length > 0
                        ? "No events with selected filters"
                        : "No events available"}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {queryParam
                        ? "Try adjusting your search terms or explore different categories"
                        : selectedTags.length > 0
                        ? "Try selecting different tags or clear filters to see more events"
                        : "Check back later for new events or try searching for something specific"}
                    </p>
                    <button
                      onClick={clearAllTags}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      Explore All Events
                    </button>
                  </div>
                </div>
              )}

              {/* Events List */}
              {currentEvents.map((event) => (
                <div
                  key={event.event_id}
                  className="transform hover:scale-[1.01] transition-transform duration-200"
                >
                  <EventCard
                    event={event}
                    onView={() => handleViewEvent(event)}
                  />
                </div>
              ))}
            </div>

            {/* Enhanced Pagination */}
            {events.length > 0 && totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/60 px-8 py-4">
                  <div className="flex items-center gap-6">
                    <button
                      onClick={() =>
                        dispatch(setCurrentPage(Math.max(currentPage - 1, 1)))
                      }
                      disabled={currentPage === 1}
                      className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                        currentPage === 1
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 hover:from-indigo-100 hover:to-purple-100 hover:shadow-lg border border-indigo-100"
                      }`}
                    >
                      <svg
                        className="w-4 h-4"
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
                      Previous
                    </button>

                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-600">
                        Page
                      </span>
                      <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        {currentPage}
                      </span>
                      <span className="text-gray-400">of</span>
                      <span className="text-lg font-bold text-gray-900">
                        {totalPages}
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        dispatch(
                          setCurrentPage(Math.min(currentPage + 1, totalPages))
                        )
                      }
                      disabled={currentPage === totalPages}
                      className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                        currentPage === totalPages
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 hover:from-indigo-100 hover:to-purple-100 hover:shadow-lg border border-indigo-100"
                      }`}
                    >
                      Next
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
