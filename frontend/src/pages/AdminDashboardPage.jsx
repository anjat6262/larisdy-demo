import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StatusCard from "../components/common/StatusCard";
import Button from "../components/ui/Button";
import { useToast } from "../contexts/ToastContext";
import { orderService } from "../services/orderService";
import { productService } from "../services/productService";
import { reportService } from "../services/reportService";
import { formatCurrency } from "../utils/currency";

function AdminDashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [snapshot, setSnapshot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const [orderResponse, productResponse, salesSummary] = await Promise.all([
          orderService.listAdmin(),
          productService.list(),
          reportService.salesSummary(),
        ]);

        if (isMounted) {
          setSnapshot({
            orders: orderResponse.orders,
            summary: orderResponse.summary,
            products: productResponse.products,
            salesSummary,
          });
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

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  return (
    <section className="page-section">
      <div className="container">
        <div className="admin-page-header">
          <div>
            <h1 className="page-title admin-page-title">Dashboard Admin</h1>
            <p className="page-subtitle admin-page-subtitle">
              Ringkasan operasional toko, pembayaran, pesanan, dan katalog.
            </p>
          </div>
          <div className="admin-page-actions">
            <Button type="button" variant="secondary" className="ui-ripple" onClick={() => navigate("/admin/orders")}>
              Kelola Pesanan
            </Button>
            <Button type="button" variant="secondary" className="ui-ripple" onClick={() => navigate("/admin/reports")}>
              Laporan Penjualan
            </Button>
            <Button type="button" className="ui-ripple" onClick={() => navigate("/admin/products")}>
              Kelola Produk
            </Button>
          </div>
        </div>

        {isLoading ? (
          <StatusCard>
            <p>Memuat snapshot dashboard admin...</p>
          </StatusCard>
        ) : (
          <>
            <div className="admin-summary-grid dashboard-summary-grid mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <div className="admin-summary-card rounded-2xl border border-brand-border bg-brand-cream p-5 shadow-larisdy-sm">
                <span className="text-sm text-brand-muted">Total Pesanan</span>
                <strong className="block text-xl">{snapshot?.summary?.total_orders ?? 0}</strong>
              </div>
              <div className="admin-summary-card rounded-2xl border border-brand-border bg-brand-cream p-5 shadow-larisdy-sm">
                <span className="text-sm text-brand-muted">Menunggu Bayar</span>
                <strong className="block text-xl">{snapshot?.summary?.waiting_payment ?? 0}</strong>
              </div>
              <div className="admin-summary-card rounded-2xl border border-brand-border bg-brand-cream p-5 shadow-larisdy-sm">
                <span className="text-sm text-brand-muted">Sudah Dibayar</span>
                <strong className="block text-xl">{snapshot?.summary?.paid_orders ?? 0}</strong>
              </div>
              <div className="admin-summary-card rounded-2xl border border-brand-border bg-brand-cream p-5 shadow-larisdy-sm">
                <span className="text-sm text-brand-muted">Dalam Pengiriman</span>
                <strong className="block text-xl">{snapshot?.summary?.in_delivery ?? 0}</strong>
              </div>
              <div className="admin-summary-card rounded-2xl border border-brand-border bg-brand-cream p-5 shadow-larisdy-sm xl:col-span-1">
                <span className="text-sm text-brand-muted">Pendapatan</span>
                <strong className="block text-xl">{formatCurrency(snapshot?.salesSummary?.total_revenue ?? 0)}</strong>
              </div>
              <div className="admin-summary-card rounded-2xl border border-brand-border bg-brand-cream p-5 shadow-larisdy-sm">
                <span className="text-sm text-brand-muted">Total Produk</span>
                <strong className="block text-xl">{snapshot?.products?.length ?? 0}</strong>
              </div>
            </div>

            <div className="dashboard-panels grid gap-6 lg:grid-cols-2">
              <article className="content-card rounded-2xl border border-brand-border bg-white p-8 shadow-larisdy-sm" data-animate>
                <p className="content-eyebrow">Pesanan Terbaru</p>
                <h2>Aktivitas Order</h2>
                <div className="dashboard-list mt-5 grid gap-3">
                  {snapshot?.orders?.slice(0, 5).map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      className="dashboard-list-item flex w-full items-center justify-between gap-4 rounded-xl border border-brand-border bg-white p-4 text-left text-brand-black transition duration-200 hover:shadow-larisdy-sm"
                      onClick={() => navigate("/admin/orders")}
                    >
                      <div>
                        <strong>{order.code}</strong>
                        <p className="text-sm text-brand-muted">{order.customer_name}</p>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wide text-brand-brown">{order.status}</span>
                    </button>
                  ))}
                </div>
              </article>

              <article className="content-card accent-card rounded-2xl border border-brand-border bg-white p-8 shadow-larisdy-sm" data-animate>
                <p className="content-eyebrow">Katalog</p>
                <h2>Produk Aktif</h2>
                <div className="dashboard-list mt-5 grid gap-3">
                  {snapshot?.products?.slice(0, 5).map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      className="dashboard-list-item flex w-full items-center justify-between gap-4 rounded-xl border border-brand-border bg-white p-4 text-left text-brand-black transition duration-200 hover:shadow-larisdy-sm"
                      onClick={() => navigate("/admin/products")}
                    >
                      <div>
                        <strong>{product.name}</strong>
                        <p className="text-sm text-brand-muted">{product.category}</p>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wide text-brand-brown">Stok {product.stock}</span>
                    </button>
                  ))}
                </div>
              </article>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default AdminDashboardPage;
