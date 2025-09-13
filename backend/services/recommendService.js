// backend/services/recommendService.js
import axios from "axios";

export const getRecommendations = async (userId, topK = 15) => {
  try {
    const response = await axios.get(`http://localhost:8000/recommendations/${userId}`, {
      params: { top_k: topK } // sends ?top_k=15
    });
    return response.data.recommendations;
  } catch (error) {
    console.error("Python API error:", error.message);
    throw new Error("Failed to fetch recommendations");
  }
};
