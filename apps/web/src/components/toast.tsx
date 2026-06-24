import { useEffect } from 'react';

export type ToastAlert = { type: 'success' | 'error'; message: string } | null;

export function Toast({
  alert,
  onClose,
  durationMs = 5000,
}: {
  alert: ToastAlert;
  onClose: () => void;
  durationMs?: number;
}) {
  const message = alert?.message?.trim();

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onClose, durationMs);
    return () => clearTimeout(id);
  }, [message, onClose, durationMs]);

  if (!message) return null;

  return (
    <div
      className={`toast toast-${alert!.type}`}
      role="status"
      aria-live="polite"
    >
      <p className="flex-1 whitespace-pre-line text-sm leading-relaxed">{message}</p>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Close">
        ×
      </button>
    </div>
  );
}
