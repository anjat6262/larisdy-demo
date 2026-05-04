function Toast({ toast, onClose }) {
  return (
    <div
      className={`toast ${toast ? "show" : ""} ${toast?.type === "error" ? "error" : ""}`.trim()}
      role="status"
      aria-live="polite"
      onClick={onClose}
    >
      {toast?.message}
    </div>
  );
}

export default Toast;
