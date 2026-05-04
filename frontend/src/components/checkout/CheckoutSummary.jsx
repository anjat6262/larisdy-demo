import { formatCurrency } from "../../utils/currency";
import { resolveImagePath } from "../../utils/image";
import Button from "../ui/Button";

function CheckoutSummary({
  items,
  subtotal,
  shipping,
  total,
  shippingCourierLabel = "-",
  isSubmitting,
  submitLabel = "Lanjut ke Pembayaran",
}) {
  return (
    <aside className="sticky top-[120px] self-start rounded-xl border border-brand-border bg-white p-6 shadow-larisdy">
      <div className="mb-8 flex items-center gap-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-cream font-bold tracking-wide text-brand-gold">
          03
        </div>
        <h2>Ringkasan Pesanan</h2>
      </div>

      {items.map((item) => (
        <div key={item.id} className="mb-4 flex gap-3">
          <img
            src={resolveImagePath(item.image)}
            alt={item.name}
            className="h-[60px] w-[60px] rounded-lg object-cover"
          />
          <div>
            <p className="text-sm font-semibold">{item.name}</p>
            <p className="text-sm text-brand-muted">
              {item.quantity} x {formatCurrency(item.price)}
            </p>
          </div>
        </div>
      ))}

      <div className="my-4 border-t-2 border-brand-border pt-4">
        <div className="mb-5 flex justify-between gap-4 border-b border-brand-border pb-5 text-brand-muted">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="mb-5 flex justify-between gap-4 border-b border-brand-border pb-5 text-brand-muted">
          <span>Ongkos Kirim</span>
          <span>{formatCurrency(shipping)}</span>
        </div>
        <div className="mb-5 flex justify-between gap-4 border-b border-brand-border pb-5 text-brand-muted">
          <span>Kurir</span>
          <span>{shippingCourierLabel}</span>
        </div>
        <div className="mt-4 flex justify-between gap-4 border-t-2 border-brand-border pt-6 text-2xl font-bold text-brand-black">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      <Button type="submit" className="ui-ripple w-full" disabled={isSubmitting}>
        {isSubmitting ? "Membuat Pesanan..." : submitLabel}
      </Button>
    </aside>
  );
}

export default CheckoutSummary;
