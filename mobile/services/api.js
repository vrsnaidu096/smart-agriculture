import axios from 'axios';

// Use the Pinggy tunnel URL to bypass strict Wi-Fi firewalls
const API_BASE_URL = 'https://udipd-2401-4900-97ca-94f9-8c3d-b77b-dcb8-3c5e.free.pinggy.net/api'; 

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const analyzeCrop = async (payload) => {
  try {
    const response = await api.post('/analyze', payload);
    return response.data;
  } catch (error) {
    console.error('API Error during analysis:', error);
    throw error;
  }
};

export default api;
