import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { useToast } from "../contexts/ToastContext";
import { orderService } from "../services/orderService";
import { formatCurrency } from "../utils/currency";
import { formatOrderDate } from "../utils/date";
import { resolveImagePath } from "../utils/image";
import {
  getOrderPaymentProof,
  getOrderStatusClassName,
  getOrderStatusLabel,
  getPaymentVerificationStatus,
  getPaymentVerificationStatusClassName,
  getPaymentVerificationStatusLabel,
} from "../utils/orderStatus";
import { getShippingCourierLabel } from "../utils/shipping";

const PAYMENT_PROOF_MAX_SIZE = 5 * 1024 * 1024;
const PAYMENT_PROOF_TYPES = ["image/jpeg", "image/png", "image/webp"];

const PAYMENT_METHOD_LABELS = {
  qris_manual: "QRIS Pribadi",
  bank_transfer_bca: "Transfer Bank BCA",
};

function getQrisInstruction(order) {
  const payload = order?.payment_payload ?? {};

  return {
    image: payload.qris_image ?? "images/qris.jpeg",
    name: payload.payment_name ?? "QRIS Larisdy",
    note: payload.payment_note ?? "Bayar sesuai total pesanan, lalu tunggu verifikasi admin.",
  };
}

function getBcaTransferInstruction(order) {
  const payload = order?.payment_payload ?? {};

  return {
    bankName: payload.bank_name ?? "BCA",
    accountNumber: payload.account_number ?? "",
    accountName: payload.account_name ?? "Larisdy",
    note: payload.payment_note ?? "Bayar sesuai total pesanan sebelum batas waktu berakhir.",
  };
}

function getPaymentMethodLabel(order) {
  if (order?.payment_method === "bank_transfer_bca") {
    return "Transfer Bank BCA";
  }

  return PAYMENT_METHOD_LABELS[order?.payment_method] ?? order?.payment_method ?? "-";
}

