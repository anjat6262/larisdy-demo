import { useNavigate } from "react-router-dom";
import CartItem from "../components/cart/CartItem";
import CartSummary from "../components/cart/CartSummary";
import EmptyState from "../components/common/EmptyState";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useToast } from "../contexts/ToastContext";

function CartPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();
  const { showToast } = useToast();
  const {
    items,
    subtotal,
    shipping,
    total,
    removeItem,
    updateItemQuantity,
  } = useCart();

  function handleCheckout() {
    if (isAdmin) {
      showToast("Admin tidak bisa melakukan checkout.", "error");
      navigate("/admin/products");
      return;
    }

    if (!isAuthenticated) {
      showToast("Silakan login terlebih dahulu.", "error");
      navigate("/login", { state: { from: "/checkout" } });
      return;
    }

    navigate("/checkout");
  }

  if (items.length === 0) {
    return (
      <section className="page-section">
        <div className="container">
          <EmptyState
            title="Keranjang Kosong"
            description="Belum ada produk dalam keranjang Anda."
            actionLabel="Mulai Belanja"
            onAction={() => navigate("/products")}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="container">
        <h1 className="page-title">Keranjang Belanja</h1>
        <div className="cart-layout">
          <div>
            {items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onRemove={removeItem}
                onUpdateQuantity={updateItemQuantity}
              />
            ))}
          </div>

          <CartSummary
            subtotal={subtotal}
            shipping={shipping}
            total={total}
            primaryLabel="Checkout"
            onPrimaryAction={handleCheckout}
            secondaryLabel="Lanjut Belanja"
            onSecondaryAction={() => navigate("/products")}
          />
        </div>
      </div>
    </section>
  );
}

export default CartPage;
