import { useCallback, useEffect, useState } from 'react';
import type { ConnectionStatus, PullResult } from '@emulator-studio/shared';
import { AppShell } from '../components/app-shell';
import { DeleteIcon, PullIcon } from '../components/action-icons';
import { PullResultModal } from '../components/pull-result-modal';
import {
  PubSubEmulatorControls,
  PubSubEmulatorPanel,
  PubSubEmulatorRoot,
} from '../components/pubsub-emulator-panel';
import { api } from '../lib/api';
import type { ToastAlert } from '../components/toast';

type Alert = ToastAlert;

export function PubSubPage() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [alert, setAlert] = useState<Alert>(null);

  const [topicName, setTopicName] = useState('');
  const [subTopic, setSubTopic] = useState('');
  const [subName, setSubName] = useState('');
  const [publishTopic, setPublishTopic] = useState('');
  const [message, setMessage] = useState('');
  const [pullTarget, setPullTarget] = useState<string | null>(null);
  const [pullBusy, setPullBusy] = useState(false);
  const [pullResult, setPullResult] = useState<PullResult | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getPubSubStatus();
      setStatus(data);
    } catch (err) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load' });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async (action: () => Promise<void>, success: string) => {
    setAlert(null);
    try {
      await action();
      if (success) {
        setAlert({ type: 'success', message: success });
      }
      await refresh();
    } catch (err) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Operation failed' });
    }
  };

  const executePull = async (name: string, ack: boolean) => {
    setPullBusy(true);
    setAlert(null);
    try {
      const result = await api.pull(name, { ack });
      if (result.count === 0) {
        setAlert({
          type: 'success',
          message: `No messages available in "${name}".`,
        });
      } else {
        setPullResult(result);
      }
      setPullTarget(null);
      await refresh();
    } catch (err) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Operation failed' });
    } finally {
      setPullBusy(false);
    }
  };

  const clearConnectionError = useCallback(() => {
    setStatus((prev) => (prev?.error ? { ...prev, error: undefined } : prev));
  }, []);

  const connected = status?.connected ?? false;
  const topics = status?.topics ?? [];
  const subscriptions = status?.subscriptions ?? [];

  return (
    <AppShell
      title="Cloud Pub/Sub"
      subtitle="Pub/Sub emulator dashboard"
      backHref="/emulators"
      toast={alert}
      onToastClose={() => setAlert(null)}
    >
      <PubSubEmulatorRoot onChanged={refresh} onActionStart={clearConnectionError}>
        <PubSubEmulatorPanel />

        <section className="card mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className={connected ? 'badge-ok' : 'badge-error'}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
            <span className="text-sm" style={{ color: 'var(--muted)' }}>
              Host: <code>{status?.host ?? '—'}</code>
            </span>
            <span className="text-sm" style={{ color: 'var(--muted)' }}>
              Project: <code>{status?.projectId ?? 'local-dev'}</code>
            </span>
            <PubSubEmulatorControls />
          </div>
          {status?.error && (
            <p className="mt-3 text-sm" style={{ color: '#ef4444' }}>
              {status.error}
            </p>
          )}
        </section>

        <section className="card mb-6">
          <h2 className="mb-4 font-semibold">Resources</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <ResourcePanel
              title="Topics"
              count={topics.length}
              empty={connected ? 'No topics yet.' : 'Connect to the emulator first.'}
              items={topics.map((name) => ({ name }))}
              onDelete={(name) => run(() => api.deleteTopic(name), `Topic "${name}" deleted.`)}
              disabled={!connected}
              footer={
                <form
                  className="mt-4 space-y-3 border-t pt-4"
                  style={{ borderColor: 'var(--border)' }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(async () => {
                      await api.createTopic(topicName.trim());
                      setTopicName('');
                    }, `Topic "${topicName}" created.`);
                  }}
                >
                  <label className="block text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    New topic
                  </label>
                  <input
                    className="input"
                    value={topicName}
                    onChange={(e) => setTopicName(e.target.value)}
                    placeholder="e.g. events-order"
                    required
                    disabled={!connected}
                  />
                  <button type="submit" className="btn-primary w-full" disabled={!connected}>
                    Create topic
                  </button>
                </form>
              }
            />

            <ResourcePanel
              title="Subscriptions"
              count={subscriptions.length}
              empty={connected ? 'No subscriptions yet.' : 'Connect to the emulator first.'}
              items={subscriptions.map((s) => ({
                name: s.name,
                meta: s.topic ? `→ ${s.topic}` : undefined,
              }))}
              onPull={(name) => setPullTarget(name)}
              onDelete={(name) =>
                run(() => api.deleteSubscription(name), `Subscription "${name}" deleted.`)
              }
              disabled={!connected || topics.length === 0}
              footer={
                <form
                  className="mt-4 space-y-3 border-t pt-4"
                  style={{ borderColor: 'var(--border)' }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(async () => {
                      await api.createSubscription(subName.trim(), subTopic);
                      setSubName('');
                    }, `Subscription "${subName}" created.`);
                  }}
                >
                  <label className="block text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    Linked topic
                  </label>
                  <select
                    className="input"
                    value={subTopic}
                    onChange={(e) => setSubTopic(e.target.value)}
                    required
                    disabled={!connected || topics.length === 0}
                  >
                    <option value="">Select a topic</option>
                    {topics.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <label className="block text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    New subscription
                  </label>
                  <input
                    className="input"
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                    placeholder="e.g. process-order-sub"
                    required
                    disabled={!connected || topics.length === 0}
                  />
                  <button
                    type="submit"
                    className="btn-primary w-full"
                    disabled={!connected || topics.length === 0}
                  >
                    Create subscription
                  </button>
                </form>
              }
            />
          </div>
        </section>

        <section className="card">
          <h2 className="mb-2 font-semibold">Publish message</h2>
          <p className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>
            The emulator does not log publishes in the terminal. Use the pull button on a
            subscription to verify delivery.
          </p>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                const result = await api.publish(publishTopic, message);
                setMessage('');
                setAlert({
                  type: 'success',
                  message: `Published! ID: ${result.messageId} | Topic: ${result.topic}`,
                });
              }, '');
            }}
          >
            <div>
              <label className="mb-1 block text-sm" style={{ color: 'var(--muted)' }}>
                Topic
              </label>
              <select
                className="input"
                value={publishTopic}
                onChange={(e) => setPublishTopic(e.target.value)}
                required
                disabled={topics.length === 0}
              >
                <option value="">Select a topic</option>
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm" style={{ color: 'var(--muted)' }}>
                Message
              </label>
              <textarea
                className="input min-h-[140px] font-mono"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder='Plain text or JSON, e.g. {"event":"test"}'
                required
                disabled={topics.length === 0}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={topics.length === 0}>
              Publish to Pub/Sub
            </button>
          </form>
        </section>
      </PubSubEmulatorRoot>

      {pullTarget && (
        <PullPromptModal
          subscription={pullTarget}
          busy={pullBusy}
          onClose={() => !pullBusy && setPullTarget(null)}
          onConfirm={(ack) => executePull(pullTarget, ack)}
        />
      )}

      {pullResult && <PullResultModal result={pullResult} onClose={() => setPullResult(null)} />}
    </AppShell>
  );
}

