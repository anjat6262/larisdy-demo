import { apiClient } from "./apiClient";

export function emitNotificationRefresh() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event("larisdy:notifications-refresh"));
}

export const notificationService = {
  async list(limit = 20) {
    const response = await apiClient.get(`/notifications?limit=${limit}`);
    return {
      notifications: response.data ?? [],
      unreadCount: response.meta?.unread_count ?? 0,
    };
  },
  async unreadCount() {
    const response = await apiClient.get("/notifications/unread-count");
    return response.data?.unread_count ?? 0;
  },
  async markRead(notificationId) {
    const response = await apiClient.post(`/notifications/${notificationId}/read`);
    emitNotificationRefresh();
    return response.data;
  },
  async markAllRead() {
    const response = await apiClient.post("/notifications/read-all");
    emitNotificationRefresh();
    return response.data;
  },
};
