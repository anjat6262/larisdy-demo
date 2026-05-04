function FormInput({
  id,
  label,
  as = "input",
  className = "",
  fieldClassName = "",
  ...props
}) {
  const Component = as;

  return (
    <div className={`form-group ${fieldClassName}`.trim()}>
      <label htmlFor={id} className="tw-label">
        {label}
      </label>
      <Component
        id={id}
        className={`tw-input ${className}`.trim()}
        {...props}
      />
    </div>
  );
}

export default FormInput;
