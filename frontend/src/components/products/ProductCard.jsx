import { resolveImagePath } from "../../utils/image";
import { formatCurrency } from "../../utils/currency";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import ProductRating from "./ProductRating";

function ProductCard({ product, index = 0, onSelect, primaryAction = null }) {
  const isOutOfStock = Number(product.stock) <= 0;
  const isLowStock = Number(product.stock) > 0 && Number(product.stock) <= 10;
  const spicyLabel = Array.from({ length: 5 }, (_, currentIndex) => (
    <span
      key={`${product.id}-spicy-${currentIndex}`}
      className={`h-2.5 w-2.5 rounded-full border ${
        currentIndex < product.spicyLevel
          ? "border-brand-copper bg-brand-copper"
          : "border-brand-copper/40 bg-brand-copper/15"
      }`}
    />
  ));

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(product);
    }
  }

  function handlePrimaryAction(event) {
    event.stopPropagation();
    primaryAction?.onClick?.(product);
  }

  return (
    <article
      className="product-card group cursor-pointer overflow-hidden rounded-xl border border-brand-border bg-white shadow-larisdy-sm transition duration-200 hover:border-brand-gold/70 hover:shadow-larisdy"
      data-animate
      role="button"
      tabIndex={0}
      style={{ animationDelay: `${index * 0.08}s` }}
      onClick={() => onSelect(product)}
      onKeyDown={handleKeyDown}
    >
      <div className="relative overflow-hidden bg-brand-cream">
        <img
          src={resolveImagePath(product.image)}
          alt={product.name}
          className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.02]"
        />
        <div className="absolute left-3 right-3 top-3 flex flex-wrap justify-between gap-2">
          <Badge>{product.category}</Badge>
          <Badge tone={isOutOfStock ? "danger" : isLowStock ? "warning" : "success"}>
            {isOutOfStock ? "Habis" : isLowStock ? `Sisa ${product.stock}` : "Stok Ada"}
          </Badge>
        </div>
      </div>
      <div className="p-5">
        <h3 className="mb-2 text-xl font-bold transition group-hover:text-brand-brown">{product.name}</h3>
        <ProductRating summary={product.review_summary} className="mb-3" />
        <p className="mb-6 line-clamp-2 text-brand-muted leading-7">{product.description}</p>
        <div className="flex items-center justify-between gap-4 border-t border-brand-border pt-4">
          <div>
            <p className="text-xl font-bold text-brand-black">{formatCurrency(product.price)}</p>
            <p className="mt-1 text-sm font-medium text-brand-muted">{product.weight}</p>
          </div>
          <div className="inline-flex items-center gap-1" title={`Tingkat pedas: ${product.spicyLevel}/5`}>
            {spicyLabel}
          </div>
        </div>
        {primaryAction ? (
          <div className="mt-4">
            <Button
              variant={primaryAction.variant === "secondary" ? "secondary" : "primary"}
              className="w-full ui-ripple"
              onClick={handlePrimaryAction}
              disabled={isOutOfStock}
            >
              {isOutOfStock ? "Stok Habis" : primaryAction.label}
            </Button>
            <Button
              variant="secondary"
              className="mt-2 w-full ui-ripple"
              onClick={(event) => {
                event.stopPropagation();
                onSelect(product);
              }}
            >
              Lihat Detail
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default ProductCard;