function formatRemainingPaymentTime(order) {
  const seconds = Number(order?.payment_deadline_seconds_remaining ?? 0);

  if (!order?.payment_expires_at) {
    return null;
  }

  if (order.payment_deadline_passed || order.payment_status === "expired" || seconds <= 0) {
    return "Batas pembayaran sudah lewat";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${hours} jam ${minutes} menit tersisa`;
}

function PaymentStatusPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [proofError, setProofError] = useState("");

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const orderId = Number(searchParams.get("order"));
  const qrisInstruction = useMemo(() => getQrisInstruction(order), [order]);
  const bcaTransferInstruction = useMemo(() => getBcaTransferInstruction(order), [order]);
  const paymentMethodLabel = useMemo(() => getPaymentMethodLabel(order), [order]);
  const paymentProof = useMemo(() => getOrderPaymentProof(order), [order]);
  const paymentVerificationStatus = useMemo(() => getPaymentVerificationStatus(order), [order]);
  const isProofPending = paymentProof?.verification_status === "pending";
  const canUploadPaymentProof = ["qris_manual", "bank_transfer_bca"].includes(order?.payment_method)
    && order?.status === "pending"
    && !["paid", "expired"].includes(order?.payment_status);
  const remainingPaymentTime = useMemo(() => formatRemainingPaymentTime(order), [order]);

  async function loadOrder(quiet = false) {
    if (!Number.isFinite(orderId) || orderId <= 0) {
      setIsLoading(false);
      return;
    }

    if (!quiet) {
      setIsLoading(true);
    }

    try {
      const response = await orderService.show(orderId);
      setOrder(response);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      if (!quiet) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  useEffect(() => () => {
    if (proofPreview) {
      URL.revokeObjectURL(proofPreview);
    }
  }, [proofPreview]);

  function resetProofForm() {
    if (proofPreview) {
      URL.revokeObjectURL(proofPreview);
    }

    setProofFile(null);
    setProofPreview("");
    setProofNote("");
    setProofError("");
  }

  function closeProofModal() {
    if (isUploadingProof) {
      return;
    }

    setIsProofModalOpen(false);
    resetProofForm();
  }

  function handleProofFileChange(event) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setProofFile(null);
      setProofPreview("");
      return;
    }

    const hasAllowedType = PAYMENT_PROOF_TYPES.includes(file.type)
      || /\.(jpe?g|png|webp)$/i.test(file.name);

    if (!hasAllowedType) {
      setProofError("File harus berupa gambar JPG, PNG, atau WebP.");
      setProofFile(null);
      setProofPreview("");
      event.target.value = "";
      return;
    }

    if (file.size > PAYMENT_PROOF_MAX_SIZE) {
      setProofError("Ukuran gambar maksimal 5MB.");
      setProofFile(null);
      setProofPreview("");
      event.target.value = "";
      return;
    }

    setProofError("");
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  }

  async function handleSubmitPaymentProof(event) {
    event.preventDefault();

    if (!order || !proofFile) {
      setProofError("Pilih gambar bukti pembayaran terlebih dahulu.");
      return;
    }

    const formData = new FormData();
    formData.append("proof", proofFile);

    if (proofNote.trim()) {
      formData.append("note", proofNote.trim());
    }

    setIsUploadingProof(true);
    setProofError("");

    try {
      const updatedOrder = await orderService.uploadPaymentProof(order.id, formData);
      setOrder(updatedOrder);
      setIsProofModalOpen(false);
      resetProofForm();
      showToast("Bukti pembayaran terkirim. Admin akan melakukan verifikasi.");
    } catch (error) {
      setProofError(error.message ?? "Bukti pembayaran gagal dikirim.");
      showToast(error.message ?? "Bukti pembayaran gagal dikirim.", "error");
    } finally {
      setIsUploadingProof(false);
    }
  }

  async function handleCheckStatus() {
    if (!order) {
      return;
    }

    setIsSyncing(true);

    try {
      await loadOrder(true);
      showToast("Status pesanan berhasil dimuat ulang.");
    } catch (error) {
      showToast(error.message ?? "Status pembayaran belum bisa dicek. Coba beberapa saat lagi.", "error");
      await loadOrder(true);
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleCopyBcaAccount() {
    if (!bcaTransferInstruction.accountNumber) {
      return;
    }

    try {
      await navigator.clipboard.writeText(bcaTransferInstruction.accountNumber);
      showToast("Nomor rekening BCA disalin.");
    } catch (error) {
      showToast("Nomor rekening belum bisa disalin otomatis.", "error");
    }
  }

  async function handleCompleteOrder() {
    if (!order) {
      return;
    }

    const isConfirmed = window.confirm(
      "Selesaikan pesanan ini? Pastikan produk sudah diterima dalam kondisi baik.",
    );

    if (!isConfirmed) {
      return;
    }

    setIsCompleting(true);

    try {
      const updatedOrder = await orderService.complete(order.id);
      setOrder(updatedOrder);
      showToast("Pesanan telah diselesaikan.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setIsCompleting(false);
    }
  }

  if (!Number.isFinite(orderId) || orderId <= 0) {
    return (
      <section className="page-section">
        <div className="container">
          <div className="mx-auto my-8 max-w-[760px] rounded-2xl border border-brand-border bg-white p-8 text-center shadow-larisdy-sm">
            <h2>Link pembayaran tidak valid</h2>
            <p>Order tidak ditemukan dari parameter URL.</p>
          </div>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="page-section">
        <div className="container">
          <div className="mx-auto my-8 max-w-[760px] rounded-2xl border border-brand-border bg-white p-8 text-center shadow-larisdy-sm">
            <p>Memuat status pembayaran terbaru...</p>
          </div>
        </div>
      </section>
    );
  }

  if (!order) {
    return (
      <section className="page-section">
        <div className="container">
          <div className="mx-auto my-8 max-w-[760px] rounded-2xl border border-brand-border bg-white p-8 text-center shadow-larisdy-sm">
            <p>Pesanan tidak ditemukan.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
    <section className="page-section">
      <div className="container">
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-[18px] border border-brand-border bg-white p-8 shadow-larisdy-sm" data-animate>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-copper">Status Pembayaran</p>
            <h1 className="mb-4 text-3xl font-bold">{order.code}</h1>
            <div className="flex flex-wrap gap-2">
              <span className={getOrderStatusClassName(order.status)}>{getOrderStatusLabel(order.status)}</span>
              <span className={getPaymentVerificationStatusClassName(paymentVerificationStatus)}>
                {getPaymentVerificationStatusLabel(paymentVerificationStatus)}
              </span>
            </div>

            <div className="mt-6 grid gap-2 text-brand-muted">
              <p>Total Pembayaran: {formatCurrency(order.grand_total)}</p>
              <p>Metode Bayar: {paymentMethodLabel}</p>
              <p>Kurir: {getShippingCourierLabel(order.shipping_courier)}</p>
              <p>Verifikasi: Manual Admin</p>
              <p>Status Pembayaran: {order.payment_status ?? "pending"}</p>
              {order.payment_expires_at ? (
                <p>Batas Bayar: {formatOrderDate(order.payment_expires_at)}</p>
              ) : null}
              {remainingPaymentTime ? <p>Sisa Waktu: {remainingPaymentTime}</p> : null}
              <p>Nomor Resi: {order.tracking_number ?? "Belum ada"}</p>
            </div>

            {paymentProof ? (
              <div className="mt-6 rounded-xl border border-brand-border bg-brand-cream p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-brand-copper">
                  Bukti Pembayaran
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  {paymentProof.file_url ? (
                    <img
                      src={resolveImagePath(paymentProof.file_url)}
                      alt="Bukti pembayaran"
                      className="h-24 w-24 rounded-lg border border-brand-border bg-white object-cover"
                    />
                  ) : (
                    <div className="grid h-24 w-24 place-items-center rounded-lg border border-dashed border-brand-border bg-white px-3 text-center text-xs font-semibold text-brand-muted">
                      File tidak tersedia
                    </div>
                  )}
                  <div className="grid gap-1 text-sm text-brand-muted">
                    <strong className="text-brand-black">
                      {paymentProof.verification_status === "pending"
                        ? "Menunggu Verifikasi Admin"
                        : paymentProof.verification_status === "verified"
                          ? "Bukti terverifikasi"
                          : "Bukti sebelumnya ditolak"}
                    </strong>
                    {paymentProof.note ? <span>Catatan: {paymentProof.note}</span> : null}
                    {paymentProof.rejection_note ? <span>Alasan: {paymentProof.rejection_note}</span> : null}
                  </div>
                </div>
              </div>
            ) : null}

            {order.status === "pending" && order.payment_method === "qris_manual" ? (
              <div className="mt-6 grid gap-3 border-t border-brand-border pt-5">
                <p className="mb-0 text-xs font-bold uppercase tracking-[0.12em] text-brand-copper">Instruksi QRIS</p>
                <div className="grid place-items-center rounded-xl border border-brand-border bg-white p-4">
                  <img
                    src={resolveImagePath(qrisInstruction.image)}
                    alt={qrisInstruction.name}
                    className="qris-payment-image aspect-square w-full max-w-[320px] object-contain"
                  />
                </div>
                <div className="flex items-center justify-between gap-4 text-brand-muted">
                  <span>Total Bayar</span>
                  <strong className="text-right text-brand-black">{formatCurrency(order.grand_total)}</strong>
                </div>
                <div className="flex items-center justify-between gap-4 text-brand-muted">
                  <span>Kode Order</span>
                  <strong className="text-right text-brand-black">{order.code}</strong>
                </div>
                <p className="text-sm text-brand-muted">{qrisInstruction.note}</p>
                {order.payment_expires_at ? (
                  <p className="rounded-lg bg-brand-black px-4 py-3 text-sm font-semibold text-brand-gold">
                    Batas pembayaran 24 jam: {formatOrderDate(order.payment_expires_at)}
                  </p>
                ) : null}
              </div>
            ) : null}

            {order.status === "pending" && order.payment_method === "bank_transfer_bca" ? (
              <div className="mt-6 grid gap-4 border-t border-brand-border pt-5">
                <p className="mb-0 text-xs font-bold uppercase tracking-[0.12em] text-brand-copper">
                  Instruksi Transfer BCA
                </p>

                <div className="rounded-xl border border-brand-border bg-brand-cream p-5">
                  <p className="text-sm text-brand-muted">Bank Tujuan</p>
                  <strong className="mt-1 block text-xl text-brand-black">{bcaTransferInstruction.bankName}</strong>
                </div>

                <div className="rounded-xl border border-brand-border bg-white p-5">
                  <p className="text-sm text-brand-muted">Nomor Rekening</p>
                  {bcaTransferInstruction.accountNumber ? (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                      <strong className="bca-account-number text-2xl tracking-wide text-brand-black">
                        {bcaTransferInstruction.accountNumber}
                      </strong>
                      <Button type="button" variant="secondary" className="ui-ripple" onClick={handleCopyBcaAccount}>
                        Salin
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-red-700">
                      Nomor rekening BCA belum diatur oleh admin.
                    </p>
                  )}
                  <p className="mt-3 text-sm text-brand-muted">Atas nama {bcaTransferInstruction.accountName}</p>
                </div>

                <div className="flex items-center justify-between gap-4 text-brand-muted">
                  <span>Total Bayar</span>
                  <strong className="text-right text-brand-black">{formatCurrency(order.grand_total)}</strong>
                </div>
                <div className="flex items-center justify-between gap-4 text-brand-muted">
                  <span>Kode Order</span>
                  <strong className="text-right text-brand-black">{order.code}</strong>
                </div>
                <p className="text-sm text-brand-muted">{bcaTransferInstruction.note}</p>
                {order.payment_expires_at ? (
                  <p className="rounded-lg bg-brand-black px-4 py-3 text-sm font-semibold text-brand-gold">
                    Batas pembayaran 24 jam: {formatOrderDate(order.payment_expires_at)}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3 border-t border-brand-border pt-5">
              {canUploadPaymentProof ? (
                <Button
                  type="button"
                  className="ui-ripple"
                  onClick={() => setIsProofModalOpen(true)}
                  disabled={isProofPending}
                >
                  {isProofPending ? "Bukti Pembayaran Terkirim" : "Saya Sudah Bayar"}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                className="ui-ripple"
                onClick={handleCheckStatus}
                disabled={isSyncing}
              >
                {isSyncing ? "Mengecek..." : "Cek Status Pembayaran"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="ui-ripple"
                onClick={() => navigate("/orders")}
              >
                Buka Pesanan Saya
              </Button>
              {order.status === "shipped" ? (
                <Button
                  type="button"
                  className="ui-ripple"
                  onClick={handleCompleteOrder}
                  disabled={isCompleting}
                >
                  {isCompleting ? "Menyelesaikan..." : "Selesaikan Pesanan"}
                </Button>
              ) : null}
            </div>
          </article>

          <article className="rounded-[18px] border border-brand-border bg-white p-8 shadow-larisdy-sm" data-animate>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-copper">Ringkasan Pesanan</p>
            <h2 className="text-2xl font-bold">Produk dalam Pesanan</h2>
            <div className="mt-5 grid gap-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl bg-brand-cream p-4">
                  <div>
                    <strong>{item.product?.name ?? "Produk"}</strong>
                    <p className="text-sm text-brand-muted">
                      {item.quantity} x {formatCurrency(item.price)}
                    </p>
                  </div>
                  <span className="font-bold">{formatCurrency(item.line_total)}</span>
                </div>
              ))}
            </div>

            <div className="my-4 border-t-2 border-brand-border pt-4">
              <div className="mb-5 flex justify-between gap-4 border-b border-brand-border pb-5 text-brand-muted">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="mb-5 flex justify-between gap-4 border-b border-brand-border pb-5 text-brand-muted">
                <span>Ongkos Kirim</span>
                <span>{formatCurrency(order.shipping_cost)}</span>
              </div>
              <div className="mb-5 flex justify-between gap-4 border-b border-brand-border pb-5 text-brand-muted">
                <span>Kurir</span>
                <span>{getShippingCourierLabel(order.shipping_courier)}</span>
              </div>
              <div className="mt-4 flex justify-between gap-4 border-t-2 border-brand-border pt-6 text-2xl font-bold text-brand-black">
                <span>Total</span>
                <span>{formatCurrency(order.grand_total)}</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
    {isProofModalOpen ? (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
        <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-larisdy">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-brand-copper">
                Bukti Pembayaran
              </p>
              <h2 className="text-2xl font-bold text-brand-black">Saya Sudah Bayar</h2>
            </div>
            <button
              type="button"
              className="rounded-lg border border-brand-border px-3 py-2 text-sm font-semibold text-brand-muted transition hover:border-brand-gold hover:text-brand-black"
              onClick={closeProofModal}
              disabled={isUploadingProof}
            >
              Tutup
            </button>
          </div>

          <form className="grid gap-4" onSubmit={handleSubmitPaymentProof}>
            <label className="grid gap-2 text-sm font-semibold text-brand-black">
              Upload Gambar
              <input
                type="file"
                className="tw-input"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleProofFileChange}
                disabled={isUploadingProof}
              />
            </label>

            {proofPreview ? (
              <div className="rounded-xl border border-brand-border bg-brand-cream p-3">
                <img
                  src={proofPreview}
                  alt="Preview bukti pembayaran"
                  className="max-h-72 w-full rounded-lg bg-white object-contain"
                />
              </div>
            ) : null}

            <label className="grid gap-2 text-sm font-semibold text-brand-black">
              Catatan
              <textarea
                className="tw-input min-h-28 resize-y"
                value={proofNote}
                onChange={(event) => setProofNote(event.target.value)}
                placeholder="Opsional"
                maxLength={500}
                disabled={isUploadingProof}
              />
            </label>

            {proofError ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{proofError}</p>
            ) : null}

            <div className="flex flex-wrap justify-end gap-3 border-t border-brand-border pt-4">
              <Button type="button" variant="secondary" onClick={closeProofModal} disabled={isUploadingProof}>
                Batal
              </Button>
              <Button type="submit" className="ui-ripple" disabled={isUploadingProof}>
                {isUploadingProof ? "Mengirim..." : "Kirim Bukti"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    ) : null}
    </>
  );
}

export default PaymentStatusPage;
