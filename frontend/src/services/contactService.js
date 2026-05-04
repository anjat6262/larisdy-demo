import { apiClient } from "./apiClient";

export const contactService = {
  async create(payload) {
    const response = await apiClient.post("/contact", payload);
    return response.data;
  },
};
