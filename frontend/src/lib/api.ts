import axios from "axios";
import { clearSession, getRefreshToken, saveSession } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export function setAuthToken(token?: string) {
  if (!token) {
    delete api.defaults.headers.common.Authorization;
    return;
  }
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as { _retry?: boolean } & typeof error.config;
    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearSession();
      return Promise.reject(error);
    }
    try {
      const refreshResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
        refreshToken,
      });
      const nextAccess = refreshResponse.data.accessToken as string;
      const nextRefresh = refreshResponse.data.refreshToken as string;
      saveSession(nextAccess, nextRefresh);
      setAuthToken(nextAccess);
      originalRequest.headers.Authorization = `Bearer ${nextAccess}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearSession();
      return Promise.reject(refreshError);
    }
  },
);
