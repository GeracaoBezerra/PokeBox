import axios from "axios";
import { CONFIG } from "../config";
import { LocalTokenStore } from "../auth/localTokenStore";
import { LocalUserStore } from "../auth/localUserStore";

const tokenStore = new LocalTokenStore();
const userStore = new LocalUserStore();

export const http = axios.create({ baseURL: CONFIG.apiBaseUrl });

http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (!error.response) {
      return Promise.reject(new ApiError(0, "Não foi possível conectar ao servidor."));
    }

    const { status, data } = error.response;

    if (status === 401 && tokenStore.get()) {
      tokenStore.clear();
      userStore.clear();
      window.location.assign("/login");
    }

    const message = data?.details?.[0]?.message || data?.error || "Erro inesperado.";
    return Promise.reject(new ApiError(status, message, data?.details));
  }
);
