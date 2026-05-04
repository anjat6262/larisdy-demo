import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProductRating from "../components/products/ProductRating";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useToast } from "../contexts/ToastContext";
import { productService } from "../services/productService";
import { testimonialService } from "../services/testimonialService";
import { formatCurrency } from "../utils/currency";
import { resolveImagePath } from "../utils/image";

const REVIEW_IMAGE_MAX_SIZE = 2 * 1024 * 1024;

function ProductDetailPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const { user, isAuthenticated, isAdmin, isCustomer } = useAuth();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewEligibility, setReviewEligibility] = useState({
    canSubmit: false,
    eligibleOrderId: null,
    message: "Selesaikan pesanan produk ini sebelum menulis review.",
  });
  const [reviewForm, setReviewForm] = useState({
    city: "",
    rating: 5,
    message: "",
    imageFile: null,
  });
  const [reviewPreview, setReviewPreview] = useState("");
  const [isCheckingReviewEligibility, setIsCheckingReviewEligibility] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const reviewSummary = useMemo(() => product?.review_summary ?? {}, [product]);
  const isReviewFormDisabled = !reviewEligibility.canSubmit || isSubmittingReview || isCheckingReviewEligibility;

  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      try {
        const response = await productService.show(productId);

        if (isMounted) {
          setProduct(response);
          setReviews(response.testimonials ?? []);
          setQuantity(1);
        }

        if (isMounted && isAuthenticated && isCustomer) {
          setIsCheckingReviewEligibility(true);
          const eligibility = await testimonialService.getEligibility(productId);
          if (isMounted) {
            setReviewEligibility({
              canSubmit: eligibility.can_submit,
              eligibleOrderId: eligibility.eligible_order_id,
              message: eligibility.message,
            });
          }
        } else if (isMounted) {
          setReviewEligibility({
            canSubmit: false,
            eligibleOrderId: null,
            message: isAuthenticated
              ? "Review produk hanya tersedia untuk akun customer."
              : "Login dan selesaikan pesanan produk ini untuk menulis review.",
          });
        }
      } catch (error) {
        if (isMounted) {
          showToast(error.message, "error");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsCheckingReviewEligibility(false);
        }
      }
    }

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [productId, isAuthenticated, isCustomer, showToast]);

  useEffect(() => () => {
    if (reviewPreview) {
      URL.revokeObjectURL(reviewPreview);
    }
  }, [reviewPreview]);

  if (isLoading) {
    return (
      <section className="page-section">
        <div className="container">
          <div className="mx-auto my-8 max-w-[760px] rounded-2xl border border-brand-border bg-white p-8 text-center shadow-larisdy-sm">
            <p>Memuat detail produk...</p>
          </div>
        </div>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="page-section">
        <div className="container">
          <div className="mx-auto my-8 max-w-[760px] rounded-2xl border border-brand-border bg-white p-8 text-center shadow-larisdy-sm">
            <h2>Produk tidak ditemukan</h2>
            <Button
              type="button"
              className="ui-ripple mt-4"
              onClick={() => navigate("/products")}
            >
              Kembali ke katalog
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const isOutOfStock = Number(product.stock) <= 0;
  const isLowStock = Number(product.stock) > 0 && Number(product.stock) <= 10;
  const spicyLabel = Array.from({ length: 5 }, (_, index) => (
    <span
      key={`detail-spicy-${index}`}
      className={`h-3 w-3 rounded-full border ${
        index < product.spicyLevel
          ? "border-brand-copper bg-brand-copper"
          : "border-brand-copper/40 bg-brand-copper/15"
      }`}
    />
  ));

  function changeQuantity(nextValue) {
    if (isOutOfStock) {
      setQuantity(0);
      return;
    }

    setQuantity((currentQuantity) =>
      Math.max(1, Math.min(product.stock, typeof nextValue === "number" ? nextValue : currentQuantity)),
    );
  }

  function handleAddToCart() {
    if (isOutOfStock) {
      showToast("Stok produk sedang habis.", "error");
      return;
    }

    addItem(product, quantity);
    showToast(`${product.name} ditambahkan ke keranjang.`);
    setQuantity(1);
  }

  function handleBuyNow() {
    if (isOutOfStock) {
      showToast("Stok produk sedang habis.", "error");
      return;
    }

    addItem(product, quantity);
    setQuantity(1);
    navigate("/cart");
  }

  function updateReviewField(event) {
    const { name, value, files } = event.target;

    if (name === "imageFile") {
      const file = files?.[0] ?? null;

      if (reviewPreview) {
        URL.revokeObjectURL(reviewPreview);
      }

      if (file && file.size > REVIEW_IMAGE_MAX_SIZE) {
        showToast("Ukuran foto review maksimal 2MB.", "error");
        setReviewForm((currentForm) => ({ ...currentForm, imageFile: null }));
        setReviewPreview("");
        event.target.value = "";
        return;
      }

      setReviewForm((currentForm) => ({ ...currentForm, imageFile: file }));
      setReviewPreview(file ? URL.createObjectURL(file) : "");
      return;
    }

    setReviewForm((currentForm) => ({
      ...currentForm,
      [name]: name === "rating" ? Number(value) : value,
    }));
  }

  async function refreshProductReviews() {
    const [freshProduct, eligibility] = await Promise.all([
      productService.show(productId),
      isAuthenticated && isCustomer
        ? testimonialService.getEligibility(productId)
        : Promise.resolve(null),
    ]);

    setProduct(freshProduct);
    setReviews(freshProduct.testimonials ?? []);

    if (eligibility) {
      setReviewEligibility({
        canSubmit: eligibility.can_submit,
        eligibleOrderId: eligibility.eligible_order_id,
        message: eligibility.message,
      });
    }
  }

  async function handleReviewSubmit(event) {
    event.preventDefault();

    if (!reviewEligibility.canSubmit || !reviewEligibility.eligibleOrderId) {
      showToast(reviewEligibility.message, "error");
      return;
    }

    setIsSubmittingReview(true);

    try {
      await testimonialService.create({
        ...reviewForm,
        productId,
        orderId: reviewEligibility.eligibleOrderId,
      });
      await refreshProductReviews();
      setReviewForm({
        city: "",
        rating: 5,
        message: "",
        imageFile: null,
      });

      if (reviewPreview) {
        URL.revokeObjectURL(reviewPreview);
      }

      setReviewPreview("");
      showToast("Review produk berhasil dikirim.");
    } catch (error) {
      showToast(error.message ?? "Review produk gagal dikirim.", "error");
    } finally {
      setIsSubmittingReview(false);
    }
  }

  return (
    <section className="page-section">
      <div className="container">
        <Button
          type="button"
          variant="secondary"
          className="ui-ripple"
          onClick={() => navigate("/products")}
        >
          &larr; Kembali
        </Button>

        <div className="my-12 grid items-start gap-10 lg:grid-cols-[minmax(320px,0.9fr)_1fr]">
          <div>
            <img
              src={resolveImagePath(product.image)}
              alt={product.name}
              className="aspect-square w-full rounded-2xl object-cover shadow-larisdy transition duration-300 hover:scale-[1.02]"
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <span className="rounded-xl border border-brand-border bg-white p-3 text-center text-sm text-brand-muted">Produk siap kirim</span>
              <span className="rounded-xl border border-brand-border bg-white p-3 text-center text-sm text-brand-muted">Pembayaran aman</span>
              <span className="rounded-xl border border-brand-border bg-white p-3 text-center text-sm text-brand-muted">Stok real-time</span>
            </div>
          </div>

          <div className="rounded-2xl border border-brand-border bg-white p-8 shadow-larisdy-sm">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge>{product.category}</Badge>
              <Badge tone={isOutOfStock ? "danger" : isLowStock ? "warning" : "success"}>
                {isOutOfStock ? "Stok Habis" : `${product.stock} stok tersedia`}
              </Badge>
            </div>
            <h1 className="mb-4 text-4xl font-bold md:text-5xl">{product.name}</h1>
            <ProductRating summary={reviewSummary} className="mb-6" />

            <div className="mb-6 flex flex-wrap items-center gap-3">
              <strong>Tingkat Pedas:</strong>
              <span className="inline-flex items-center gap-1">{spicyLabel}</span>
              <span>({product.spicyLevel}/5)</span>
            </div>

            <p className="mb-6 text-brand-muted">{product.description}</p>

            <div className="mb-6 grid gap-4 border-y-2 border-brand-border py-6 sm:grid-cols-2">
              <div>
                <p className="text-sm text-brand-muted">Berat</p>
                <p className="font-bold">{product.weight}</p>
              </div>
              <div>
                <p className="text-sm text-brand-muted">Stok Tersedia</p>
                <p className="font-bold">{product.stock} unit</p>
              </div>
            </div>

            <p className="mb-6 text-4xl font-bold text-brand-black">{formatCurrency(product.price)}</p>

            <div className="my-10 flex flex-wrap items-center gap-6">
              <p className="font-semibold">Jumlah</p>
              <button
                type="button"
                className="flex h-12 w-12 items-center justify-center rounded-lg border border-brand-border bg-white text-xl font-bold transition hover:border-brand-black hover:bg-brand-black hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                onClick={() => changeQuantity(quantity - 1)}
                disabled={isOutOfStock || quantity <= 1}
                aria-label="Kurangi jumlah"
              >
                -
              </button>
              <span className="min-w-[50px] text-center text-2xl font-semibold">{quantity}</span>
              <button
                type="button"
                className="flex h-12 w-12 items-center justify-center rounded-lg border border-brand-border bg-white text-xl font-bold transition hover:border-brand-black hover:bg-brand-black hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                onClick={() => changeQuantity(quantity + 1)}
                disabled={isOutOfStock || quantity >= product.stock}
                aria-label="Tambah jumlah"
              >
                +
              </button>
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              {isAdmin ? (
                <Button
                  type="button"
                  className="ui-ripple flex-1"
                  onClick={() => navigate(`/admin/products?edit=${product.id}`)}
                >
                  Edit Sebagai Admin
                </Button>
              ) : (
                <>
                  <Button type="button" variant="secondary" className="ui-ripple flex-1" onClick={handleAddToCart} disabled={isOutOfStock}>
                    {isOutOfStock ? "Tidak Tersedia" : "Tambah ke Keranjang"}
                  </Button>
                  <Button type="button" className="ui-ripple flex-1" onClick={handleBuyNow} disabled={isOutOfStock}>
                    {isOutOfStock ? "Stok Habis" : "Beli Sekarang"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <article className="rounded-2xl border border-brand-border bg-white p-6 shadow-larisdy-sm">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="content-eyebrow">Review Produk</p>
                <h2 className="text-3xl">Ulasan Pembeli</h2>
                <p className="mt-2 text-brand-muted">
                  {reviewSummary.count
                    ? `${reviewSummary.count} review dengan rata-rata rating ${reviewSummary.average_rating}/5.`
                    : "Belum ada review untuk produk ini."}
                </p>
              </div>
            </div>
            {reviews.length === 0 ? (
              <div className="rounded-xl border border-dashed border-brand-border bg-brand-cream p-6 text-center text-brand-muted">
                Review pertama akan muncul setelah customer menyelesaikan pesanan produk ini.
              </div>
            ) : (
              <div className="grid gap-4">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-xl border border-brand-border bg-brand-cream p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <strong>{review.name}</strong>
                        <p className="text-sm text-brand-muted">{review.city ?? "Indonesia"}</p>
                      </div>
                      <span className="rounded-full bg-brand-black px-3 py-1 text-sm font-bold text-brand-gold">
                        Rating {review.rating}/5
                      </span>
                    </div>
                    <p className="mt-3 leading-7 text-brand-muted">{review.message}</p>
                    {review.image_url ? (
                      <img
                        src={review.image_url}
                        alt={`Review ${review.name}`}
                        className="mt-4 h-36 w-36 rounded-lg border border-brand-border bg-white object-cover"
                      />
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </article>

          <form className="rounded-2xl border border-brand-border bg-white p-6 shadow-larisdy-sm" onSubmit={handleReviewSubmit}>
            <p className="content-eyebrow">Tulis Review</p>
            <h2 className="mb-4 text-3xl">Review Produk Ini</h2>
            <div className={`mb-5 rounded-xl border p-4 ${
              reviewEligibility.canSubmit ? "border-green-200 bg-green-50" : "border-brand-border bg-brand-cream"
            }`}>
              <p className="text-sm text-brand-muted">
                {isCheckingReviewEligibility
                  ? "Memeriksa pesanan produk Anda..."
                  : reviewEligibility.message}
              </p>
            </div>

            <fieldset disabled={isReviewFormDisabled} className="grid gap-4">
              <label className="grid gap-2 font-semibold">
                Nama
                <input className="tw-input" value={user?.name ?? ""} readOnly />
              </label>
              <label className="grid gap-2 font-semibold">
                Kota
                <input
                  className="tw-input"
                  name="city"
                  value={reviewForm.city}
                  onChange={updateReviewField}
                  placeholder="Contoh: Bogor"
                />
              </label>
              <label className="grid gap-2 font-semibold">
                Rating
                <select className="tw-input" name="rating" value={reviewForm.rating} onChange={updateReviewField}>
                  <option value="5">5</option>
                  <option value="4">4</option>
                  <option value="3">3</option>
                  <option value="2">2</option>
                  <option value="1">1</option>
                </select>
              </label>
              <label className="grid gap-2 font-semibold">
                Review
                <textarea
                  className="tw-input min-h-32 resize-y"
                  name="message"
                  value={reviewForm.message}
                  onChange={updateReviewField}
                  placeholder="Bagikan pengalaman Anda tentang produk ini"
                  required
                />
              </label>
              <label className="grid gap-2 font-semibold">
                Foto Review
                <input
                  className="tw-input"
                  type="file"
                  name="imageFile"
                  accept="image/*"
                  onChange={updateReviewField}
                />
              </label>
              {reviewPreview ? (
                <img src={reviewPreview} alt="Preview review" className="testimonial-preview-image h-36 w-36 rounded-lg object-cover" />
              ) : null}
              <Button type="submit" className="ui-ripple" disabled={isReviewFormDisabled}>
                {isSubmittingReview ? "Mengirim..." : "Kirim Review"}
              </Button>
            </fieldset>
          </form>
        </section>
      </div>
    </section>
  );
}

export default ProductDetailPage;
