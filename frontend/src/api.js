import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

// Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Automatically attach token to axios requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Fetch helper (returns JSON safely)
export const authFetch = async (path, options = {}) => {
  try {
    const response = await api({
      url: path,
      method: options.method || "GET",
      data: options.body ? JSON.parse(options.body) : undefined,
      headers: options.headers || {},
    });

    return response.data;
  } catch (error) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error("API Error");
  }
};

export default api;
