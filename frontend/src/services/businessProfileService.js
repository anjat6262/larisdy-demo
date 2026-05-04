import { apiClient } from "./apiClient";
import { mergeBrandProfile } from "../data/brandProfile";

export const businessProfileService = {
  async get() {
    const response = await apiClient.get("/business-profile");
    return mergeBrandProfile(response.data);
  },
};