function PullPromptModal({
  subscription,
  busy,
  onClose,
  onConfirm,
}: {
  subscription: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (ack: boolean) => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  return (
    <div className="modal-overlay" onClick={() => !busy && onClose()} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pull-prompt-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="pull-prompt-title" className="mb-1 text-lg font-semibold">
          Consume messages
        </h2>
        <p className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>
          How should messages from <code>{subscription}</code> be handled?
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={busy}
            onClick={() => onConfirm(false)}
          >
            Peek only
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() => onConfirm(true)}
          >
            Remove from queue
          </button>
        </div>
      </div>
    </div>
  );
}

function ResourcePanel({
  title,
  count,
  empty,
  items,
  onDelete,
  onPull,
  footer,
  disabled,
}: {
  title: string;
  count: number;
  empty: string;
  items: { name: string; meta?: string }[];
  onDelete: (name: string) => void;
  onPull?: (name: string) => void;
  footer: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex min-h-[360px] flex-col rounded-lg border"
      style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: 'var(--border)' }}
      >
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="badge-ok">{count}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>
            {empty}
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-semibold">{item.name}</p>
                {item.meta && (
                  <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                    {item.meta}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                {onPull && (
                  <button
                    type="button"
                    className="btn-icon btn-icon-accent"
                    onClick={() => onPull(item.name)}
                    title="Pull messages"
                    aria-label="Pull messages"
                  >
                    <PullIcon />
                  </button>
                )}
                <button
                  type="button"
                  className="btn-icon btn-icon-danger"
                  onClick={() => onDelete(item.name)}
                  disabled={disabled}
                  title="Delete"
                  aria-label="Delete"
                >
                  <DeleteIcon />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-3">{footer}</div>
    </div>
  );
}
