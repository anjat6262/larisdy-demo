function Badge({ tone = "default", className = "", children }) {
  const toneClass = {
    default: "tw-status-badge",
    success: "tw-status-badge-success",
    warning: "tw-status-badge-warning",
    danger: "tw-status-badge-danger",
  }[tone] ?? "tw-status-badge";

  return (
    <span className={`${toneClass} ${className}`.trim()}>
      {children}
    </span>
  );
}

export default Badge;
