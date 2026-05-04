import { getStoredToken } from "../utils/authStorage";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api";
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE_URL = (configuredApiBaseUrl || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
export const API_ORIGIN = new URL(API_BASE_URL).origin;

function buildHeaders(token, body) {
  const authToken = token ?? getStoredToken();
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  return {
    Accept: "application/json",
    ...(!isFormData && body ? { "Content-Type": "application/json" } : {}),
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };
}

function extractErrorMessage(payload) {
  const validationErrors = payload?.errors
    ? Object.values(payload.errors).flat()
    : [];

  return (
    validationErrors.find(Boolean) ??
    payload?.message ??
    "Terjadi kesalahan saat memuat data."
  );
}

async function request(endpoint, options = {}) {
  const { method = "GET", body, token, signal } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: buildHeaders(token, body),
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }

    throw new Error(
      "Tidak dapat terhubung ke layanan Larisdy. Coba muat ulang halaman beberapa saat lagi.",
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const error = new Error(extractErrorMessage(payload));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export const apiClient = {
  get(endpoint, token, signal) {
    return request(endpoint, { method: "GET", token, signal });
  },
  post(endpoint, body, token, signal) {
    return request(endpoint, { method: "POST", body, token, signal });
  },
  patch(endpoint, body, token, signal) {
    return request(endpoint, { method: "PATCH", body, token, signal });
  },
  put(endpoint, body, token, signal) {
    return request(endpoint, { method: "PUT", body, token, signal });
  },
  delete(endpoint, token, signal) {
    return request(endpoint, { method: "DELETE", token, signal });
  },
};
