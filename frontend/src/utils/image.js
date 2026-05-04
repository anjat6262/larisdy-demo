import { API_ORIGIN } from "../services/apiClient";

export function resolveImagePath(path) {
  if (!path) {
    return "/images/logo.jpeg";
  }

  if (/^(https?:\/\/|blob:|data:)/.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;

  if (
    normalizedPath.startsWith("uploads/") ||
    normalizedPath.startsWith("storage/")
  ) {
    return `${API_ORIGIN}/${normalizedPath}`;
  }

  return `/${normalizedPath}`;
}
