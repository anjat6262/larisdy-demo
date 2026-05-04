import { formatCurrency } from "../../utils/currency";
import Button from "../ui/Button";

function CartSummary({
  subtotal,
  shipping,
  total,
  primaryLabel,
  onPrimaryAction,
  secondaryLabel,
  onSecondaryAction,
}) {
  return (
    <aside className="sticky top-[120px] self-start rounded-xl border border-brand-border bg-white p-6 shadow-larisdy">
      <span className="mb-4 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800">
        Checkout
      </span>
      <h2 className="mb-6 text-xl font-bold">Ringkasan Pesanan</h2>
      <div className="mb-5 flex justify-between gap-4 border-b border-brand-border pb-5 text-brand-muted">
        <span>Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      <div className="mb-5 flex justify-between gap-4 border-b border-brand-border pb-5 text-brand-muted">
        <span>Ongkos Kirim</span>
        <span>{formatCurrency(shipping)}</span>
      </div>
      <div className="mb-6 mt-4 flex justify-between gap-4 border-t-2 border-brand-border pt-6 text-2xl font-bold text-brand-black">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>
      <Button type="button" className="ui-ripple w-full" onClick={onPrimaryAction}>
        {primaryLabel}
      </Button>
      {secondaryLabel && onSecondaryAction ? (
        <Button
          type="button"
          variant="secondary"
          className="ui-ripple mt-3 w-full"
          onClick={onSecondaryAction}
        >
          {secondaryLabel}
        </Button>
      ) : null}
    </aside>
  );
}

export default CartSummary;
