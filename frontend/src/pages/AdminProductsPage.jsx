import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import StatusCard from "../components/common/StatusCard";
import Button from "../components/ui/Button";
import { productService } from "../services/productService";
import { useToast } from "../contexts/ToastContext";
import { formatCurrency } from "../utils/currency";
import { resolveImagePath } from "../utils/image";

const INITIAL_FORM = {
  name: "",
  description: "",
  price: 0,
  image: "images/logo.jpeg",
  imageFile: null,
  imagePreview: "",
  category: "",
  spicyLevel: 1,
  weight: "",
  stock: 0,
  status: "active",
};

const PRODUCT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

const PRODUCT_STATUS_LABELS = PRODUCT_STATUS_OPTIONS.reduce((labels, option) => ({
  ...labels,
  [option.value]: option.label,
}), {});

function getProductStatusLabel(status) {
  return PRODUCT_STATUS_LABELS[status] ?? "Active";
}

function revokePreviewUrl(previewUrl) {
  if (previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(previewUrl);
  }
}

function AdminProductsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingProductId, setEditingProductId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const editId = searchParams.get("edit");

  useEffect(() => () => revokePreviewUrl(form.imagePreview), [form.imagePreview]);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const response = await productService.listAdmin();
        if (isMounted) {
          setProducts(response.products);
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
    if (!editId || products.length === 0) {
      return;
    }

    const productToEdit = products.find((product) => String(product.id) === editId);

    if (!productToEdit) {
      return;
    }

    setFormFromProduct(productToEdit);
  }, [editId, products]);

  const formTitle = useMemo(
    () => (editingProductId ? "Edit Produk" : "Tambah Produk Baru"),
    [editingProductId],
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    if (!normalizedSearch) {
      return products;
    }

    return products.filter((product) =>
      [product.name, product.category, product.description, getProductStatusLabel(product.status)]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [products, searchQuery]);

  const catalogStats = useMemo(
    () => ({
      totalProducts: products.length,
      totalStock: products.reduce((total, product) => total + product.stock, 0),
      activeProducts: products.filter((product) => product.status === "active").length,
      inactiveProducts: products.filter((product) => product.status === "inactive").length,
      lowStockProducts: products.filter((product) => product.status === "active" && product.stock <= 10).length,
    }),
    [products],
  );

  const previewImageSource = form.imagePreview || form.image || "images/logo.jpeg";

  function updateField(event) {
    const { name, value } = event.target;

    setForm((currentForm) => {
      const nextForm = {
        ...currentForm,
        [name]: value,
      };

      if (name === "image" && !currentForm.imageFile) {
        nextForm.imagePreview = value;
      }

      return nextForm;
    });
  }

  function handleSearchChange(event) {
    setSearchQuery(event.target.value);
  }

  function handleImageFileChange(event) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(selectedFile);

    setForm((currentForm) => ({
      ...currentForm,
      imageFile: selectedFile,
      imagePreview: nextPreviewUrl,
    }));

    event.target.value = "";
  }

  function clearSelectedImageFile() {
    setForm((currentForm) => ({
      ...currentForm,
      imageFile: null,
      imagePreview: currentForm.image || "images/logo.jpeg",
    }));
  }

  function resetForm() {
    setEditingProductId(null);
    setForm(INITIAL_FORM);
    setSearchParams({});
  }

  function setFormFromProduct(product) {
    setEditingProductId(product.id);
    setForm({
      name: product.name,
      description: product.description,
      price: product.price,
      image: product.image,
      imageFile: null,
      imagePreview: product.image,
      category: product.category,
      spicyLevel: product.spicyLevel,
      weight: product.weight,
      stock: product.stock,
      status: product.status ?? "active",
    });
  }

  function startEditing(product) {
    setSearchParams({ edit: String(product.id) });
    setFormFromProduct(product);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function reloadProducts(nextEditingId = editingProductId) {
    const response = await productService.listAdmin();
    setProducts(response.products);

    if (!nextEditingId) {
      return response.products;
    }

    const freshProduct = response.products.find((product) => product.id === nextEditingId);

    if (freshProduct) {
      setFormFromProduct(freshProduct);
    }

    return response.products;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);

    try {
      if (editingProductId) {
        const updatedProduct = await productService.update(editingProductId, form);
        console.info("Product update response:", updatedProduct);
        const shouldKeepEditing = updatedProduct.status !== "archived";
        const refreshedProducts = await reloadProducts(shouldKeepEditing ? updatedProduct.id : null);
        const persistedProduct = refreshedProducts.find((product) => product.id === updatedProduct.id);

        if (shouldKeepEditing && !persistedProduct) {
          throw new Error("Produk gagal dimuat ulang dari daftar admin setelah update.");
        }

        if (shouldKeepEditing) {
          showToast("Produk berhasil diperbarui.");
        } else {
          showToast("Produk berhasil diarsipkan dan disembunyikan dari katalog customer.");
          resetForm();
        }
      } else {
        const createdProduct = await productService.create(form);
        console.info("Product create response:", createdProduct);
        const shouldKeepEditing = createdProduct.status !== "archived";
        const refreshedProducts = await reloadProducts(shouldKeepEditing ? createdProduct.id : null);
        const persistedProduct = refreshedProducts.find((product) => product.id === createdProduct.id);

        if (shouldKeepEditing && !persistedProduct) {
          throw new Error("Produk belum muncul di daftar admin setelah dibuat.");
        }

        if (shouldKeepEditing) {
          showToast("Produk berhasil ditambahkan.");
          setSearchParams({ edit: String(createdProduct.id) });
        } else {
          showToast("Produk berhasil ditambahkan sebagai archived.");
          resetForm();
        }
      }
    } catch (error) {
      console.error("Product submit failed:", error);
      showToast(error.message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(productId) {
    if (!window.confirm("Arsipkan produk ini? Produk akan hilang dari katalog customer, tetapi histori order tetap aman.")) {
      return;
    }

    setDeleteTargetId(productId);

    try {
      const response = await productService.destroy(productId);
      console.info("Product archive response:", response);
      showToast(response?.message ?? "Produk berhasil diarsipkan.");
      await reloadProducts(null);

      if (editingProductId === productId) {
        resetForm();
      }
    } catch (error) {
      console.error("Product delete failed:", error);
      showToast(error.message, "error");
    } finally {
      setDeleteTargetId(null);
    }
  }

  return (
    <section className="page-section">
      <div className="container">
        <div className="admin-page-header">
          <div>
            <h1 className="page-title admin-page-title">Dashboard Produk Admin</h1>
            <p className="page-subtitle admin-page-subtitle">
              Kelola katalog, ganti foto produk, dan rapikan detail jualan dari satu panel admin.
            </p>
          </div>
          <div className="admin-page-actions">
            <Button type="button" variant="secondary" className="ui-ripple" onClick={() => navigate("/admin/orders")}>
              Lihat Pesanan
            </Button>
            <Button type="button" variant="secondary" className="ui-ripple" onClick={() => navigate("/products")}>
              Lihat Katalog
            </Button>
            <Button type="button" className="ui-ripple" onClick={resetForm}>
              Produk Baru
            </Button>
          </div>
        </div>

        <div className="grid items-start gap-6 min-[993px]:grid-cols-[minmax(320px,380px)_1fr]">
          <form
            className="admin-form-card admin-product-form-card sticky top-[120px] rounded-2xl border border-brand-border bg-white p-8 shadow-larisdy-sm"
            onSubmit={handleSubmit}
          >
            <div className="admin-form-intro">
              <div>
                <h2>{formTitle}</h2>
                <p className="helper-text">Isi data produk, stok, dan foto.</p>
              </div>
              <span className="role-chip">{editingProductId ? "mode edit" : "mode tambah"}</span>
            </div>

            <div className="admin-simple-upload">
              <div className="admin-simple-upload-preview">
                <img
                  src={resolveImagePath(previewImageSource)}
                  alt={form.name || "Preview produk"}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <label htmlFor="adminProductImageFile" className="tw-label">Foto Produk</label>
                <input
                  id="adminProductImageFile"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="tw-input"
                  onChange={handleImageFileChange}
                />
                <p className="helper-text mt-2 truncate">
                  {form.imageFile ? form.imageFile.name : "Opsional, JPG/PNG/WEBP."}
                </p>
                {(form.imageFile || editingProductId) ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="ui-ripple mt-3"
                    onClick={clearSelectedImageFile}
                  >
                    Reset Foto
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="adminProductImage">Path Gambar</label>
              <input
                id="adminProductImage"
                type="text"
                name="image"
                placeholder="images/logo.jpeg"
                value={form.image}
                onChange={updateField}
              />
            </div>

            <div className="form-group">
              <label htmlFor="adminProductName">Nama Produk</label>
              <input
                id="adminProductName"
                type="text"
                name="name"
                placeholder="Contoh: Sambal Roa Premium"
                value={form.name}
                onChange={updateField}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="adminProductDescription">Deskripsi</label>
              <textarea
                id="adminProductDescription"
                name="description"
                placeholder="Tulis keunggulan, rasa, dan kegunaan produk..."
                value={form.description}
                onChange={updateField}
                required
              />
            </div>

            <div className="admin-form-row">
              <div className="form-group">
                <label htmlFor="adminProductPrice">Harga</label>
                <input
                  id="adminProductPrice"
                  type="number"
                  min="0"
                  name="price"
                  value={form.price}
                  onChange={updateField}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="adminProductStock">Stok</label>
                <input
                  id="adminProductStock"
                  type="number"
                  min="0"
                  name="stock"
                  value={form.stock}
                  onChange={updateField}
                  required
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="form-group">
                <label htmlFor="adminProductCategory">Kategori</label>
                <input
                  id="adminProductCategory"
                  type="text"
                  name="category"
                  value={form.category}
                  onChange={updateField}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="adminProductWeight">Berat</label>
                <input
                  id="adminProductWeight"
                  type="text"
                  name="weight"
                  placeholder="180g"
                  value={form.weight}
                  onChange={updateField}
                  required
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="form-group">
                <label htmlFor="adminProductSpicyLevel">Level Pedas</label>
                <input
                  id="adminProductSpicyLevel"
                  type="number"
                  min="1"
                  max="5"
                  name="spicyLevel"
                  value={form.spicyLevel}
                  onChange={updateField}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="adminProductStatus">Status Produk</label>
                <select
                  id="adminProductStatus"
                  name="status"
                  value={form.status}
                  onChange={updateField}
                  required
                >
                  {PRODUCT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="admin-form-mini-summary">
              <span>{formatCurrency(Number(form.price || 0))}</span>
              <span>Stok {Number(form.stock || 0)}</span>
              <span>{getProductStatusLabel(form.status)}</span>
            </div>

            <div className="admin-form-actions">
              <Button type="submit" className="ui-ripple" disabled={isSaving}>
                {isSaving ? "Menyimpan..." : editingProductId ? "Update Produk" : "Simpan Produk"}
              </Button>
              <Button type="button" variant="secondary" className="ui-ripple" onClick={resetForm}>
                Reset Form
              </Button>
            </div>
          </form>

          <div className="admin-list-panel admin-product-catalog-panel rounded-2xl border border-brand-border bg-white p-8 shadow-larisdy-sm">
            <div className="admin-list-toolbar">
              <div>
                <h2>Katalog Produk</h2>
                <p className="helper-text">Daftar produk yang tersedia di admin.</p>
              </div>
              <div className="admin-search-box">
                <label htmlFor="adminProductSearch" className="admin-search-label">
                  Cari Produk
                </label>
                <input
                  id="adminProductSearch"
                  type="search"
                  className="tw-input"
                  placeholder="Cari nama, kategori, atau deskripsi..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </div>
            </div>

            <div className="admin-summary-grid mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <article className="admin-summary-card rounded-2xl border border-brand-border bg-brand-cream p-5 shadow-larisdy-sm">
                <span className="text-sm text-brand-muted">Total Produk</span>
                <strong className="block text-xl">{catalogStats.totalProducts}</strong>
              </article>
              <article className="admin-summary-card rounded-2xl border border-brand-border bg-brand-cream p-5 shadow-larisdy-sm">
                <span className="text-sm text-brand-muted">Active</span>
                <strong className="block text-xl">{catalogStats.activeProducts}</strong>
              </article>
              <article className="admin-summary-card rounded-2xl border border-brand-border bg-brand-cream p-5 shadow-larisdy-sm">
                <span className="text-sm text-brand-muted">Inactive</span>
                <strong className="block text-xl">{catalogStats.inactiveProducts}</strong>
              </article>
              <article className="admin-summary-card rounded-2xl border border-brand-border bg-brand-cream p-5 shadow-larisdy-sm">
                <span className="text-sm text-brand-muted">Total Stok</span>
                <strong className="block text-xl">{catalogStats.totalStock}</strong>
              </article>
              <article className="admin-summary-card rounded-2xl border border-brand-border bg-brand-cream p-5 shadow-larisdy-sm">
                <span className="text-sm text-brand-muted">Stok Menipis</span>
                <strong className="block text-xl">{catalogStats.lowStockProducts}</strong>
              </article>
            </div>

            {isLoading ? (
              <StatusCard>
                <p>Memuat daftar produk...</p>
              </StatusCard>
            ) : filteredProducts.length === 0 ? (
              <StatusCard>
                <p>Tidak ada produk yang cocok dengan pencarian Anda.</p>
              </StatusCard>
            ) : (
              <div className="admin-product-list grid gap-5">
                {filteredProducts.map((product) => (
                  <article
                    key={product.id}
                    className="admin-product-card grid gap-5 rounded-2xl border border-brand-border bg-white p-5 shadow-larisdy-sm transition duration-300 hover:shadow-larisdy md:grid-cols-[180px_1fr]"
                  >
                    <div className="admin-product-image-shell overflow-hidden rounded-2xl bg-brand-cream">
                      <img
                        src={resolveImagePath(product.image)}
                        alt={product.name}
                        className="admin-product-image h-full min-h-[180px] w-full object-cover"
                      />
                    </div>

                    <div className="admin-product-content min-w-0">
                      <div className="admin-product-top flex flex-wrap justify-between gap-4">
                        <div>
                          <p className="mb-4 text-sm font-medium uppercase text-brand-muted">{product.category}</p>
                          <h3 className="text-3xl">{product.name}</h3>
                        </div>
                        <div className="admin-product-badges flex flex-wrap items-center gap-2 md:justify-end">
                          <span className={`status-chip ${product.status}`}>
                            {getProductStatusLabel(product.status)}
                          </span>
                          <span className="role-chip ml-0">
                            {product.stock > 0 ? `stok ${product.stock}` : "habis"}
                          </span>
                        </div>
                      </div>

                      <p className="admin-product-description my-4 leading-7 text-brand-muted">{product.description}</p>

                      <div className="admin-product-metrics mb-5 grid gap-3 sm:grid-cols-3">
                        <div className="admin-product-metric rounded-xl bg-brand-cream/80 px-4 py-3">
                          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-brand-muted">Harga</span>
                          <strong className="text-base font-extrabold text-brand-black">{formatCurrency(product.price)}</strong>
                        </div>
                        <div className="admin-product-metric rounded-xl bg-brand-cream/80 px-4 py-3">
                          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-brand-muted">Level Pedas</span>
                          <strong className="text-base font-extrabold text-brand-black">{product.spicyLevel}/5</strong>
                        </div>
                        <div className="admin-product-metric rounded-xl bg-brand-cream/80 px-4 py-3">
                          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-brand-muted">Berat</span>
                          <strong className="text-base font-extrabold text-brand-black">{product.weight}</strong>
                        </div>
                      </div>

                      <div className="admin-product-actions flex flex-wrap gap-3">
                        <Button
                          type="button"
                          variant="secondary"
                          className="ui-ripple min-h-[46px] min-w-[114px] px-5"
                          onClick={() => startEditing(product)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          className="ui-ripple min-h-[46px] min-w-[114px] px-5"
                          onClick={() => handleDelete(product.id)}
                          disabled={deleteTargetId === product.id || product.status === "archived"}
                        >
                          {product.status === "archived"
                            ? "Terarsip"
                            : deleteTargetId === product.id
                              ? "Mengarsipkan..."
                              : "Hapus"}
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AdminProductsPage;
