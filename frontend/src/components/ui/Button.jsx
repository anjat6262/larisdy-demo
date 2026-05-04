function Button({
  as: Component = "button",
  variant = "primary",
  className = "",
  type = "button",
  ...props
}) {
  const variantClass = {
    primary: "tw-btn-primary",
    secondary: "tw-btn-secondary",
    danger: "tw-btn-danger",
  }[variant] ?? "tw-btn-primary";

  const componentProps = Component === "button" ? { type } : {};

  return (
    <Component
      className={`${variantClass} ${className}`.trim()}
      {...componentProps}
      {...props}
    />
  );
}

export default Button;
