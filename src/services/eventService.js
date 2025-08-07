// services/eventService.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/events'; // adjust if needed

export const fetchEvents = async () => {
  const response = await axios.get(API_BASE_URL);
  return response.data;
};

export const createEvent = async (eventData) => {
  const response = await axios.post(API_BASE_URL, eventData);
  return response.data;
};

export const deleteEvent = async (eventId) => {
  const response = await axios.delete(`${API_BASE_URL}/${eventId}`);
  return response.data;
};
