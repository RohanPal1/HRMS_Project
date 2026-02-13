import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

// Axios instance
const api = axios.create({
  baseURL: API_BASE,
});

// Automatically attach token to axios requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Fetch helper (returns JSON safely)
export const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem("token");

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  // Read raw response safely
  const text = await res.text();

  // If error
  if (!res.ok) {
    try {
      const errJson = JSON.parse(text);
      throw new Error(errJson.detail || "API Error");
    } catch {
      throw new Error(text || "API Error");
    }
  }

  // If success but empty response
  if (!text) return null;

  // Parse JSON safely
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export default api;
