import axios from "axios";
import { CONFIG } from "../config";

const ROTAS_DE_LOGIN = ["/auth/login", "/auth/register"];

let dependencias = { tokenStore: null, aoExpirarSessao: () => {} };

export function configurarHttp({ tokenStore, aoExpirarSessao }) {
  dependencias = { tokenStore, aoExpirarSessao };
}

export const http = axios.create({ baseURL: CONFIG.apiBaseUrl });

http.interceptors.request.use((config) => {
  const token = dependencias.tokenStore?.get();
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

    const ehLogin = ROTAS_DE_LOGIN.includes(error.config?.url);
    if (status === 401 && !ehLogin && dependencias.tokenStore?.get()) {
      dependencias.aoExpirarSessao();
    }

    const message = data?.details?.[0]?.message || data?.error || "";
    return Promise.reject(new ApiError(status, message, data?.details));
  }
);
