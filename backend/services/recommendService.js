// backend/services/recommendService.js
import axios from "axios";

export const getRecommendations = async (userId, topK = 15) => {
  try {
    const response = await axios.post("http://localhost:8000/recommend", {
      user_id: userId,
      top_k: topK
    });
    return response.data.recommendations;
  } catch (error) {
    console.error("Python API error:", error.message);
    throw new Error("Failed to fetch recommendations");
  }
};
