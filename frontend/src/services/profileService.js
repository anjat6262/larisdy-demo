import { apiClient } from "./apiClient";

export const profileService = {
  async update(token, payload) {
    const response = await apiClient.put("/profile", payload, token);
    return response.user;
  },
};
