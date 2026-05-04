import { apiClient } from "./apiClient";
import { emitNotificationRefresh } from "./notificationService";

export const orderService = {
  async checkout(payload) {
    const response = await apiClient.post("/checkout", payload);
    emitNotificationRefresh();
    return response.data;
  },
  async list() {
    const response = await apiClient.get("/orders");
    return response.data;
  },
  async show(orderId) {
    const response = await apiClient.get(`/orders/${orderId}`);
    return response.data;
  },
  async updateStatus(orderId, status) {
    const response = await apiClient.patch(`/orders/${orderId}/status`, { status });
    return response.data;
  },
  async complete(orderId) {
    const response = await apiClient.post(`/orders/${orderId}/complete`);
    emitNotificationRefresh();
    return response.data;
  },
  async uploadPaymentProof(orderId, formData) {
    const response = await apiClient.post(`/orders/${orderId}/payment-proof`, formData);
    emitNotificationRefresh();
    return response.data;
  },
  async listAdmin() {
    const response = await apiClient.get("/admin/orders");
    return {
      orders: response.data,
      summary: response.meta?.summary ?? {},
    };
  },
  async updateAdmin(orderId, payload) {
    const response = await apiClient.put(`/admin/orders/${orderId}`, payload);
    emitNotificationRefresh();
    return response.data;
  },
  async verifyPaymentProof(orderId) {
    const response = await apiClient.post(`/admin/orders/${orderId}/payment-proof/verify`);
    emitNotificationRefresh();
    return response.data;
  },
  async rejectPaymentProof(orderId, payload = {}) {
    const response = await apiClient.post(`/admin/orders/${orderId}/payment-proof/reject`, payload);
    emitNotificationRefresh();
    return response.data;
  },
};
