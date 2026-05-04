import { apiClient } from "./apiClient";

function buildTestimonialFormData(payload) {
  const formData = new FormData();

  formData.append("product_id", String(payload.productId ?? payload.product_id ?? ""));
  formData.append("order_id", String(payload.orderId ?? payload.order_id ?? ""));
  formData.append("message", payload.message?.trim() ?? "");
  formData.append("rating", String(payload.rating ?? 5));

  if (payload.city?.trim()) {
    formData.append("city", payload.city.trim());
  }

  if (payload.imageFile && typeof File !== "undefined" && payload.imageFile instanceof File) {
    formData.append("image", payload.imageFile);
  }

  return formData;
}

export const testimonialService = {
  async list(params = {}) {
    const searchParams = new URLSearchParams();

    if (params.productId) {
      searchParams.set("product_id", String(params.productId));
    }

    const query = searchParams.toString();
    const response = await apiClient.get(`/testimonials${query ? `?${query}` : ""}`);
    return response.data;
  },
  async getEligibility(productId) {
    const response = await apiClient.get(`/testimonials/eligibility?product_id=${productId}`);
    return response.data;
  },
  async create(payload) {
    const response = await apiClient.post("/testimonials", buildTestimonialFormData(payload));
    return response.data;
  },
};
