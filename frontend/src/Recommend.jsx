import React, { useEffect, useState } from "react";

function Recommendations({ userId }) {
  const [recs, setRecs] = useState([]);

  useEffect(() => {
  fetch(`http://127.0.0.1:8000/recommendations/${userId}?top_k=15`)
    .then((res) => res.json())
    .then((data) => {
      console.log("Fetched recommendations:", data);
      setRecs(data.recommendations);
    })
    .catch((err) => console.error(err));
}, [userId]);


  // Helper to parse tags string "{Ai, Tech, Community}" => ["Ai", "Tech", "Community"]
  const parseTags = (tagsString) => {
    if (!tagsString) return [];
    return tagsString
      .replace(/[{}]/g, "") // remove {}
      .split(",")
      .map((tag) => tag.trim());
  };

  return (
    <div>
      <h2>Recommended Events</h2>
      {recs.length === 0 && <p>No recommendations available.</p>}
      <ul>
        {recs.map((event, idx) => (
          <li key={idx} style={{ marginBottom: "2rem" }}>
            <h3>{event.title}</h3>
            <a href={event.url} target="_blank" rel="noopener noreferrer">
              <img
                src={event.image}
                alt={event.title}
                style={{ width: "200px", display: "block", marginBottom: "0.5rem" }}
              />
            </a>
            <p>
              <strong>Location:</strong> {event.location}
            </p>
            <p>
              <strong>Date:</strong> {event.start_date}
              {event.end_date ? ` - ${event.end_date}` : ""}
            </p>
            <p>
              <strong>Tags:</strong>{" "}
              {parseTags(event.tags).map((tag, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    backgroundColor: "#eee",
                    padding: "2px 8px",
                    margin: "0 5px 5px 0",
                    borderRadius: "5px",
                    fontSize: "0.8rem",
                  }}
                >
                  {tag}
                </span>
              ))}
            </p>
            <p>
              <strong>Price:</strong> {event.price}
            </p>
            <p>
              <strong>Similarity Score:</strong>{" "}
              {event.similarity_score.toFixed(3)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Recommendations;
