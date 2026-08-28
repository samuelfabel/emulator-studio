import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { EmulatorRuntimeStatus, StorageEmulatorConfig } from '@emulator-studio/shared';
import { api } from '../lib/api';
import { useModalKeyboard } from '../lib/modal-keyboard';
import { PlayIcon, RefreshIcon, SettingsIcon, StopIcon } from './action-icons';
import { Toast, type ToastAlert } from './toast';

type Alert = ToastAlert;

interface StorageEmulatorContextValue {
  config: StorageEmulatorConfig;
  setConfig: React.Dispatch<React.SetStateAction<StorageEmulatorConfig>>;
  runtime: EmulatorRuntimeStatus | null;
  installed: boolean;
  loading: boolean;
  busy: boolean;
  running: boolean;
  refresh: () => Promise<void>;
  refreshAll: () => Promise<void>;
  run: (action: () => Promise<void>, success: string) => Promise<void>;
  onActionStart?: () => void;
}

const StorageEmulatorContext = createContext<StorageEmulatorContextValue | null>(null);

function useStorageEmulatorContext() {
  const ctx = useContext(StorageEmulatorContext);
  if (!ctx) {
    throw new Error('Storage emulator components must be used within StorageEmulatorRoot.');
  }
  return ctx;
}

/** Access emulator start/stop/config state from inside StorageEmulatorRoot. */
export function useStorageEmulator() {
  return useStorageEmulatorContext();
}

export function StorageEmulatorRoot({
  children,
  onChanged,
  onActionStart,
}: {
  children: ReactNode;
  onChanged?: () => void;
  onActionStart?: () => void;
}) {
  const [config, setConfig] = useState<StorageEmulatorConfig>({
    projectId: 'local-dev',
    hostPort: 'localhost:4443',
  });
  const [runtime, setRuntime] = useState<EmulatorRuntimeStatus | null>(null);
  const [installed, setInstalled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<Alert>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [list, storageConfig, storageRuntime] = await Promise.all([
        api.listEmulators(),
        api.getStorageConfig().catch(() => null),
        api.getStorageRuntime(),
      ]);

      const storage = list.find((e) => e.id === 'storage');
      setInstalled(Boolean(storage?.installed));
      if (storageConfig) setConfig(storageConfig);
      setRuntime(storageRuntime);
    } catch (err) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    setAlert(null);
    try {
      await action();
      if (success) {
        setAlert({ type: 'success', message: success });
      }
      await refresh();
      onChanged?.();
    } catch (err) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Operation failed' });
    } finally {
      setBusy(false);
    }
  };

  const running = runtime?.running ?? false;

  const refreshAll = useCallback(async () => {
    await refresh();
    await onChanged?.();
  }, [refresh, onChanged]);

  return (
    <StorageEmulatorContext.Provider
      value={{
        config,
        setConfig,
        runtime,
        installed,
        loading,
        busy,
        running,
        refresh,
        refreshAll,
        run,
        onActionStart,
      }}
    >
      <Toast alert={alert} onClose={() => setAlert(null)} />
      {children}
    </StorageEmulatorContext.Provider>
  );
}

export function StorageEmulatorPanel() {
  const { config, setConfig, runtime, installed, loading, busy, running, run } =
    useStorageEmulatorContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState(config);

  useEffect(() => {
    if (modalOpen) {
      setDraft(config);
    }
  }, [modalOpen, config]);

  const saveConfig = () =>
    run(async () => {
      await api.updateStorageConfig(draft);
      setConfig(draft);
      setModalOpen(false);
    }, 'Configuration saved.');

  useModalKeyboard({
    open: modalOpen,
    busy,
    onPrimary: saveConfig,
    onSecondary: () => setModalOpen(false),
  });

  const statusLabel = running
    ? runtime?.managed
      ? `Running (container ${runtime.containerId ?? '—'})`
      : `Running externally at ${runtime?.hostPort ?? config.hostPort}`
    : 'Stopped';

  return (
    <>
      <section className="card mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Local emulator</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Control the local Storage emulator (fake-gcs-server via Docker).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={running ? 'badge-ok' : 'badge-error'}>{statusLabel}</span>
            {installed && (
              <button
                type="button"
                className="btn-icon-round"
                onClick={() => setModalOpen(true)}
                disabled={running || busy || loading}
                aria-label="Configure emulator"
                title="Configure"
              >
                <SettingsIcon />
              </button>
            )}
          </div>
        </div>

        {!installed && (
          <p className="mt-4 text-sm" style={{ color: 'var(--muted)' }}>
            The Storage emulator is not installed.{' '}
            <a href="/emulators" className="underline" style={{ color: 'var(--primary)' }}>
              Install it from the emulators page
            </a>{' '}
            before starting.
          </p>
        )}

        {installed && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm" style={{ color: 'var(--muted)' }}>
            <span>
              Project: <code>{config.projectId}</code>
            </span>
            <span>
              Host: <code>{config.hostPort}</code>
            </span>
          </div>
        )}
      </section>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)} role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="storage-config-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="storage-config-title" className="mb-1 text-lg font-semibold">
              Configure emulator
            </h2>
            <p className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>
              Set the project ID and local emulator host:port. Requires Docker for start.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm" style={{ color: 'var(--muted)' }}>
                  Project ID
                </label>
                <input
                  className="input"
                  value={draft.projectId}
                  onChange={(e) => setDraft((c) => ({ ...c, projectId: e.target.value }))}
                  disabled={busy}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm" style={{ color: 'var(--muted)' }}>
                  Host:port
                </label>
                <input
                  className="input"
                  value={draft.hostPort}
                  onChange={(e) => setDraft((c) => ({ ...c, hostPort: e.target.value }))}
                  disabled={busy}
                  placeholder="localhost:4443"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setModalOpen(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={busy}
                onClick={saveConfig}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function StorageEmulatorControls() {
  const { installed, loading, busy, running, run, onActionStart } = useStorageEmulatorContext();

  if (!installed) return null;

  const withClearError = (action: () => void) => {
    onActionStart?.();
    action();
  };

  const restart = async () => {
    await api.restartStorage();
  };

  return (
    <div className="media-controls ml-auto shrink-0">
      <button
        type="button"
        className="btn-media btn-media-play"
        disabled={running || busy || loading}
        onClick={() => withClearError(() => run(() => api.startStorage(), 'Emulator started.'))}
        aria-label="Start emulator"
        title="Start"
      >
        <PlayIcon />
      </button>
      <button
        type="button"
        className="btn-media btn-media-stop"
        disabled={!running || busy || loading}
        onClick={() => withClearError(() => run(() => api.stopStorage(), 'Emulator stopped.'))}
        aria-label="Stop emulator"
        title="Stop"
      >
        <StopIcon />
      </button>
      <button
        type="button"
        className={`btn-media ${busy ? 'animate-spin' : ''}`}
        disabled={!installed || busy || loading}
        onClick={() =>
          withClearError(() =>
            run(restart, running ? 'Emulator restarted.' : 'Emulator started.')
          )
        }
        aria-label="Restart emulator"
        title="Restart"
      >
        <RefreshIcon />
      </button>
    </div>
  );
}
