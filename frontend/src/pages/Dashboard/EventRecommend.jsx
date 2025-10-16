import React, { useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getRecommendations,
  searchEvents,
  logInteraction,
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
  "AI",
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

export const Dashboard = ({ userId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { events, loading, search, selectedTags, currentPage, eventsPerPage } =
    useSelector((state) => state.dashboard);
  const [searchParams, setSearchParams] = useSearchParams();
  const loggedEventsRef = useRef(new Set());
  const queryParam = searchParams.get("query") || "";

  // =============================
  // 🔹 Fetch Recommendations or Search Results
  // =============================
  useEffect(() => {
    const fetchEvents = async () => {
      dispatch(setLoading(true));

      let data = [];

      if (queryParam.trim() !== "") {
        // When query present in URL -> use it for backend search
        data = await searchEvents(queryParam);
        dispatch(setSearch(queryParam));
      } else {
        // Default recommendations
        data = await getRecommendations(userId, 50);
        dispatch(setSearch(""));
      }

      dispatch(setEvents(data));
      dispatch(setLoading(false));
    };

    const delay = setTimeout(fetchEvents, 400);
    return () => clearTimeout(delay);
  }, [queryParam, userId, dispatch]);

  // =============================
  // 🔹 View Event Handler
  // =============================
  const handleViewEvent = async (event) => {
    if (!loggedEventsRef.current.has(event.event_id)) {
      await logInteraction(userId, event.event_id, "view");
      loggedEventsRef.current.add(event.event_id);
    }
    navigate(`/event/${event.event_id}`);
  };

  // =============================
  // 🔹 Tag Toggle (local filter)
  // =============================
  const toggleTag = (tag) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    dispatch(setSelectedTags(newTags));
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
      <div className="text-center py-10 text-gray-500">Loading events...</div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-indigo-100 flex flex-col gap-6 min-h-screen pb-10">
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => {
          const newQuery = e.target.value;
          dispatch(setSearch(newQuery));
          if (newQuery) {
            setSearchParams({ query: newQuery });
          } else {
            setSearchParams({});
          }
        }}
        placeholder="Search events..."
        className="p-3 text-base rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <div className="flex gap-6 flex-1">
        {/* Tags Filter */}
        <div className="flex-shrink-0 w-52 border-r border-gray-200 pr-2 max-h-[85vh] overflow-y-auto hide-scrollbar">
          <h4 className="font-semibold mb-2">Filter by Tags</h4>
          <div className="flex flex-col gap-1">
            {TAGS.map((tag) => (
              <label
                key={tag}
                className="text-sm cursor-pointer flex items-center"
              >
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag)}
                  onChange={() => toggleTag(tag)}
                  className="mr-1"
                />
                {tag}
              </label>
            ))}
          </div>
        </div>

        {/* Events List */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto max-h-[85vh] pr-2 hide-scrollbar">
          {currentEvents.length === 0 && (
            <div className="text-center text-gray-500">No events found.</div>
          )}
          {currentEvents.map((event) => (
            <EventCard
              key={event.event_id}
              event={event}
              onView={handleViewEvent}
            />
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-4 mt-4 items-center font-bold text-base">
        <button
          onClick={() => dispatch(setCurrentPage(Math.max(currentPage - 1, 1)))}
          disabled={currentPage === 1}
          className={`px-3 py-1 rounded border border-indigo-600 font-bold ${
            currentPage === 1
              ? "bg-indigo-400 cursor-not-allowed text-white"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          }`}
        >
          «
        </button>
        <span>
          Page {events.length === 0 ? 0 : currentPage} of{" "}
          {events.length === 0 ? 0 : totalPages}
        </span>

        <button
          onClick={() =>
            dispatch(setCurrentPage(Math.min(currentPage + 1, totalPages)))
          }
          disabled={currentPage === totalPages}
          className={`px-3 py-1 rounded border border-indigo-600 font-bold ${
            currentPage === totalPages
              ? "bg-indigo-400 cursor-not-allowed text-white"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          }`}
        >
          »
        </button>
      </div>
    </div>
  );
};
