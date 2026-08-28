import axios from 'axios';

// Use the Pinggy tunnel URL to bypass strict Wi-Fi firewalls
const API_BASE_URL = 'https://michs-2401-4900-60f2-4340-8122-135c-39df-2c13.free.pinggy.net/api'; 

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
