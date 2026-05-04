export function normalizePhoneHref(phone) {
  const digits = String(phone ?? "").replace(/\D+/g, "");

  if (!digits) {
    return "";
  }

  return `tel:${digits.startsWith("1") ? "+" : ""}${digits}`;
}
