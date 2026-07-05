import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("vs_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("vs_token");
      localStorage.removeItem("vs_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login/json", { email, password }),
  me: () => api.get("/auth/me"),
};

// ─── Complaints ──────────────────────────────────────────────────────────────
export const complaintsApi = {
  list: (params?: Record<string, unknown>) => api.get("/complaints", { params }),
  get: (ref: string) => api.get(`/complaints/${ref}`),
  getPublic: (ref: string) => api.get(`/complaints/public/${ref}`),
  update: (ref: string, data: Record<string, unknown>) => api.put(`/complaints/${ref}`, data),
  escalate: (ref: string) => api.post(`/complaints/${ref}/escalate`),
};

// ─── Analytics ───────────────────────────────────────────────────────────────
export const analyticsApi = {
  stats: () => api.get("/analytics/stats"),
  timeseries: (days = 30) => api.get("/analytics/timeseries", { params: { days } }),
  languageBreakdown: () => api.get("/analytics/language-breakdown"),
  resolutionTime: () => api.get("/analytics/resolution-time"),
  officerPerformance: () => api.get("/analytics/officer-performance"),
};

// ─── Admin ───────────────────────────────────────────────────────────────────
export const adminApi = {
  users: () => api.get("/admin/users"),
  createUser: (data: Record<string, unknown>) => api.post("/admin/users", data),
  updateUser: (id: string, data: Record<string, unknown>) => api.put(`/admin/users/${id}`, data),
  deactivateUser: (id: string) => api.delete(`/admin/users/${id}`),
  auditLogs: (params?: Record<string, unknown>) => api.get("/admin/audit-logs", { params }),
  systemHealth: () => api.get("/admin/system-health"),
};

// ─── Voice Simulation ─────────────────────────────────────────────────────────
export const voiceApi = {
  simulate: (data: { mobile: string; language: string; utterances: string[] }) =>
    api.post("/voice/simulate", data),
};
