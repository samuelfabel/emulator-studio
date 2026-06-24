import { useCallback, useEffect, useState } from 'react';
import type { EmulatorListItem } from '@emulator-studio/shared';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/app-shell';
import { api } from '../lib/api';
import type { ToastAlert } from '../components/toast';

type Alert = ToastAlert;

export function EmulatorsPage() {
  const [items, setItems] = useState<EmulatorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [alert, setAlert] = useState<Alert>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.listEmulators());
    } catch (err) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async (id: string, action: () => Promise<void>, success: string) => {
    setBusyId(id);
    setAlert(null);
    try {
      await action();
      if (success) {
        setAlert({ type: 'success', message: success });
      }
      await refresh();
    } catch (err) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Operation failed' });
    } finally {
      setBusyId(null);
    }
  };

  const installed = items.filter((e) => e.installed);
  const available = items.filter((e) => !e.installed);

  return (
    <AppShell
      title="Emulators"
      subtitle="Install and manage local emulators"
      backHref="/"
      toast={alert}
      onToastClose={() => setAlert(null)}
    >
      <section className="card mb-6">
        <h2 className="mb-4 font-semibold">Installed ({installed.length})</h2>
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Loading...
          </p>
        ) : installed.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            No emulators installed. Use the catalog below to install one.
          </p>
        ) : (
          <ul className="space-y-3">
            {installed.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                style={{ borderColor: 'var(--border)' }}
              >
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    Installed on {new Date(item.installedAt!).toLocaleString('en-US')}
                  </p>
                  {item.runtime?.running && (
                    <span className="badge-ok mt-2 inline-block">
                      {item.runtime.managed ? 'Running' : 'Running (external)'}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.id === 'pubsub' && (
                    <Link to="/emulators/pubsub" className="btn-primary">
                      Open dashboard
                    </Link>
                  )}
                  <button
                    type="button"
                    className="btn-danger"
                    disabled={busyId === item.id || item.runtime?.running}
                    onClick={() =>
                      run(item.id, () => api.uninstallEmulator(item.id), `${item.name} removed.`)
                    }
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="mb-4 font-semibold">Catalog</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {available.map((item) => (
            <article
              key={item.id}
              className="rounded-lg border p-4"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="font-semibold">{item.name}</h3>
                <span className={item.installable ? 'badge-ok' : 'badge-error'}>
                  {item.installable ? 'Available' : 'Coming soon'}
                </span>
              </div>
              <p className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>
                {item.description}
              </p>
              <button
                type="button"
                className="btn-primary"
                disabled={!item.installable || busyId === item.id}
                onClick={() =>
                  run(
                    item.id,
                    () => api.installEmulator(item.id),
                    `${item.name} installed successfully.`
                  )
                }
              >
                Install
              </button>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
