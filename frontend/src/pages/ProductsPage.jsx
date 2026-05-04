import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CategoryFilter from "../components/products/CategoryFilter";
import ProductCard from "../components/products/ProductCard";
import Button from "../components/ui/Button";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { productService } from "../services/productService";
import { useToast } from "../contexts/ToastContext";

function ProductsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin, isCustomer } = useAuth();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(["Semua"]);
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") ?? "");
  const [sortBy, setSortBy] = useState("recommended");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const response = await productService.list();
        if (isMounted) {
          setProducts(response.products);
          setCategories(response.meta?.categories?.length ? response.meta.categories : ["Semua"]);
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

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setSearchQuery(searchParams.get("search") ?? "");
  }, [searchParams]);

  const filteredProducts = (selectedCategory === "Semua"
      ? products
      : products.filter((product) => product.category === selectedCategory))
      .filter((product) => {
        const normalizedSearch = searchQuery.trim().toLowerCase();

        if (!normalizedSearch) {
          return true;
        }

        return [product.name, product.category, product.description]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));
      })
      .sort((firstProduct, secondProduct) => {
        if (sortBy === "price_low") {
          return Number(firstProduct.price) - Number(secondProduct.price);
        }

        if (sortBy === "price_high") {
          return Number(secondProduct.price) - Number(firstProduct.price);
        }

        if (sortBy === "name") {
          return firstProduct.name.localeCompare(secondProduct.name);
        }

        return 0;
      });

  function handleQuickBuy(product) {
    if (Number(product.stock) <= 0) {
      showToast("Stok produk sedang habis.", "error");
      return;
    }

    addItem(product, 1);
    showToast(`${product.name} ditambahkan ke keranjang.`);
    navigate("/cart");
  }

  return (
    <section className="page-section">
      <div className="container">
        <div className="mb-8 grid items-end gap-8 lg:grid-cols-[1fr_minmax(280px,420px)]">
          <div>
            <p className="mb-2 text-xs font-bold uppercase text-brand-copper">Marketplace Larisdy</p>
            <h1 className="text-left text-4xl font-bold md:text-5xl">Katalog Produk</h1>
          </div>
          <div className="grid gap-3">
            <label htmlFor="productSearch" className="mb-2 block text-sm font-bold text-brand-muted">Cari Produk</label>
            <input
              id="productSearch"
              type="search"
              placeholder="Cari sambal, camilan, kategori..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="tw-input"
            />
          </div>
        </div>

        {isAdmin ? (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-border bg-brand-cream p-5">
            <p>Anda login sebagai admin. CRUD produk dilakukan dari dashboard admin.</p>
            <Button
              type="button"
              className="ui-ripple"
              onClick={() => navigate("/admin/products")}
            >
              Tambah / Edit / Hapus Produk
            </Button>
          </div>
        ) : null}

        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
        />

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-border bg-white px-5 py-4 shadow-larisdy-sm">
          <p className="text-sm font-semibold text-brand-muted">
            Menampilkan {filteredProducts.length} dari {products.length} produk
          </p>
          <label className="flex items-center gap-3 text-sm font-semibold text-brand-muted">
            Urutkan
            <select className="tw-input min-w-[190px] py-2" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="recommended">Rekomendasi</option>
              <option value="price_low">Harga Terendah</option>
              <option value="price_high">Harga Tertinggi</option>
              <option value="name">Nama A-Z</option>
            </select>
          </label>
        </div>

        {isLoading ? (
          <div className="mx-auto my-8 max-w-[760px] rounded-2xl border border-brand-border bg-white p-8 text-center shadow-larisdy-sm">
            <p>Memuat katalog produk...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mx-auto my-8 max-w-[760px] rounded-2xl border border-brand-border bg-white p-8 text-center shadow-larisdy-sm">
            <h2>Produk Tidak Ditemukan</h2>
            <p>Coba ubah kategori atau kata kunci pencarian.</p>
          </div>
        ) : (
          <div className="my-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                onSelect={() => navigate(`/products/${product.id}`)}
                primaryAction={
                  isCustomer
                    ? {
                        label: "Beli",
                        onClick: handleQuickBuy,
                      }
                    : null
                }
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default ProductsPage;
