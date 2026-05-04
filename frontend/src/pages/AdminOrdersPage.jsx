import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import OrderCard from "../components/account/OrderCard";
import EmptyState from "../components/common/EmptyState";
import StatusCard from "../components/common/StatusCard";
import Button from "../components/ui/Button";
import { useToast } from "../contexts/ToastContext";
import { orderService } from "../services/orderService";
import { ADMIN_ORDER_ACTIONS, getOrderPaymentProof, getOrderStatusLabel } from "../utils/orderStatus";

function AdminOrdersPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [trackingInputs, setTrackingInputs] = useState({});
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") {
      return orders;
    }

    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  function applyAdminPayload(response) {
    setOrders(response.orders);
    setSummary(response.summary);
    setTrackingInputs(
      response.orders.reduce((result, order) => ({
        ...result,
        [order.id]: order.tracking_number ?? "",
      }), {}),
    );
  }

  async function loadOrders() {
    try {
      const response = await orderService.listAdmin();
      applyAdminPayload(response);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function bootstrapOrders() {
      try {
        const response = await orderService.listAdmin();
        if (isMounted) {
          applyAdminPayload(response);
        }
      } catch (error) {
        if (isMounted) {
          showToast(error.message, "error");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    bootstrapOrders();

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  function updateTrackingValue(orderId, value) {
    setTrackingInputs((currentInputs) => ({
      ...currentInputs,
      [orderId]: value,
    }));
  }

  function updateOrderState(updatedOrder) {
    setOrders((currentOrders) =>
      currentOrders.map((currentOrder) => (currentOrder.id === updatedOrder.id ? updatedOrder : currentOrder)),
    );
    setTrackingInputs((currentInputs) => ({
      ...currentInputs,
      [updatedOrder.id]: updatedOrder.tracking_number ?? "",
    }));
  }

  async function handleStatusUpdate(order, action) {
    setUpdatingOrderId(order.id);

    try {
      const payload = {
        status: action.targetStatus,
      };

      if (action.requireTrackingNumber) {
        payload.tracking_number = trackingInputs[order.id]?.trim();
      } else if (trackingInputs[order.id]?.trim()) {
        payload.tracking_number = trackingInputs[order.id]?.trim();
      }

      const updatedOrder = await orderService.updateAdmin(order.id, payload);
      updateOrderState(updatedOrder);
      showToast(`Status pesanan diubah ke ${getOrderStatusLabel(action.targetStatus)}.`);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function handlePaymentProofAction(order, action) {
    if (action === "reject") {
      const isConfirmed = window.confirm("Tolak bukti pembayaran ini dan kembalikan pesanan ke pending?");

      if (!isConfirmed) {
        return;
      }
    }

    setUpdatingOrderId(order.id);

    try {
      const updatedOrder = action === "verify"
        ? await orderService.verifyPaymentProof(order.id)
        : await orderService.rejectPaymentProof(order.id);

      updateOrderState(updatedOrder);
      showToast(action === "verify" ? "Bukti pembayaran berhasil diverifikasi." : "Bukti pembayaran ditolak.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  return (
    <section className="page-section">
      <div className="container">
        <div className="admin-page-header">
          <div>
            <h1 className="page-title admin-page-title">Dashboard Pesanan Admin</h1>
            <p className="page-subtitle admin-page-subtitle">
              Kelola bukti pembayaran, status pesanan, dan nomor resi.
            </p>
          </div>
          <div className="admin-page-actions">
            <Button type="button" variant="secondary" className="ui-ripple" onClick={() => navigate("/admin")}>
              Dashboard
            </Button>
            <Button type="button" variant="secondary" className="ui-ripple" onClick={() => navigate("/admin/products")}>
              Kelola Produk
            </Button>
            <Button
              type="button"
              className="ui-ripple"
              onClick={() => {
                setIsLoading(true);
                loadOrders();
              }}
            >
              Muat Ulang
            </Button>
          </div>
        </div>

        {isLoading ? (
          <StatusCard>
            <p>Memuat seluruh pesanan...</p>
          </StatusCard>
        ) : orders.length === 0 ? (
          <EmptyState
            title="Belum Ada Pesanan Masuk"
            description="Order customer akan muncul di halaman admin ini segera setelah checkout berhasil."
            actionLabel="Lihat Produk"
            onAction={() => navigate("/products")}
          />
        ) : (
          <div>
            <div className="admin-summary-grid dashboard-summary-grid order-summary-grid mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="admin-summary-card rounded-2xl border border-brand-border bg-brand-cream p-5 shadow-larisdy-sm">
                <span className="text-sm text-brand-muted">Total Pesanan</span>
                <strong className="block text-xl">{summary.total_orders ?? orders.length}</strong>
              </div>
              <div className="admin-summary-card rounded-2xl border border-brand-border bg-brand-cream p-5 shadow-larisdy-sm">
                <span className="text-sm text-brand-muted">Menunggu Bayar</span>
                <strong className="block text-xl">{summary.waiting_payment ?? 0}</strong>
              </div>
              <div className="admin-summary-card rounded-2xl border border-brand-border bg-brand-cream p-5 shadow-larisdy-sm">
                <span className="text-sm text-brand-muted">Sudah Dibayar</span>
                <strong className="block text-xl">{summary.paid_orders ?? 0}</strong>
              </div>
              <div className="admin-summary-card rounded-2xl border border-brand-border bg-brand-cream p-5 shadow-larisdy-sm">
                <span className="text-sm text-brand-muted">Dalam Pengiriman</span>
                <strong className="block text-xl">{summary.in_delivery ?? 0}</strong>
              </div>
            </div>

            <div className="admin-list-toolbar seller-order-toolbar mb-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-brand-border bg-white p-5 shadow-larisdy-sm">
              <div>
                <h2>Daftar Pesanan</h2>
                <p className="helper-text">Filter status dan proses pesanan.</p>
              </div>
              <div className="admin-search-box">
                <label htmlFor="adminOrderStatusFilter" className="admin-search-label">
                  Filter Status
                </label>
                <select
                  id="adminOrderStatusFilter"
                  className="tw-input"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">Semua status</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Sudah Dibayar</option>
                  <option value="processed">Diproses</option>
                  <option value="shipped">Dikirim</option>
                  <option value="completed">Selesai</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <StatusCard>
                <p>Tidak ada pesanan dengan status ini.</p>
              </StatusCard>
            ) : (
              <div className="admin-orders-list grid gap-4">
                {filteredOrders.map((order) => {
                  const paymentProof = getOrderPaymentProof(order);
                  const hasPendingPaymentProof = paymentProof?.verification_status === "pending";
                  const hasRejectedPaymentProof = paymentProof?.verification_status === "rejected";

                  return (
                    <OrderCard
                      key={order.id}
                      order={order}
                      showCustomer
                      variant="admin"
                      actions={
                        <>
                          <div className="admin-tracking-box grid min-w-[260px] gap-2">
                            <label
                              htmlFor={`tracking-${order.id}`}
                              className="text-sm font-semibold text-brand-muted"
                            >
                              Nomor Resi
                            </label>
                            <input
                              id={`tracking-${order.id}`}
                              type="text"
                              className="tw-input"
                              placeholder="Masukkan nomor resi"
                              value={trackingInputs[order.id] ?? ""}
                              onChange={(event) => updateTrackingValue(order.id, event.target.value)}
                            />
                          </div>

                          {hasPendingPaymentProof ? (
                            <>
                              <Button
                                type="button"
                                className="ui-ripple"
                                disabled={updatingOrderId === order.id}
                                onClick={() => handlePaymentProofAction(order, "verify")}
                              >
                                {updatingOrderId === order.id ? "Memverifikasi..." : "Verifikasi Bukti"}
                              </Button>
                              <Button
                                type="button"
                                variant="danger"
                                className="ui-ripple"
                                disabled={updatingOrderId === order.id}
                                onClick={() => handlePaymentProofAction(order, "reject")}
                              >
                                {updatingOrderId === order.id ? "Memproses..." : "Tolak Bukti"}
                              </Button>
                            </>
                          ) : null}

                          {ADMIN_ORDER_ACTIONS
                            .filter((action) =>
                              !(action.targetStatus === "paid" && (hasPendingPaymentProof || hasRejectedPaymentProof))
                            )
                            .map((action) => (
                              <Button
                                key={action.targetStatus}
                                type="button"
                                variant={order.status === action.activeFrom ? "primary" : "secondary"}
                                className="ui-ripple"
                                disabled={
                                  updatingOrderId === order.id ||
                                  order.status !== action.activeFrom ||
                                  (action.requireTrackingNumber && !(trackingInputs[order.id] ?? "").trim())
                                }
                                onClick={() => handleStatusUpdate(order, action)}
                              >
                                {updatingOrderId === order.id && order.status === action.activeFrom
                                  ? "Memproses..."
                                  : action.label}
                              </Button>
                            ))}
                        </>
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default AdminOrdersPage;
