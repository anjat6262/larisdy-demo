export const SHIPPING_COURIER_OPTIONS = [
  {
    value: "jne",
    label: "JNE",
    description: "Pengiriman reguler dengan nomor resi.",
  },
  {
    value: "jnt",
    label: "J&T",
    description: "Pengiriman reguler J&T dengan nomor resi.",
  },
];

export function getShippingCourierLabel(value) {
  const courier = SHIPPING_COURIER_OPTIONS.find((option) => option.value === value);

  if (courier) {
    return courier.label;
  }

  return value ? value.toUpperCase() : "-";
}
