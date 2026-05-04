import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CheckoutSummary from "../components/checkout/CheckoutSummary";
import EmptyState from "../components/common/EmptyState";
import Button from "../components/ui/Button";
import FormInput from "../components/ui/FormInput";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useToast } from "../contexts/ToastContext";
import { orderService } from "../services/orderService";
import { formatCoordinates, getGoogleMapsEmbedUrl, getGoogleMapsUrl } from "../utils/maps";
import { getShippingCourierLabel, SHIPPING_COURIER_OPTIONS } from "../utils/shipping";

function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, shipping, total, clearCart } = useCart();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [shippingLocation, setShippingLocation] = useState(null);
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    shipping_address: "",
    shipping_courier: "jne",
    notes: "",
    payment_method: "qris_manual",
  });
  const isBcaTransferPayment = form.payment_method === "bank_transfer_bca";

  useEffect(() => {
    setForm((currentForm) => ({
      ...currentForm,
      customer_name: user?.name ?? "",
      customer_email: user?.email ?? "",
      customer_phone: user?.phone ?? "",
      shipping_address: user?.address ?? "",
    }));
  }, [user]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function handleUseCurrentLocation() {
    if (!("geolocation" in navigator)) {
      const message = "Browser ini belum mendukung fitur lokasi.";
      setLocationError(message);
      showToast(message, "error");
      return;
    }

    setIsLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: Number(position.coords.latitude.toFixed(7)),
          longitude: Number(position.coords.longitude.toFixed(7)),
        };

        setShippingLocation(nextLocation);
        setIsLocating(false);
        showToast("Titik pengiriman berhasil ditambahkan.");
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? "Izin lokasi ditolak. Aktifkan izin lokasi browser lalu coba lagi."
          : "Lokasi belum bisa diambil. Pastikan GPS aktif lalu coba lagi.";

        setLocationError(message);
        setIsLocating(false);
        showToast(message, "error");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 15000,
      },
    );
  }

  function clearShippingLocation() {
    setShippingLocation(null);
    setLocationError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (items.length === 0) {
      showToast("Keranjang masih kosong.", "error");
      return;
    }

    setIsSubmitting(true);
    let createdOrder = null;

    try {
      createdOrder = await orderService.checkout({
        ...form,
        ...(shippingLocation ? {
          shipping_latitude: shippingLocation.latitude,
          shipping_longitude: shippingLocation.longitude,
        } : {}),
        payment_method: form.payment_method,
        items: items.map((item) => ({
          product_id: Number(item.id),
          quantity: item.quantity,
        })),
      });

      clearCart();

      showToast(isBcaTransferPayment
        ? "Pesanan berhasil dibuat. Silakan transfer ke rekening BCA lalu upload bukti pembayaran."
        : "Pesanan berhasil dibuat. Silakan bayar lewat QRIS.");
      navigate(`/payment-status?order=${createdOrder.id}`, { replace: true });
      return;
    } catch (error) {
      if (createdOrder?.id) {
        const paymentErrorMessage = error.message ?? "Silakan lanjutkan dari halaman status pembayaran.";

        showToast(
          `Pesanan sudah dibuat, tetapi link pembayaran gagal dibuat. ${paymentErrorMessage}`,
          "error",
        );
        navigate(`/payment-status?order=${createdOrder.id}`, { replace: true });
        return;
      }

      showToast(error.message ?? "Checkout gagal. Periksa data pesanan lalu coba lagi.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <section className="page-section">
        <div className="container">
          <EmptyState
            title="Keranjang Kosong"
            description="Tambahkan produk terlebih dahulu sebelum checkout."
            actionLabel="Lihat Produk"
            onAction={() => navigate("/products")}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="container">
        <div className="mb-8 max-w-3xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-copper">Checkout Aman</p>
          <h1 className="text-left text-4xl font-bold md:text-5xl">Checkout</h1>
          <p className="mt-4 text-left text-lg text-brand-muted">
            Lengkapi alamat, pilih kurir, pilih pembayaran QRIS atau transfer rekening BCA, lalu upload bukti pembayaran.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
            <div>
              <div className="rounded-2xl border border-brand-border bg-white p-8 shadow-larisdy-sm">
                <div className="mb-8 flex items-center gap-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-cream font-bold tracking-wide text-brand-gold">
                    01
                  </div>
                  <h2>Informasi Pengiriman</h2>
                </div>

                <FormInput
                  id="checkoutName"
                  label="Nama Lengkap"
                  type="text"
                  name="customer_name"
                  value={form.customer_name}
                  onChange={updateField}
                  required
                />
                <FormInput
                  id="checkoutEmail"
                  label="Email"
                  type="email"
                  name="customer_email"
                  value={form.customer_email}
                  onChange={updateField}
                  required
                />
                <FormInput
                  id="checkoutPhone"
                  label="Nomor Telepon"
                  type="tel"
                  name="customer_phone"
                  value={form.customer_phone}
                  onChange={updateField}
                  required
                />
                <FormInput
                  id="checkoutAddress"
                  label="Alamat Lengkap"
                  as="textarea"
                  name="shipping_address"
                  value={form.shipping_address}
                  onChange={updateField}
                  required
                />
                <div className="form-group">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <label className="tw-label mb-0">Titik Pengiriman</label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="ui-ripple"
                        disabled={isLocating}
                        onClick={handleUseCurrentLocation}
                      >
                        {isLocating ? "Mengambil Lokasi..." : "Gunakan Lokasi Saya"}
                      </Button>
                      {shippingLocation ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="ui-ripple"
                          onClick={clearShippingLocation}
                        >
                          Hapus Titik
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {shippingLocation ? (
                    <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-cream/70">
                      <iframe
                        title="Titik pengiriman"
                        src={getGoogleMapsEmbedUrl(shippingLocation)}
                        className="h-56 w-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-border bg-white p-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-brand-muted">Koordinat</p>
                          <p className="font-semibold text-brand-black">{formatCoordinates(shippingLocation)}</p>
                        </div>
                        <Button
                          as="a"
                          variant="secondary"
                          className="ui-ripple"
                          href={getGoogleMapsUrl(shippingLocation)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Buka Maps
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-brand-border bg-brand-cream/60 p-4 text-sm text-brand-muted">
                      Tambahkan titik lokasi agar alamat pengiriman lebih presisi.
                    </div>
                  )}

                  {locationError ? (
                    <p className="mt-2 text-sm font-semibold text-red-700">{locationError}</p>
                  ) : null}
                </div>

                <div className="form-group">
                  <label className="tw-label">Kurir Pengiriman</label>
                  <div className="grid gap-4 md:grid-cols-2">
                    {SHIPPING_COURIER_OPTIONS.map((courier) => (
                      <label
                        key={courier.value}
                        className={`cursor-pointer rounded-xl border p-5 transition ${
                          form.shipping_courier === courier.value
                            ? "border-brand-gold bg-brand-cream/80 shadow-larisdy-sm"
                            : "border-brand-border bg-white hover:border-brand-gold/70"
                        }`}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          name="shipping_courier"
                          value={courier.value}
                          checked={form.shipping_courier === courier.value}
                          onChange={updateField}
                        />
                        <span className="block text-xs font-bold uppercase tracking-wide text-brand-copper">
                          Kurir
                        </span>
                        <strong className="mt-2 block text-brand-black">{courier.label}</strong>
                        <p className="mt-2 text-sm leading-7 text-brand-muted">{courier.description}</p>
                      </label>
                    ))}
                  </div>
                </div>

                <FormInput
                  id="checkoutNotes"
                  label="Catatan (Opsional)"
                  as="textarea"
                  name="notes"
                  placeholder="Catatan untuk penjual..."
                  value={form.notes}
                  onChange={updateField}
                />
              </div>

              <div className="mt-6 rounded-2xl border border-brand-border bg-white p-8 shadow-larisdy-sm">
                <div className="mb-8 flex items-center gap-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-cream font-bold tracking-wide text-brand-gold">
                    02
                  </div>
                  <h2>Metode Pembayaran</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label
                    className={`cursor-pointer rounded-xl border p-5 transition ${
                      form.payment_method === "qris_manual"
                        ? "border-brand-gold bg-brand-cream/80 shadow-larisdy-sm"
                        : "border-brand-border bg-white hover:border-brand-gold/70"
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name="payment_method"
                      value="qris_manual"
                      checked={form.payment_method === "qris_manual"}
                      onChange={updateField}
                    />
                    <span className="block text-xs font-bold uppercase tracking-wide text-brand-copper">QRIS</span>
                    <strong className="mt-2 block text-brand-black">QRIS Pribadi Larisdy</strong>
                    <p className="mt-2 text-sm leading-7 text-brand-muted">
                      Scan QRIS pada halaman berikutnya, lalu upload bukti pembayaran untuk diverifikasi admin.
                    </p>
                  </label>

                  <label
                    className={`cursor-pointer rounded-xl border p-5 transition ${
                      isBcaTransferPayment
                        ? "border-brand-gold bg-brand-cream/80 shadow-larisdy-sm"
                        : "border-brand-border bg-white hover:border-brand-gold/70"
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name="payment_method"
                      value="bank_transfer_bca"
                      checked={isBcaTransferPayment}
                      onChange={updateField}
                    />
                    <span className="block text-xs font-bold uppercase tracking-wide text-brand-copper">Transfer Bank</span>
                    <strong className="mt-2 block text-brand-black">Transfer Rekening BCA</strong>
                    <p className="mt-2 text-sm leading-7 text-brand-muted">
                      Transfer ke nomor rekening BCA Larisdy, lalu upload bukti pembayaran untuk diverifikasi admin.
                    </p>
                  </label>
                </div>

                <div className="mt-5 rounded-xl border border-brand-border bg-brand-cream/70 p-4 text-sm leading-7 text-brand-muted">
                  {isBcaTransferPayment
                    ? "Setelah pesanan dibuat, transfer sesuai total pesanan ke rekening BCA yang tampil di halaman status pembayaran."
                    : "Pastikan nominal QRIS sesuai total pesanan agar admin bisa memverifikasi pembayaran lebih cepat."}
                </div>
              </div>
            </div>

            <CheckoutSummary
              items={items}
              subtotal={subtotal}
              shipping={shipping}
              total={total}
              shippingCourierLabel={getShippingCourierLabel(form.shipping_courier)}
              isSubmitting={isSubmitting}
              submitLabel={isBcaTransferPayment ? "Pilih Transfer BCA" : "Lanjut ke QRIS"}
            />
          </div>
        </form>
      </div>
    </section>
  );
}

export default CheckoutPage;
