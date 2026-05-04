import { apiClient } from "./apiClient";

function buildQueryString(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

export const reportService = {
  async salesSummary(filters) {
    return apiClient.get(`/admin/reports/sales-summary${buildQueryString(filters)}`);
  },
};
