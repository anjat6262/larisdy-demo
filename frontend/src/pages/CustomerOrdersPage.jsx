import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import OrderCard from "../components/account/OrderCard";
import EmptyState from "../components/common/EmptyState";
import Button from "../components/ui/Button";
import { useToast } from "../contexts/ToastContext";
import { orderService } from "../services/orderService";

function CustomerOrdersPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completingOrderId, setCompletingOrderId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") {
      return orders;
    }

    if (statusFilter === "review") {
      return orders.filter((order) => Number(order.reviewable_items_count ?? 0) > 0);
    }

    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      try {
        const response = await orderService.list();
        if (isMounted) {
          setOrders(response);
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

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  async function handleCompleteOrder(order) {
    const isConfirmed = window.confirm(
      "Selesaikan pesanan ini? Pastikan produk sudah diterima dalam kondisi baik.",
    );

    if (!isConfirmed) {
      return;
    }

    setCompletingOrderId(order.id);

    try {
      const updatedOrder = await orderService.complete(order.id);
      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) => (currentOrder.id === order.id ? updatedOrder : currentOrder)),
      );
      showToast("Pesanan telah diselesaikan.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setCompletingOrderId(null);
    }
  }

  function orderDetailPath(order) {
    return `/orders/${order.id}`;
  }

  function reviewProductPath(order) {
    const reviewableItem = order.reviewable_items?.[0];
    const productId = reviewableItem?.product_id ?? reviewableItem?.product?.id;

    return productId ? `/products/${productId}` : orderDetailPath(order);
  }

  function renderOrderActions(order) {
    if (order.status === "pending") {
      return (
        <>
          <Button
            type="button"
            className="ui-ripple"
            onClick={() => navigate(`/payment-status?order=${order.id}`)}
          >
            Bayar Sekarang
          </Button>
          <Button type="button" variant="secondary" className="ui-ripple" onClick={() => navigate(orderDetailPath(order))}>
            Lihat Detail
          </Button>
        </>
      );
    }

    if (order.status === "shipped") {
      return (
        <>
          <Button type="button" variant="secondary" className="ui-ripple" onClick={() => navigate(orderDetailPath(order))}>
            Lihat Detail
          </Button>
          <Button
            type="button"
            className="ui-ripple"
            disabled={completingOrderId === order.id}
            onClick={() => handleCompleteOrder(order)}
          >
            {completingOrderId === order.id ? "Menyelesaikan..." : "Selesaikan Pesanan"}
          </Button>
        </>
      );
    }

    if (order.status === "completed" && Number(order.reviewable_items_count ?? 0) > 0) {
      return (
        <>
          <Button type="button" className="ui-ripple" onClick={() => navigate(reviewProductPath(order))}>
            Review Produk
          </Button>
          <Button type="button" variant="secondary" className="ui-ripple" onClick={() => navigate(orderDetailPath(order))}>
            Lihat Detail
          </Button>
        </>
      );
    }

    return (
      <Button type="button" variant="secondary" className="ui-ripple" onClick={() => navigate(orderDetailPath(order))}>
        Lihat Detail
      </Button>
    );
  }

  return (
    <section className="page-section">
      <div className="container">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-6 rounded-2xl border border-brand-border bg-white p-6 shadow-larisdy-sm">
          <div>
            <h1 className="text-left text-4xl font-bold md:text-5xl">Pesanan Saya</h1>
            <p className="mt-4 max-w-2xl text-left text-lg text-brand-muted">
              Pantau status order, pembayaran, dan resi pengiriman dari satu halaman.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" className="ui-ripple" onClick={() => navigate("/products")}>
              Belanja Lagi
            </Button>
            <Button type="button" className="ui-ripple" onClick={() => navigate("/account")}>
              Buka Profil
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="mx-auto my-8 max-w-[760px] rounded-2xl border border-brand-border bg-white p-8 text-center shadow-larisdy-sm">
            <p>Memuat pesanan Anda...</p>
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            title="Belum Ada Pesanan"
            description="Checkout pertama Anda akan langsung muncul di halaman ini."
            actionLabel="Lihat Produk"
            onAction={() => navigate("/products")}
          />
        ) : (
          <div>
            <div className="mb-6 flex flex-wrap gap-3">
              {[
                ["all", "Semua"],
                ["pending", "Menunggu Bayar"],
                ["paid", "Dibayar"],
                ["processed", "Diproses"],
                ["shipped", "Dikirim"],
                ["completed", "Selesai"],
                ["review", "Review Produk"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`rounded-full border px-5 py-3 font-medium transition hover:-translate-y-0.5 hover:border-brand-gold hover:bg-brand-cream hover:text-brand-black focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/70 ${
                    statusFilter === value
                      ? "border-brand-black bg-brand-black text-white"
                      : "border-brand-border bg-white text-brand-muted"
                  }`}
                  onClick={() => setStatusFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="mx-auto my-8 max-w-[760px] rounded-2xl border border-brand-border bg-white p-8 text-center shadow-larisdy-sm">
                <p>Tidak ada pesanan pada status ini.</p>
              </div>
            ) : null}

            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onOpenDetail={() => navigate(orderDetailPath(order))}
                actions={renderOrderActions(order)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default CustomerOrdersPage;
