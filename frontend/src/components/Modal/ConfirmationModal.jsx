import React, { useEffect, useRef } from "react";

function ConfirmationModal({
  open,
  title = "Are you sure?",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  danger = false,
  disableOutsideClose = false,
  icon,
  className = "",
}) {
  const panelRef = useRef(null);
  const cancelBtnRef = useRef(null);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape" && !disableOutsideClose) onCancel?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel, disableOutsideClose]);

  // Focus cancel button when opened
  useEffect(() => {
    if (open) cancelBtnRef.current?.focus();
  }, [open]);

  const handleBackdropClick = (e) => {
    if (disableOutsideClose) return;
    if (e.target === e.currentTarget) onCancel?.();
  };

  const confirmBtnBase =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
  const confirmBtnStyles = danger
    ? "bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-600"
    : "bg-indigo-600 hover:bg-indigo-700 text-white focus-visible:ring-indigo-600";

  const cancelBtnStyles =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400";

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
      aria-labelledby="confirm-modal-title"
      role="dialog"
      aria-modal="true"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className={`w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5 ${className}`}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          {icon && (
            <div
              className={`mt-1 flex h-9 w-9 items-center justify-center rounded-xl ${
                danger ? "bg-red-100 text-red-700" : "bg-indigo-100 text-indigo-700"
              }`}
            >
              {icon}
            </div>
          )}
          <div className="flex-1">
            <h2 id="confirm-modal-title" className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            {message && <div className="mt-1 text-sm text-slate-600">{message}</div>}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelBtnRef}
            type="button"
            className={cancelBtnStyles}
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`${confirmBtnBase} ${confirmBtnStyles}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;
