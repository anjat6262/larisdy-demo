import { formatCurrency } from "../../utils/currency";
import { formatOrderDate } from "../../utils/date";
import { resolveImagePath } from "../../utils/image";
import { getGoogleMapsUrl, hasShippingCoordinates } from "../../utils/maps";
import {
  getOrderPaymentProof,
  getOrderStatusClassName,
  getOrderStatusLabel,
  getPaymentVerificationStatus,
  getPaymentVerificationStatusClassName,
  getPaymentVerificationStatusLabel,
} from "../../utils/orderStatus";
import { getShippingCourierLabel } from "../../utils/shipping";

const PAYMENT_METHOD_LABELS = {
  qris_manual: "QRIS Pribadi",
  bank_transfer_bca: "Transfer Bank BCA",
};

function formatPaymentDeadline(order) {
  if (order.status !== "pending" || !order.payment_expires_at) {
    return null;
  }

  if (order.payment_deadline_passed || order.payment_status === "expired") {
    return "Batas bayar lewat";
  }

  return formatOrderDate(order.payment_expires_at);
}

function OrderCard({ order, actions = null, showCustomer = false, variant = "default", onOpenDetail = null }) {
  const statusUpdatedAt = order.status_updated_at ?? order.updated_at;
  const paymentMethodLabel = PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method ?? "-";
  const isAdminVariant = variant === "admin";
  const paymentProof = getOrderPaymentProof(order);
  const paymentVerificationStatus = getPaymentVerificationStatus(order);
  const paymentDeadline = formatPaymentDeadline(order);
  const shippingCourierLabel = getShippingCourierLabel(order.shipping_courier);

  return (
    <article
      className={`order-card rounded-xl border border-brand-border bg-white p-5 shadow-larisdy-sm transition duration-300 hover:border-brand-gold hover:shadow-larisdy ${isAdminVariant ? "mb-0" : "mb-4"}`}
      data-animate
    >
      <div className={`order-header mb-6 gap-4 border-b border-brand-border pb-6 ${isAdminVariant ? "grid grid-cols-[minmax(180px,1fr)_auto] items-start" : "flex flex-wrap justify-between"}`}>
        <div>
          <p className="order-number text-lg font-semibold">{order.code}</p>
          <p className="order-date text-sm text-brand-muted">{formatOrderDate(order.created_at)}</p>
          {statusUpdatedAt ? (
            <p className="order-date text-sm text-brand-muted">Update status: {formatOrderDate(statusUpdatedAt)}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <span className={getOrderStatusClassName(order.status)}>{getOrderStatusLabel(order.status)}</span>
          <span className={getPaymentVerificationStatusClassName(paymentVerificationStatus)}>
            {getPaymentVerificationStatusLabel(paymentVerificationStatus)}
          </span>
        </div>
      </div>

      {showCustomer ? (
        <div className="order-customer-block mb-6 rounded-xl bg-brand-cream p-4">
          <div className={`order-customer-grid grid gap-4 ${isAdminVariant ? "lg:grid-cols-4" : "md:grid-cols-2"}`}>
            <div>
              <p className="order-section-label text-xs font-bold uppercase tracking-wide text-brand-muted">Customer</p>
              <p className="order-section-value font-semibold">{order.customer_name}</p>
              <p className="order-date text-sm text-brand-muted">{order.customer_email}</p>
            </div>
            <div>
              <p className="order-section-label text-xs font-bold uppercase tracking-wide text-brand-muted">Kontak</p>
              <p className="order-section-value font-semibold">{order.customer_phone}</p>
              <p className="order-date text-sm text-brand-muted">{order.shipping_address}</p>
              {hasShippingCoordinates(order) ? (
                <a
                  className="mt-2 inline-flex font-semibold text-brand-gold hover:text-brand-copper"
                  href={getGoogleMapsUrl(order)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buka titik Maps
                </a>
              ) : null}
            </div>
            <div>
              <p className="order-section-label text-xs font-bold uppercase tracking-wide text-brand-muted">Kurir</p>
              <p className="order-section-value font-semibold">{shippingCourierLabel}</p>
              <p className="order-date text-sm text-brand-muted">
                Resi {order.tracking_number ?? "belum tersedia"}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="order-customer-block order-meta-block mb-6 rounded-xl bg-brand-cream p-4">
        <div className={`order-customer-grid grid gap-4 ${isAdminVariant ? "lg:grid-cols-4" : "md:grid-cols-2"}`}>
          <div>
            <p className="order-section-label text-xs font-bold uppercase tracking-wide text-brand-muted">Metode Bayar</p>
            <p className="order-section-value font-semibold">
              {paymentMethodLabel}
            </p>
          </div>
          <div>
            <p className="order-section-label text-xs font-bold uppercase tracking-wide text-brand-muted">
              {showCustomer ? "Status Gateway" : "Kurir Pengiriman"}
            </p>
            <p className="order-section-value font-semibold">
              {showCustomer ? order.payment_status ?? "pending" : shippingCourierLabel}
            </p>
          </div>
          <div>
            <p className="order-section-label text-xs font-bold uppercase tracking-wide text-brand-muted">
              {paymentDeadline ? "Batas Bayar" : "Resi"}
            </p>
            <p className="order-section-value font-semibold">
              {paymentDeadline ?? order.tracking_number ?? "Belum tersedia"}
            </p>
          </div>
          <div>
            <p className="order-section-label text-xs font-bold uppercase tracking-wide text-brand-muted">Total</p>
            <p className="order-section-value font-semibold">{formatCurrency(order.grand_total)}</p>
          </div>
        </div>
      </div>

      {paymentProof ? (
        <div className="order-customer-block mb-6 rounded-xl border border-brand-border bg-white p-4">
          <div className="flex flex-wrap items-center gap-4">
            {paymentProof.file_url ? (
              <img
                src={resolveImagePath(paymentProof.file_url)}
                alt="Bukti pembayaran"
                className="h-24 w-24 rounded-lg border border-brand-border bg-brand-cream object-cover"
              />
            ) : (
              <div className="grid h-24 w-24 place-items-center rounded-lg border border-dashed border-brand-border bg-brand-cream px-3 text-center text-xs font-semibold text-brand-muted">
                File tidak tersedia
              </div>
            )}
            <div className="grid gap-1 text-sm text-brand-muted">
              <p className="order-section-label text-xs font-bold uppercase tracking-wide text-brand-muted">
                Bukti Pembayaran
              </p>
              <strong className="text-brand-black">
                {paymentProof.verification_status === "pending"
                  ? "Menunggu Verifikasi Admin"
                  : paymentProof.verification_status === "verified"
                    ? "Bukti terverifikasi"
                    : "Bukti ditolak"}
              </strong>
              {paymentProof.note ? <span>Catatan: {paymentProof.note}</span> : null}
              {paymentProof.rejection_note ? <span>Alasan: {paymentProof.rejection_note}</span> : null}
            </div>
          </div>
        </div>
      ) : null}

      {order.items.map((item) => {
        const itemContent = (
          <>
            <img
              src={resolveImagePath(item.product?.image ?? "images/logo.jpeg")}
              alt={item.product?.name ?? "Produk Larisdy"}
              className="order-item-image h-[70px] w-[70px] rounded-lg object-cover"
            />
            <div className="order-item-content flex-1">
              <p className="order-item-name font-semibold">{item.product?.name ?? "Produk tidak ditemukan"}</p>
              <p className="order-item-meta text-sm text-brand-muted">
                {item.quantity} x {formatCurrency(item.price)}
              </p>
            </div>
            <p className="order-item-price font-semibold">{formatCurrency(item.line_total ?? item.quantity * item.price)}</p>
          </>
        );
        const itemClassName = `order-item mb-5 flex w-full items-center gap-5 text-left ${
          isAdminVariant ? "rounded-lg bg-brand-cream p-3" : ""
        } ${onOpenDetail ? "cursor-pointer rounded-lg transition hover:bg-brand-cream/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60" : ""}`.trim();

        return onOpenDetail ? (
          <button
            key={item.id}
            type="button"
            className={itemClassName}
            onClick={onOpenDetail}
            aria-label={`Buka detail pesanan ${order.code}`}
          >
            {itemContent}
          </button>
        ) : (
          <div key={item.id} className={itemClassName}>
            {itemContent}
          </div>
        );
      })}

      <div className="order-total mt-4 flex justify-between gap-4 border-t-2 border-brand-border pt-4 font-semibold">
        <span>Total Pembayaran</span>
        <span className="font-bold">{formatCurrency(order.grand_total)}</span>
      </div>

      {actions ? <div className="mt-5 flex flex-wrap gap-3 border-t border-brand-border pt-5">{actions}</div> : null}
    </article>
  );
}

export default OrderCard;
