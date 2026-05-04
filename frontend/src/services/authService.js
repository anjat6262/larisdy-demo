import { apiClient } from "./apiClient";

export const authService = {
  async login(credentials) {
    return apiClient.post("/login", credentials);
  },
  async register(payload) {
    return apiClient.post("/register", payload);
  },
  async logout(token) {
    return apiClient.post("/logout", {}, token);
  },
  async getCurrentUser(token, signal) {
    const response = await apiClient.get("/user", token, signal);
    return response.data;
  },
};
