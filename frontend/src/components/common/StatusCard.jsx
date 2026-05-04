function StatusCard({
  as: Component = "div",
  compact = false,
  align = "center",
  className = "",
  children,
}) {
  const spacingClass = compact ? "mb-6 mt-0 px-5 py-4" : "my-8 p-8";
  const alignClass = align === "left" ? "text-left" : "text-center";

  return (
    <Component
      className={`mx-auto max-w-[760px] rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow-sm)] ${spacingClass} ${alignClass} ${className}`.trim()}
    >
      {children}
    </Component>
  );
}

export default StatusCard;
