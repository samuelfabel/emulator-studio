import { Link } from 'react-router-dom';
import { BackIcon } from './action-icons';
import { ThemeToggle } from './theme-toggle';
import { Toast, type ToastAlert } from './toast';

const HEADER_LEADING_SLOT = 'h-9 w-9 shrink-0';

export function AppShell({
  title,
  subtitle,
  backHref,
  toast,
  onToastClose,
  children,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  toast?: ToastAlert;
  onToastClose?: () => void;
  children: React.ReactNode;
}) {
  const showBack = Boolean(backHref);
  const showPageTitle = title !== 'Emulator Studio';

  return (
    <div className="min-h-screen">
      {toast && onToastClose && <Toast alert={toast} onClose={onToastClose} />}
      <header className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-x-3">
            <div className={`${HEADER_LEADING_SLOT} flex items-center justify-center`}>
              {showBack ? (
                <Link
                  to={backHref!}
                  className="btn-icon-round"
                  aria-label="Back"
                  title="Back"
                >
                  <BackIcon />
                </Link>
              ) : (
                <span className="btn-icon-round invisible" aria-hidden />
              )}
            </div>

            <div className="min-w-0">
              <Link to="/" className="text-lg font-bold leading-tight">
                Emulator Studio
              </Link>
              <p className="text-sm leading-snug" style={{ color: 'var(--muted)' }}>
                {subtitle ?? 'Local cloud emulator dashboards'}
              </p>
            </div>

            <div className={`${HEADER_LEADING_SLOT} flex items-center justify-center justify-self-end`}>
              <ThemeToggle />
            </div>
          </div>

          {showPageTitle && (
            <div className="mt-4 grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3">
              <span aria-hidden />
              <h1 className="text-2xl font-bold leading-tight">{title}</h1>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
