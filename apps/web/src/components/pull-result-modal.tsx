import { useEffect } from 'react';
import type { PullResult } from '@emulator-studio/shared';

export function PullResultModal({ result, onClose }: { result: PullResult; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pull-result-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="pull-result-title" className="text-lg font-semibold">
              Pulled messages
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Subscription <code>{result.subscription}</code>
            </p>
          </div>
          <span className={result.acked ? 'badge-ok' : 'badge-error'}>
            {result.acked ? 'Removed from queue' : 'Peek only'}
          </span>
        </div>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {result.messages.map((message, index) => (
            <article
              key={`${message.messageId ?? message.ackId ?? index}`}
              className="rounded-lg border p-4"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">Message {index + 1}</p>
                {message.messageId && (
                  <code className="text-xs" style={{ color: 'var(--muted)' }}>
                    {message.messageId}
                  </code>
                )}
              </div>

              <dl className="mb-3 grid gap-2 text-sm sm:grid-cols-2">
                {message.publishTime && (
                  <div>
                    <dt style={{ color: 'var(--muted)' }}>Publish time</dt>
                    <dd className="font-mono text-xs">{message.publishTime}</dd>
                  </div>
                )}
                {message.orderingKey && (
                  <div>
                    <dt style={{ color: 'var(--muted)' }}>Ordering key</dt>
                    <dd className="font-mono text-xs break-all">{message.orderingKey}</dd>
                  </div>
                )}
                {message.ackId && (
                  <div className="sm:col-span-2">
                    <dt style={{ color: 'var(--muted)' }}>Ack ID</dt>
                    <dd className="font-mono text-xs break-all">{message.ackId}</dd>
                  </div>
                )}
              </dl>

              {Object.keys(message.attributes).length > 0 && (
                <div className="mb-3">
                  <p className="mb-2 text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    Attributes
                  </p>
                  <div
                    className="space-y-1 rounded-lg border p-3"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {Object.entries(message.attributes).map(([key, value]) => (
                      <div key={key} className="grid gap-1 text-xs sm:grid-cols-[8rem_1fr]">
                        <span className="font-mono font-semibold">{key}</span>
                        <span className="font-mono break-all" style={{ color: 'var(--muted)' }}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-medium" style={{ color: 'var(--muted)' }}>
                  Data
                </p>
                <pre
                  className="overflow-x-auto rounded-lg border p-3 font-mono text-xs whitespace-pre-wrap break-words"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                  {message.data || '(empty)'}
                </pre>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
