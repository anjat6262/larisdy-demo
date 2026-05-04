import { apiClient } from "./apiClient";
import { emitNotificationRefresh } from "./notificationService";

function normalizeProduct(product) {
  return {
    ...product,
    review_summary: product.review_summary ?? {
      count: 0,
      average_rating: null,
    },
    spicyLevel: product.spicy_level,
    status: product.status ?? "active",
  };
}

function appendIfPresent(formData, key, value) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  formData.append(key, value);
}

function buildProductFormData(payload, methodOverride = null) {
  const formData = new FormData();

  appendIfPresent(formData, "name", payload.name?.trim());
  appendIfPresent(formData, "description", payload.description?.trim());
  appendIfPresent(formData, "price", Number(payload.price));
  appendIfPresent(formData, "image", payload.image?.trim());
  appendIfPresent(formData, "category", payload.category?.trim());
  appendIfPresent(formData, "spicy_level", Number(payload.spicyLevel));
  appendIfPresent(formData, "weight", payload.weight?.trim());
  appendIfPresent(formData, "stock", Number(payload.stock));
  appendIfPresent(formData, "status", payload.status);

  if (payload.imageFile && typeof File !== "undefined" && payload.imageFile instanceof File) {
    formData.append("image_file", payload.imageFile);
  }

  if (methodOverride) {
    formData.append("_method", methodOverride);
  }

  return formData;
}

export const productService = {
  async list() {
    const response = await apiClient.get("/products");
    return {
      products: response.data.map(normalizeProduct),
      meta: response.meta,
    };
  },
  async listAdmin() {
    const response = await apiClient.get("/admin/products");
    return {
      products: response.data.map(normalizeProduct),
      meta: response.meta,
    };
  },
  async show(productId) {
    const response = await apiClient.get(`/products/${productId}`);
    return normalizeProduct(response.data);
  },
  async create(payload) {
    const response = await apiClient.post("/products", buildProductFormData(payload));
    emitNotificationRefresh();
    return normalizeProduct(response.data);
  },
  async update(productId, payload) {
    const response = await apiClient.post(
      `/products/${productId}`,
      buildProductFormData(payload, "PUT"),
    );
    emitNotificationRefresh();
    return normalizeProduct(response.data);
  },
  async destroy(productId) {
    const response = await apiClient.delete(`/products/${productId}`);
    emitNotificationRefresh();
    return response;
  },
};
