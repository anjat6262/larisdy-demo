import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import EmptyState from "../components/common/EmptyState";
import OrderTrackingTimeline from "../components/orders/OrderTrackingTimeline";
import Button from "../components/ui/Button";
import { useToast } from "../contexts/ToastContext";
import { orderService } from "../services/orderService";
import { formatCurrency } from "../utils/currency";
import { formatOrderDate } from "../utils/date";
import { resolveImagePath } from "../utils/image";
import { getGoogleMapsEmbedUrl, getGoogleMapsUrl, hasShippingCoordinates } from "../utils/maps";
import {
  getOrderStatusClassName,
  getOrderStatusLabel,
  getPaymentVerificationStatus,
  getPaymentVerificationStatusClassName,
  getPaymentVerificationStatusLabel,
} from "../utils/orderStatus";
import { getShippingCourierLabel } from "../utils/shipping";

function formatMaybeDate(dateTime) {
  return dateTime ? formatOrderDate(dateTime) : "-";
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-brand-border/70 py-3 last:border-b-0">
      <span className="text-brand-muted">{label}</span>
      <strong className="max-w-[280px] text-right text-brand-black">{value}</strong>
    </div>
  );
}

function isItemReviewable(order, item) {
  return (order.reviewable_items ?? []).some(
    (reviewableItem) => Number(reviewableItem.product_id) === Number(item.product_id),
  );
}

function CustomerOrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const timeline = useMemo(() => order?.tracking_timeline ?? [], [order]);
  const paymentVerificationStatus = getPaymentVerificationStatus(order);

  async function loadOrder({ quiet = false } = {}) {
    if (!quiet) {
      setIsLoading(true);
    }

    try {
      const response = await orderService.show(orderId);
      setOrder(response);
      setLoadError("");
    } catch (error) {
      setOrder(null);
      setLoadError(error.message ?? "Detail pesanan belum bisa dimuat.");
      if (quiet) {
        showToast(error.message ?? "Detail pesanan belum bisa dimuat.", "error");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  async function refreshOrder() {
    setIsRefreshing(true);

    try {
      await loadOrder({ quiet: true });
      showToast("Detail pesanan diperbarui.");
    } finally {
      setIsRefreshing(false);
    }
  }

  if (isLoading) {
    return (
      <section className="page-section">
        <div className="container">
          <div className="mx-auto my-8 max-w-[760px] rounded-xl border border-brand-border bg-white p-8 text-center shadow-larisdy-sm">
            <p>Memuat detail pesanan...</p>
          </div>
        </div>
      </section>
    );
  }

  if (!order) {
    return (
      <section className="page-section">
        <div className="container">
          <EmptyState
            title="Pesanan Tidak Ditemukan"
            description={loadError || "Pesanan sudah tidak tersedia atau bukan milik akun Anda."}
            actionLabel="Kembali ke Pesanan Saya"
            onAction={() => navigate("/orders")}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="container">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="secondary" className="ui-ripple" onClick={() => navigate("/orders")}>
            Kembali ke Pesanan Saya
          </Button>
          <Button type="button" variant="secondary" className="ui-ripple" disabled={isRefreshing} onClick={refreshOrder}>
            {isRefreshing ? "Memuat..." : "Muat Ulang"}
          </Button>
        </div>

        <div className="mb-8 rounded-xl border border-brand-border bg-white p-6 shadow-larisdy-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="content-eyebrow">Detail Pesanan</p>
              <h1 className="page-title admin-page-title">No. Pesanan {order.code}</h1>
              <p className="page-subtitle admin-page-subtitle">
                Tanggal pembelian {formatOrderDate(order.created_at)}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <span className={getOrderStatusClassName(order.status)}>{getOrderStatusLabel(order.status)}</span>
              <span className={getPaymentVerificationStatusClassName(paymentVerificationStatus)}>
                {getPaymentVerificationStatusLabel(paymentVerificationStatus)}
              </span>
              {order.tracking_number ? (
                <span className="order-status shipped">Resi {order.tracking_number}</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="grid gap-6">
            <article className="rounded-xl border border-brand-border bg-white p-6 shadow-larisdy-sm">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="content-eyebrow">Produk Dibeli</p>
                  <h2 className="text-3xl">Detail Produk</h2>
                </div>
                {order.status === "pending" ? (
                  <Button
                    type="button"
                    className="ui-ripple"
                    onClick={() => navigate(`/payment-status?order=${order.id}`)}
                  >
                    Bayar Sekarang
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-4">
                {(order.items ?? []).map((item) => (
                  <div key={item.id} className="flex items-center gap-4 rounded-xl bg-brand-cream p-4">
                    <img
                      src={resolveImagePath(item.product?.image ?? "images/logo.jpeg")}
                      alt={item.product?.name ?? "Produk Larisdy"}
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate">{item.product?.name ?? "Produk Larisdy"}</strong>
                      <span className="text-sm text-brand-muted">
                        {item.quantity} x {formatCurrency(item.price)}
                      </span>
                    </div>
                    <div className="grid justify-items-end gap-2">
                      <strong className="text-right">
                        {formatCurrency(item.line_total ?? item.quantity * item.price)}
                      </strong>
                      {isItemReviewable(order, item) ? (
                        <Button
                          type="button"
                          className="ui-ripple"
                          onClick={() => navigate(`/products/${item.product_id}`)}
                        >
                          Review Produk
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-brand-border bg-white p-6 shadow-larisdy-sm">
              <div className="mb-5">
                <p className="content-eyebrow">Riwayat Status</p>
                <h2 className="text-3xl">Status Pesanan</h2>
              </div>
              <OrderTrackingTimeline timeline={timeline} />
            </article>
          </div>

          <aside className="grid gap-6">
            <article className="rounded-xl border border-brand-border bg-white p-6 shadow-larisdy-sm">
              <p className="content-eyebrow">Informasi Pesanan</p>
              <h2 className="mb-4 text-3xl">Ringkasan</h2>
              <DetailRow label="Nomor Pesanan" value={order.code} />
              <DetailRow label="Tanggal Pembelian" value={formatOrderDate(order.created_at)} />
              <DetailRow label="Update Terakhir" value={formatMaybeDate(order.status_updated_at ?? order.updated_at)} />
              <DetailRow label="Status Pesanan" value={getOrderStatusLabel(order.status)} />
              <DetailRow label="Status Pembayaran" value={getPaymentVerificationStatusLabel(paymentVerificationStatus)} />
              {order.payment_expires_at && order.status === "pending" ? (
                <DetailRow label="Batas Bayar" value={formatOrderDate(order.payment_expires_at)} />
              ) : null}
              <DetailRow label="Kurir" value={getShippingCourierLabel(order.shipping_courier)} />
              <DetailRow label="Nomor Resi" value={order.tracking_number ?? "Belum tersedia"} />
            </article>

            <article className="rounded-xl border border-brand-border bg-white p-6 shadow-larisdy-sm">
              <p className="content-eyebrow">Pengiriman</p>
              <h2 className="mb-4 text-3xl">Alamat Pembeli</h2>
              <DetailRow label="Nama" value={order.customer_name} />
              <DetailRow label="Email" value={order.customer_email} />
              <DetailRow label="Nomor HP" value={order.customer_phone} />
              <DetailRow label="Alamat" value={order.shipping_address} />
              <DetailRow label="Kurir" value={getShippingCourierLabel(order.shipping_courier)} />
              {hasShippingCoordinates(order) ? (
                <DetailRow
                  label="Titik Maps"
                  value={(
                    <a
                      className="text-brand-gold hover:text-brand-copper"
                      href={getGoogleMapsUrl(order)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Buka lokasi
                    </a>
                  )}
                />
              ) : null}
              <DetailRow label="Catatan" value={order.notes || "-"} />
              {hasShippingCoordinates(order) ? (
                <iframe
                  title="Titik pengiriman"
                  src={getGoogleMapsEmbedUrl(order)}
                  className="mt-5 h-52 w-full rounded-xl border border-brand-border"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : null}
            </article>

            <article className="rounded-xl border border-brand-border bg-white p-6 shadow-larisdy-sm">
              <p className="content-eyebrow">Pembayaran</p>
              <h2 className="mb-4 text-3xl">Total Belanja</h2>
              <DetailRow label="Subtotal" value={formatCurrency(order.subtotal)} />
              <DetailRow label="Ongkos Kirim" value={formatCurrency(order.shipping_cost)} />
              <div className="mt-4 flex justify-between gap-4 border-t-2 border-brand-border pt-4 text-xl font-bold">
                <span>Total</span>
                <span>{formatCurrency(order.grand_total)}</span>
              </div>
            </article>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default CustomerOrderDetailPage;
