import { formatCurrency } from "../../utils/currency";
import { resolveImagePath } from "../../utils/image";

function CartItem({ item, onRemove, onUpdateQuantity }) {
  return (
    <div
      className="flex flex-col gap-5 rounded-xl border border-brand-border bg-white p-5 shadow-larisdy-sm transition duration-300 hover:border-transparent hover:shadow-larisdy md:flex-row"
      data-animate
    >
      <img
        src={resolveImagePath(item.image)}
        alt={item.name}
        className="h-60 w-full flex-shrink-0 rounded-[10px] object-cover md:h-28 md:w-28"
      />
      <div className="flex-1">
        <div className="mb-3 flex flex-col justify-between gap-4 sm:flex-row">
          <div>
            <h3 className="text-2xl font-bold">{item.name}</h3>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-copper">{item.category}</p>
          </div>
          <button
            type="button"
            className="self-start rounded-lg px-3 py-2 text-sm font-semibold text-brand-muted transition hover:scale-[1.04] hover:text-brand-copper focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/70"
            onClick={() => onRemove(item.id)}
            aria-label={`Hapus ${item.name} dari keranjang`}
          >
            Hapus
          </button>
        </div>
        <p className="text-xl font-bold text-brand-brown">{formatCurrency(item.price)}</p>
        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-border bg-white font-bold transition hover:border-brand-gold hover:bg-brand-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/70"
              onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
              aria-label={`Kurangi jumlah ${item.name}`}
            >
              -
            </button>
            <span className="min-w-10 text-center font-semibold">{item.quantity}</span>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-border bg-white font-bold transition hover:border-brand-gold hover:bg-brand-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/70"
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              aria-label={`Tambah jumlah ${item.name}`}
            >
              +
            </button>
          </div>
          <div>
            <p className="text-sm text-brand-muted">Subtotal</p>
            <p className="font-bold">{formatCurrency(item.price * item.quantity)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CartItem;
