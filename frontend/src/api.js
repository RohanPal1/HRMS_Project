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
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
  });

  const text = await res.text();

  if (!res.ok) {
    try {
      const errJson = JSON.parse(text);
      throw new Error(errJson.detail || "API Error");
    } catch {
      throw new Error(text || "API Error");
    }
  }

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export default api;
