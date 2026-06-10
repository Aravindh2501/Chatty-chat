import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_URL || "",
  timeout: 15000,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem("user-storage");
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (_) {}
  return config;
});

export default apiClient;
