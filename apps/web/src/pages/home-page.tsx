import { Link } from 'react-router-dom';
import { AppShell } from '../components/app-shell';

export function HomePage() {
  return (
    <AppShell title="Emulator Studio">
      <section className="mb-8">
        <h2 className="mb-2 text-2xl font-bold">Welcome</h2>
        <p style={{ color: 'var(--muted)' }}>
          Manage local cloud emulators and open dashboards to test integrations across providers.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/emulators" className="card block transition hover:opacity-90">
          <h3 className="mb-2 font-semibold">Installed emulators</h3>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Install, remove, and browse the available emulator catalog.
          </p>
        </Link>
        <Link to="/emulators/pubsub" className="card block transition hover:opacity-90">
          <h3 className="mb-2 font-semibold">Pub/Sub dashboard</h3>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Topics, subscriptions, publishing, and message consumption.
          </p>
        </Link>
      </div>
    </AppShell>
  );
}
