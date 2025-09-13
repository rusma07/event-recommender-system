import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getRecommendations,
  logInteraction,
} from "../../services/recommend_api";

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
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      const recommendations = await getRecommendations(userId, 50);
      setEvents(recommendations);
      setLoading(false);
    };
    fetchEvents();
  }, [userId]);

  const handleViewEvent = async (event) => {
    await logInteraction(userId, event.event_id, "view");
    navigate(`/event/${event.event_id}`);
  };

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const filteredEvents = events.filter((e) => {
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase());
    const matchesTags =
      selectedTags.length === 0 ||
      e.tags.some((tag) => selectedTags.includes(tag));
    return matchesSearch && matchesTags;
  });

  if (loading)
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        Loading recommendations...
      </div>
    );

  return (
    <div
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <input
        type="text"
        placeholder="Search events..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: "10px",
          fontSize: "1rem",
          borderRadius: "6px",
          border: "1px solid #ccc",
        }}
      />

      <div style={{ display: "flex", gap: "20px" }}>
        {/* Left panel: Tags */}
        <div
          style={{
            flex: "0 0 200px",
            borderRight: "1px solid #ddd",
            paddingRight: "10px",
          }}
        >
          <h4>Filter by Tags</h4>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              maxHeight: "70vh",
              overflowY: "auto",
            }}
          >
            {TAGS.map((tag) => (
              <label
                key={tag}
                style={{ cursor: "pointer", fontSize: "0.9rem" }}
              >
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag)}
                  onChange={() => toggleTag(tag)}
                  style={{ marginRight: "6px" }}
                />
                {tag}
              </label>
            ))}
          </div>
        </div>

        {/* Right panel: Events */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px",
          }}
        >
          {filteredEvents.length === 0 && <div>No events found.</div>}
          {filteredEvents.map((e, idx) => (
            <div
              key={idx}
              style={{
                border: "1px solid #ddd",
                borderRadius: "12px",
                padding: "16px",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                transition: "transform 0.2s, box-shadow 0.2s",
                backgroundColor: "#fff",
              }}
            >
              <img
                src={e.image}
                alt={e.title}
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  marginBottom: "12px",
                  objectFit: "cover",
                  maxHeight: "180px",
                }}
              />
              <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>
                {e.title}
              </h3>
              <p style={{ margin: "4px 0", fontSize: "0.9rem", color: "#555" }}>
                {e.start_date} - {e.end_date || "TBD"}
              </p>
              <p style={{ margin: "4px 0", fontSize: "0.9rem", color: "#555" }}>
                {e.location}
              </p>
              <p
                style={{ margin: "4px 0", fontSize: "0.85rem", color: "#777" }}
              >
                Tags: {e.tags.join(", ")}
              </p>
              <p style={{ margin: "4px 0", fontWeight: "bold" }}>{e.price}</p>

              {/* View button */}
              <button
                onClick={() => handleViewEvent(e)}
                style={{
                  marginTop: "10px",
                  padding: "8px 14px",
                  backgroundColor: "#4f46e5",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                View Event
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
