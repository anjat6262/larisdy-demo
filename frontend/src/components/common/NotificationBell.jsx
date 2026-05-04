import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { notificationService } from "../../services/notificationService";
import { formatOrderDate } from "../../utils/date";

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-none stroke-current"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function resolveNotificationPath(notification, isAdmin) {
  if (notification.reference_type === "product" && isAdmin) {
    return "/admin/products";
  }

  if (notification.reference_type === "order") {
    if (isAdmin) {
      return "/admin/orders";
    }

    if (["payment_pending", "payment_proof_uploaded", "payment_rejected"].includes(notification.type)) {
      return `/payment-status?order=${notification.reference_id}`;
    }

    return "/orders";
  }

  return isAdmin ? "/admin" : "/";
}

function NotificationBell({ variant = "customer" }) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const wrapperRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState("");
  const isAdminBell = variant === "admin";

  async function loadUnreadCount() {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      const count = await notificationService.unreadCount();
      setUnreadCount(count);
    } catch {
      setUnreadCount(0);
    }
  }

  async function loadNotifications() {
    if (!isAuthenticated) {
      return;
    }

    setIsFetching(true);
    setError("");

    try {
      const response = await notificationService.list();
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
    } catch (requestError) {
      setError(requestError.message ?? "Gagal memuat notifikasi.");
    } finally {
      setIsFetching(false);
    }
  }

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return undefined;
    }

    loadUnreadCount();

    function handleRefresh() {
      loadUnreadCount();
    }

    window.addEventListener("focus", handleRefresh);
    window.addEventListener("larisdy:notifications-refresh", handleRefresh);

    return () => {
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener("larisdy:notifications-refresh", handleRefresh);
    };
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  async function handleToggle() {
    const nextOpenState = !isOpen;
    setIsOpen(nextOpenState);

    if (nextOpenState) {
      await loadNotifications();
    }
  }

  async function handleNotificationClick(notification) {
    if (!notification.read_at) {
      try {
        await notificationService.markRead(notification.id);
        setUnreadCount((currentCount) => Math.max(0, currentCount - 1));
        setNotifications((currentNotifications) =>
          currentNotifications.map((currentNotification) =>
            currentNotification.id === notification.id
              ? { ...currentNotification, read_at: new Date().toISOString() }
              : currentNotification,
          ),
        );
      } catch {
        // Navigation still helps the user reach the related order/product.
      }
    }

    setIsOpen(false);
    navigate(resolveNotificationPath(notification, isAdmin));
  }

  async function handleMarkAllRead() {
    try {
      await notificationService.markAllRead();
      setUnreadCount(0);
      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          read_at: notification.read_at ?? new Date().toISOString(),
        })),
      );
    } catch (requestError) {
      setError(requestError.message ?? "Gagal menandai notifikasi.");
    }
  }

  const buttonClassName = isAdminBell
    ? "nav-icon-btn relative"
    : "relative grid h-11 w-11 place-items-center rounded-full border border-brand-border bg-white text-brand-black transition hover:border-brand-gold hover:bg-brand-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50";

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        className={buttonClassName}
        aria-label={isAdminBell ? "Notifikasi admin" : "Notifikasi customer"}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={handleToggle}
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[0.68rem] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.65rem)] z-50 w-[min(92vw,380px)] overflow-hidden rounded-xl border border-brand-border bg-white shadow-larisdy">
          <div className="flex items-center justify-between gap-3 border-b border-brand-border px-4 py-3">
            <div>
              <p className="text-sm font-bold text-brand-black">Notifikasi</p>
              <p className="text-xs text-brand-muted">{unreadCount} belum dibaca</p>
            </div>
            <button
              type="button"
              className="rounded-full px-3 py-1.5 text-xs font-bold text-brand-copper transition hover:bg-brand-cream"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              Tandai semua
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {isFetching ? (
              <div className="px-4 py-8 text-center text-sm text-brand-muted">Memuat notifikasi...</div>
            ) : error ? (
              <div className="grid gap-3 px-4 py-8 text-center text-sm text-red-700">
                <span>{error}</span>
                <button
                  type="button"
                  className="mx-auto rounded-full border border-red-200 px-3 py-1.5 font-bold transition hover:bg-red-50"
                  onClick={loadNotifications}
                >
                  Coba lagi
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-brand-muted">Belum ada notifikasi</div>
            ) : (
              <div className="divide-y divide-brand-border">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    className={`block w-full px-4 py-3 text-left transition hover:bg-brand-cream ${
                      notification.read_at ? "bg-white" : "bg-brand-cream/60"
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                          notification.read_at ? "bg-brand-border" : "bg-red-600"
                        }`}
                        aria-hidden="true"
                      />
                      <span className="grid gap-1">
                        <strong className="text-sm text-brand-black">{notification.title}</strong>
                        <span className="text-sm leading-6 text-brand-muted">{notification.message}</span>
                        <span className="text-xs font-semibold text-brand-copper">
                          {formatOrderDate(notification.created_at)}
                        </span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default NotificationBell;
