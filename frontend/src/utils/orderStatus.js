const ORDER_STATUS_META = {
  pending: {
    label: "Pending",
    className: "pending",
  },
  paid: {
    label: "Sudah Dibayar",
    className: "paid",
  },
  processed: {
    label: "Diproses",
    className: "processed",
  },
  shipped: {
    label: "Dikirim",
    className: "shipped",
  },
  completed: {
    label: "Selesai",
    className: "completed",
  },
  cancelled: {
    label: "Dibatalkan",
    className: "cancelled",
  },
};

const PAYMENT_VERIFICATION_STATUS_META = {
  pending: {
    label: "Pending",
    className: "pending",
  },
  waiting_verification: {
    label: "Menunggu Verifikasi",
    className: "processed",
  },
  paid: {
    label: "Paid",
    className: "completed",
  },
  expired: {
    label: "Expired",
    className: "cancelled",
  },
};

export const ADMIN_ORDER_ACTIONS = [
  {
    label: "Proses Pesanan",
    targetStatus: "processed",
    activeFrom: "paid",
  },
  {
    label: "Kirim",
    targetStatus: "shipped",
    activeFrom: "processed",
    requireTrackingNumber: true,
  },
];

export function getOrderStatusMeta(status) {
  return ORDER_STATUS_META[status] ?? {
    label: status ?? "Unknown",
    className: "pending",
  };
}

export function getOrderStatusLabel(status) {
  return getOrderStatusMeta(status).label;
}

export function getOrderStatusClassName(status) {
  return `order-status ${getOrderStatusMeta(status).className}`.trim();
}

export function getOrderPaymentProof(order) {
  return order?.payment_proof ?? order?.paymentProof ?? null;
}

export function getPaymentVerificationStatus(order) {
  const paymentProof = getOrderPaymentProof(order);

  if (
    order?.payment_status === "expired" ||
    order?.status === "cancelled"
  ) {
    return "expired";
  }

  if (
    order?.payment_status === "paid" ||
    ["paid", "processed", "shipped", "completed"].includes(order?.status)
  ) {
    return "paid";
  }

  if (paymentProof?.verification_status === "pending") {
    return "waiting_verification";
  }

  return "pending";
}

export function getPaymentVerificationStatusMeta(status) {
  return PAYMENT_VERIFICATION_STATUS_META[status] ?? PAYMENT_VERIFICATION_STATUS_META.pending;
}

export function getPaymentVerificationStatusLabel(status) {
  return getPaymentVerificationStatusMeta(status).label;
}

export function getPaymentVerificationStatusClassName(status) {
  return `order-status ${getPaymentVerificationStatusMeta(status).className}`.trim();
}
