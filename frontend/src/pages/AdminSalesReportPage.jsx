import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import StatusCard from "../components/common/StatusCard";
import Button from "../components/ui/Button";
import { useToast } from "../contexts/ToastContext";
import { productService } from "../services/productService";
import { reportService } from "../services/reportService";
import { formatCurrency } from "../utils/currency";

const EMPTY_SUMMARY = {
  total_products_sold: 0,
  total_revenue: 0,
  total_orders_paid: 0,
  products_sold: [],
};

function AdminSalesReportPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    product_id: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id) === String(appliedFilters.product_id)),
    [products, appliedFilters.product_id],
  );

  async function loadReport(nextFilters = appliedFilters, quiet = false) {
    if (!quiet) {
      setIsLoading(true);
    }

    try {
      const response = await reportService.salesSummary(nextFilters);
      setSummary({
        total_products_sold: response.total_products_sold ?? 0,
        total_revenue: response.total_revenue ?? 0,
        total_orders_paid: response.total_orders_paid ?? 0,
        products_sold: response.products_sold ?? [],
      });
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      if (!quiet) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function bootstrapReport() {
      try {
        const [productResponse, reportResponse] = await Promise.all([
          productService.list(),
          reportService.salesSummary(appliedFilters),
        ]);

        if (isMounted) {
          setProducts(productResponse.products);
          setSummary({
            total_products_sold: reportResponse.total_products_sold ?? 0,
            total_revenue: reportResponse.total_revenue ?? 0,
            total_orders_paid: reportResponse.total_orders_paid ?? 0,
            products_sold: reportResponse.products_sold ?? [],
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

    bootstrapReport();

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  function updateFilter(event) {
    const { name, value } = event.target;

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setAppliedFilters(filters);
    loadReport(filters);
  }

  function handleReset() {
    const resetFilters = {
      date_from: "",
      date_to: "",
      product_id: "",
    };

    setFilters(resetFilters);
    setAppliedFilters(resetFilters);
    loadReport(resetFilters);
  }

  return (
    <section className="page-section">
      <div className="container">
        <div className="admin-page-header">
          <div>
            <h1 className="page-title admin-page-title">Laporan Penjualan</h1>
            <p className="page-subtitle admin-page-subtitle">
              Ringkasan pendapatan, produk terjual, dan order paid.
            </p>
          </div>
          <div className="admin-page-actions">
            <Button type="button" variant="secondary" className="ui-ripple" onClick={() => navigate("/admin")}>
              Dashboard
            </Button>
            <Button type="button" variant="secondary" className="ui-ripple" onClick={() => navigate("/admin/orders")}>
              Pesanan
            </Button>
            <Button type="button" className="ui-ripple" onClick={() => loadReport(appliedFilters, true)}>
              Muat Ulang
            </Button>
          </div>
        </div>

        <div className="admin-report-layout grid gap-8 lg:grid-cols-[minmax(320px,420px)_1fr] lg:items-start">
          <form
            className="content-card admin-report-filter rounded-2xl border border-brand-border bg-white p-8 shadow-larisdy-sm"
            onSubmit={handleSubmit}
          >
            <p className="content-eyebrow">Filter Laporan</p>
            <h2 className="mb-6">Periode & Produk</h2>

            <div className="admin-form-row">
              <div className="form-group">
                <label htmlFor="reportDateFrom">Dari Tanggal</label>
                <input
                  id="reportDateFrom"
                  type="date"
                  name="date_from"
                  className="tw-input"
                  value={filters.date_from}
                  onChange={updateFilter}
                />
              </div>
              <div className="form-group">
                <label htmlFor="reportDateTo">Sampai Tanggal</label>
                <input
                  id="reportDateTo"
                  type="date"
                  name="date_to"
                  className="tw-input"
                  value={filters.date_to}
                  onChange={updateFilter}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reportProduct">Produk</label>
              <select
                id="reportProduct"
                name="product_id"
                className="tw-input"
                value={filters.product_id}
                onChange={updateFilter}
              >
                <option value="">Semua produk</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form-actions">
              <Button type="submit" className="ui-ripple" disabled={isLoading}>
                {isLoading ? "Memuat..." : "Terapkan Filter"}
              </Button>
              <Button type="button" variant="secondary" className="ui-ripple" onClick={handleReset} disabled={isLoading}>
                Reset
              </Button>
            </div>
          </form>

          <div>
            {isLoading ? (
              <StatusCard>
                <p>Memuat laporan penjualan...</p>
              </StatusCard>
            ) : (
              <>
                <div className="admin-summary-grid report-summary-grid mb-6 grid gap-4 md:grid-cols-[1.4fr_1fr_1fr]">
                  <div className="admin-summary-card revenue-card rounded-2xl border border-brand-border bg-brand-cream p-5 shadow-larisdy-sm">
                    <span className="text-sm text-brand-muted">Total Pendapatan</span>
                    <strong className="block text-2xl">{formatCurrency(summary.total_revenue)}</strong>
                  </div>
                  <div className="admin-summary-card rounded-2xl border border-brand-border bg-brand-cream p-5 shadow-larisdy-sm">
                    <span className="text-sm text-brand-muted">Produk Terjual</span>
                    <strong className="block text-xl">{summary.total_products_sold}</strong>
                  </div>
                  <div className="admin-summary-card rounded-2xl border border-brand-border bg-brand-cream p-5 shadow-larisdy-sm">
                    <span className="text-sm text-brand-muted">Order Paid</span>
                    <strong className="block text-xl">{summary.total_orders_paid}</strong>
                  </div>
                </div>

                <article className="content-card rounded-2xl border border-brand-border bg-white p-8 shadow-larisdy-sm">
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="content-eyebrow">Produk Terjual</p>
                      <h2>Daftar Produk Terjual</h2>
                    </div>
                    <span className="role-chip">{summary.products_sold.length} produk</span>
                  </div>

                  {summary.products_sold.length === 0 ? (
                    <StatusCard>
                      <p>Belum ada produk terjual pada filter ini.</p>
                    </StatusCard>
                  ) : (
                    <div className="admin-report-table-wrap">
                      <table className="admin-report-table">
                        <thead>
                          <tr>
                            <th>Produk</th>
                            <th className="text-right">Terjual</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.products_sold.map((product) => (
                            <tr key={product.product_id}>
                              <td>
                                <strong>{product.product_name}</strong>
                              </td>
                              <td className="text-right">{product.total_quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>

                <article className="content-card accent-card rounded-2xl border border-brand-border bg-white p-8 shadow-larisdy-sm">
                  <p className="content-eyebrow">Ringkasan Aktif</p>
                  <h2>Data yang Sedang Ditampilkan</h2>
                  <div className="report-detail-list mt-5 grid gap-3">
                    <div className="flex justify-between gap-4 border-b border-brand-border py-4">
                      <span className="text-brand-muted">Periode</span>
                      <strong className="text-right">
                        {appliedFilters.date_from || "Awal"} sampai {appliedFilters.date_to || "Sekarang"}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-brand-border py-4">
                      <span className="text-brand-muted">Produk</span>
                      <strong className="text-right">{selectedProduct?.name ?? "Semua produk"}</strong>
                    </div>
                    <div className="flex justify-between gap-4 py-4">
                      <span className="text-brand-muted">Dasar Perhitungan</span>
                      <strong className="text-right">Order paid, settlement, atau completed</strong>
                    </div>
                  </div>
                </article>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AdminSalesReportPage;
