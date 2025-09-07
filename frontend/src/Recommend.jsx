import React, { useEffect, useState } from "react";

function Recommendations({ userId }) {
  const [recs, setRecs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 6;

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/recommendations/${userId}?top_k=50`)
      .then((res) => res.json())
      .then((data) => {
        console.log("Fetched recommendations:", data);
        setRecs(data.recommendations);
        setCurrentPage(1);
      })
      .catch((err) => console.error(err));
  }, [userId]);

  const parseTags = (tagsString) => {
    if (!tagsString) return [];
    return tagsString.replace(/[{}]/g, "").split(",").map((tag) => tag.trim());
  };

  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = recs.slice(indexOfFirstEvent, indexOfLastEvent);
  const totalPages = Math.ceil(recs.length / eventsPerPage);

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div
      style={{
        width: "60%",
        margin: "40px auto",
        padding: "2rem 1rem",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "2rem" }}>
        Recommended Events for User {userId}
      </h2>

      {recs.length === 0 && <p style={{ textAlign: "center" }}>No recommendations available.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {currentEvents.map((event, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "1rem",
              border: "1px solid #ddd",
              borderRadius: "10px",
              padding: "1rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              backgroundColor: "#fff",
            }}
          >
            {/* Image container */}
            <div style={{ width: "260px", height: "260px", flexShrink: 0 }}>
    <a href={event.url} target="_blank" rel="noopener noreferrer">
      <img
        src={event.image}
        alt={event.title}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: "8px",
        }}
      />
    </a>
  </div>

            {/* Details container */}
            <div style={{ flex: "1", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.2rem" }}>{event.title}</h3>
                <p style={{ margin: "0 0 0.3rem 0" }}>
                  <strong>Location:</strong> {event.location}
                </p>
                <p style={{ margin: "0 0 0.3rem 0" }}>
                  <strong>Date:</strong> {event.start_date}
                  {event.end_date ? ` - ${event.end_date}` : ""}
                </p>
                <p style={{ margin: "0 0 0.5rem 0" }}>
                  <strong>Tags:</strong>{" "}
                  {parseTags(event.tags).map((tag, i) => (
                    <span
                      key={i}
                      style={{
                        display: "inline-block",
                        backgroundColor: "#e0f7fa",
                        color: "#00796b",
                        padding: "3px 10px",
                        margin: "0 5px 5px 0",
                        borderRadius: "15px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </p>
                <p style={{ margin: "0 0 0.3rem 0" }}>
                  <strong>Price:</strong> {event.price}
                </p>
              </div>
              <div style={{ marginTop: "1rem" }}>
    <a
      href={event.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        padding: "8px 16px",
        backgroundColor: "#007BFF",
        color: "#fff",
        textDecoration: "none",
        borderRadius: "5px",
        display: "inline-block",
        fontWeight: "bold",
        textAlign: "center",
      }}
    >
      View
    </a>
  </div>

            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {recs.length > eventsPerPage && (
        <div
          style={{
            marginTop: "2rem",
            display: "flex",
            justifyContent: "center",
            gap: "1rem",
          }}
        >
          <button
            onClick={handlePrev}
            disabled={currentPage === 1}
            style={{
              padding: "0.5rem 1rem",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              backgroundColor: currentPage === 1 ? "#ccc" : "#007BFF",
              border: "none",
              color: "#fff",
              borderRadius: "5px",
            }}
          >
            Prev
          </button>
          <span style={{ alignSelf: "center" }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNext}
            disabled={currentPage === totalPages}
            style={{
              padding: "0.5rem 1rem",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              backgroundColor: currentPage === totalPages ? "#ccc" : "#007BFF",
              border: "none",
              color: "#fff",
              borderRadius: "5px",
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default Recommendations;
