import axios from 'axios';

export const getRecommendations = async (userEventMatrix) => {
  const res = await axios.post('http://localhost:5001/recommend', {
    matrix: userEventMatrix,
  });
  return res.data;
};
