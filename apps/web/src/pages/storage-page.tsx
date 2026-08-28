import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  StorageConnectionStatus,
  StorageListResult,
  StorageObjectInfo,
} from '@emulator-studio/shared';
import { AppShell } from '../components/app-shell';
import {
  CopyIcon,
  DeleteIcon,
  DownloadIcon,
  EditIcon,
  ExternalLinkIcon,
  FileIcon,
  FolderIcon,
  PlusIcon,
  RefreshIcon,
} from '../components/action-icons';
import {
  StorageEmulatorControls,
  StorageEmulatorPanel,
  StorageEmulatorRoot,
  useStorageEmulator,
} from '../components/storage-emulator-panel';
import { api } from '../lib/api';
import { inlineEnterKey, useModalKeyboard } from '../lib/modal-keyboard';
import type { ToastAlert } from '../components/toast';

type Alert = ToastAlert;

type AddModal =
  | { kind: 'folder' }
  | { kind: 'text' }
  | { kind: 'file'; originalName: string; contentBase64: string; contentType: string };

type MetaRow = { key: string; value: string };

function formatBytes(size?: string): string {
  const n = Number(size ?? 0);
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

function folderLabel(fullPrefix: string, parentPrefix: string): string {
  const relative = fullPrefix.slice(parentPrefix.length).replace(/\/$/, '');
  return relative || fullPrefix;
}

function guessType(fileName: string, contentType?: string): string {
  if (contentType && contentType !== 'application/octet-stream') return contentType;
  const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : '';
  return ext ? ext.toUpperCase() : 'File';
}

function publicObjectUrl(host: string, bucket: string, objectName: string): string {
  const base = host.replace(/\/$/, '');
  return `${base}/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectName)}?alt=media`;
}

function readFileAsBase64(file: File): Promise<{ base64: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve({
        base64: comma >= 0 ? result.slice(comma + 1) : result,
        contentType: file.type || 'application/octet-stream',
      });
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function StoragePage() {
  const [status, setStatus] = useState<StorageConnectionStatus | null>(null);
  const [alert, setAlert] = useState<Alert>(null);
  const [busy, setBusy] = useState(false);
  const [bucketName, setBucketName] = useState('');
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [prefix, setPrefix] = useState('');
  const [listing, setListing] = useState<StorageListResult | null>(null);

  const crumbs = useMemo(() => {
    if (!prefix) return [] as string[];
    return prefix
      .split('/')
      .filter(Boolean)
      .reduce<string[]>((acc, part) => {
        const prev = acc[acc.length - 1] ?? '';
        acc.push(`${prev}${part}/`);
        return acc;
      }, []);
  }, [prefix]);

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await api.getStorageStatus());
    } catch (err) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load' });
    }
  }, []);

  const refreshListing = useCallback(async (bucket: string, path: string) => {
    setListing(await api.listObjects(bucket, path));
  }, []);

  const refresh = useCallback(async () => {
    await refreshStatus();
    if (!selectedBucket) return;
    try {
      await refreshListing(selectedBucket, prefix);
    } catch {
      setListing(null);
    }
  }, [prefix, refreshListing, refreshStatus, selectedBucket]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    setAlert(null);
    try {
      await action();
      if (success) setAlert({ type: 'success', message: success });
      await refresh();
    } catch (err) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Operation failed' });
    } finally {
      setBusy(false);
    }
  };

  const clearConnectionError = useCallback(() => {
    setStatus((prev) => (prev?.error ? { ...prev, error: undefined } : prev));
  }, []);

  const openBucket = async (name: string) => {
    setSelectedBucket(name);
    setPrefix('');
    setBusy(true);
    try {
      await refreshListing(name, '');
    } catch (err) {
      setAlert({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to open bucket',
      });
    } finally {
      setBusy(false);
    }
  };

  const navigateTo = async (path: string) => {
    if (!selectedBucket) return;
    setPrefix(path);
    setBusy(true);
    try {
      await refreshListing(selectedBucket, path);
    } catch (err) {
      setAlert({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to open folder',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell
      title="Cloud Storage"
      subtitle="Storage emulator dashboard"
      backHref="/emulators"
      toast={alert}
      onToastClose={() => setAlert(null)}
    >
      <StorageEmulatorRoot onChanged={refresh} onActionStart={clearConnectionError}>
        <StorageEmulatorPanel />
        <StorageWorkspace
          status={status}
          busy={busy}
          bucketName={bucketName}
          setBucketName={setBucketName}
          selectedBucket={selectedBucket}
          setSelectedBucket={setSelectedBucket}
          setListing={setListing}
          prefix={prefix}
          listing={listing}
          crumbs={crumbs}
          run={run}
          refresh={refresh}
          openBucket={openBucket}
          navigateTo={navigateTo}
          onError={(message) => setAlert({ type: 'error', message })}
        />
      </StorageEmulatorRoot>
    </AppShell>
  );
}

function StorageWorkspace(props: {
  status: StorageConnectionStatus | null;
  busy: boolean;
  bucketName: string;
  setBucketName: (v: string) => void;
  selectedBucket: string | null;
  setSelectedBucket: (v: string | null) => void;
  setListing: (v: StorageListResult | null) => void;
  prefix: string;
  listing: StorageListResult | null;
  crumbs: string[];
  run: (action: () => Promise<void>, success: string) => Promise<void>;
  refresh: () => Promise<void>;
  openBucket: (name: string) => Promise<void>;
  navigateTo: (path: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const {
    status,
    busy,
    bucketName,
    setBucketName,
    selectedBucket,
    setSelectedBucket,
    setListing,
    prefix,
    listing,
    crumbs,
    run,
    refresh,
    openBucket,
    navigateTo,
    onError,
  } = props;

  const { running } = useStorageEmulator();
  const connected = status?.connected ?? false;
  const online = running || connected;
  const connectionLabel = connected ? 'Connected' : running ? 'Online' : 'Disconnected';
  const emulatorHost = status?.host ?? '';

  const [addOpen, setAddOpen] = useState(false);
  const [modal, setModal] = useState<AddModal | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftText, setDraftText] = useState('');
  const [editingPath, setEditingPath] = useState(false);
  const [pathDraft, setPathDraft] = useState('');
  const [editObject, setEditObject] = useState<StorageObjectInfo | null>(null);
  const [editName, setEditName] = useState('');
  const [editContentType, setEditContentType] = useState('');
  const [editEncoding, setEditEncoding] = useState('');
  const [editMetaRows, setEditMetaRows] = useState<MetaRow[]>([{ key: '', value: '' }]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLDivElement>(null);
  const pathInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!addOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (!addRef.current?.contains(event.target as Node)) setAddOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [addOpen]);

  useEffect(() => {
    if (editingPath) pathInputRef.current?.focus();
  }, [editingPath]);

  const startPathEdit = () => {
    setPathDraft(prefix);
    setEditingPath(true);
  };

  const commitPathEdit = async () => {
    setEditingPath(false);
    let next = pathDraft.trim().replace(/^\/+/, '');
    if (next && !next.endsWith('/')) next = `${next}/`;
    if (next === prefix) return;
    await navigateTo(next);
  };

  const openFolderModal = () => {
    setAddOpen(false);
    setDraftName('');
    setModal({ kind: 'folder' });
  };

  const openTextModal = () => {
    setAddOpen(false);
    setDraftName('');
    setDraftText('');
    setModal({ kind: 'text' });
  };

  const openFilePicker = () => {
    setAddOpen(false);
    fileInputRef.current?.click();
  };

  const onFilePicked = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const { base64, contentType } = await readFileAsBase64(file);
      setDraftName(file.name);
      setModal({
        kind: 'file',
        originalName: file.name,
        contentBase64: base64,
        contentType,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to read file');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const submitModal = async () => {
    if (!selectedBucket || !modal) return;
    const name = draftName.trim().replace(/^\/+/, '');
    if (!name) return;

    if (modal.kind === 'folder') {
      const path = `${prefix}${name.replace(/\/+$/, '')}/`;
      await run(async () => {
        await api.createFolder(selectedBucket, path);
        setModal(null);
      }, 'Folder created.');
      return;
    }

    if (modal.kind === 'text') {
      await run(async () => {
        await api.uploadObject(selectedBucket, `${prefix}${name}`, draftText, {
          encoding: 'utf8',
          contentType: 'text/plain',
        });
        setModal(null);
        setDraftText('');
      }, 'Document created.');
      return;
    }

    await run(async () => {
      await api.uploadObject(selectedBucket, `${prefix}${name}`, modal.contentBase64, {
        encoding: 'base64',
        contentType: modal.contentType,
      });
      setModal(null);
    }, 'File uploaded.');
  };

  const openEditModal = async (obj: StorageObjectInfo) => {
    if (!selectedBucket) return;
    try {
      const meta = await api.getObjectMeta(selectedBucket, obj.name);
      setEditObject(meta);
      setEditName(meta.name);
      setEditContentType(meta.contentType ?? '');
      setEditEncoding(meta.contentEncoding ?? '');
      const rows = Object.entries(meta.metadata ?? {})
        .filter(([, value]) => value != null && value !== '')
        .map(([key, value]) => ({ key, value }));
      // Trailing blank row is the add slot (+); existing rows get ×.
      setEditMetaRows([...rows, { key: '', value: '' }]);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load object metadata');
    }
  };

  const submitEdit = async () => {
    if (!selectedBucket || !editObject) return;
    const newName = editName.trim().replace(/^\/+/, '');
    if (!newName) return;

    const metadata: Record<string, string> = {};
    for (const row of editMetaRows) {
      const key = row.key.trim();
      if (!key) continue;
      metadata[key] = row.value;
    }

    await run(async () => {
      await api.updateObject(selectedBucket, editObject.name, {
        newName: newName !== editObject.name ? newName : undefined,
        contentType: editContentType.trim() || undefined,
        contentEncoding: editEncoding.trim() || undefined,
        metadata,
      });
      setEditObject(null);
    }, 'Object updated.');
  };

  useModalKeyboard({
    open: Boolean(modal),
    busy,
    primaryDisabled: !draftName.trim(),
    onPrimary: () => void submitModal(),
    onSecondary: () => setModal(null),
  });

  useModalKeyboard({
    open: Boolean(editObject),
    busy,
    primaryDisabled: !editName.trim(),
    onPrimary: () => void submitEdit(),
    onSecondary: () => setEditObject(null),
  });

  const folders = listing?.folders ?? [];
  const objects = listing?.objects ?? [];
  const empty = folders.length === 0 && objects.length === 0;
  const publicUrl =
    editObject && emulatorHost && selectedBucket
      ? publicObjectUrl(emulatorHost, selectedBucket, editObject.name)
      : '';

  const createBucket = () => {
    if (busy || !bucketName.trim() || !online) return;
    void run(async () => {
      await api.createBucket(bucketName.trim());
      setBucketName('');
    }, 'Bucket created.');
  };

  return (
    <>
      <section className="card mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className={online ? 'badge-ok' : 'badge-error'}>{connectionLabel}</span>
          <span className="text-sm" style={{ color: 'var(--muted)' }}>
            Host: <code>{status?.host ?? '—'}</code>
          </span>
          <span className="text-sm" style={{ color: 'var(--muted)' }}>
            Project: <code>{status?.projectId ?? 'local-dev'}</code>
          </span>
          <StorageEmulatorControls />
        </div>
        {status?.error && !running && (
          <p className="mt-3 text-sm" style={{ color: '#ef4444' }}>
            {status.error}
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <section className="card">
          <h2 className="mb-3 font-semibold">Buckets</h2>
          <div className="mb-3 flex gap-2">
            <input
              className="input"
              placeholder="bucket-name"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              disabled={busy || !online}
              onKeyDown={(e) =>
                inlineEnterKey(e, createBucket, busy || !bucketName.trim() || !online)
              }
            />
            <button
              type="button"
              className="btn-primary shrink-0"
              disabled={busy || !bucketName.trim() || !online}
              onClick={createBucket}
            >
              Create
            </button>
          </div>
          <ul className="space-y-1">
            {(status?.buckets ?? []).map((b) => (
              <li key={b.name}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm"
                  style={{
                    borderColor: selectedBucket === b.name ? 'var(--primary)' : 'var(--border)',
                    background: selectedBucket === b.name ? 'var(--bg)' : 'transparent',
                  }}
                  onClick={() => void openBucket(b.name)}
                >
                  <span className="truncate font-medium">{b.name}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    className="btn-icon btn-icon-danger"
                    title="Delete bucket"
                    onClick={(e) => {
                      e.stopPropagation();
                      void run(
                        () => api.deleteBucket(b.name, true),
                        `Bucket "${b.name}" deleted.`
                      ).then(() => {
                        if (selectedBucket === b.name) {
                          setSelectedBucket(null);
                          setListing(null);
                        }
                      });
                    }}
                  >
                    <DeleteIcon />
                  </span>
                </button>
              </li>
            ))}
            {online && (status?.buckets?.length ?? 0) === 0 && (
              <li className="text-sm" style={{ color: 'var(--muted)' }}>
                No buckets yet.
              </li>
            )}
            {!online && (
              <li className="text-sm" style={{ color: 'var(--muted)' }}>
                Start the emulator to manage buckets.
              </li>
            )}
          </ul>
        </section>

        <section className="card min-w-0">
          {!selectedBucket ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {online
                ? 'Select a bucket to browse folders and objects.'
                : 'Start the emulator and select a bucket.'}
            </p>
          ) : (
            <>
              <div className="mb-4 flex items-start justify-between gap-3">
                <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-sm">
                  {editingPath ? (
                    <input
                      ref={pathInputRef}
                      className="input max-w-md"
                      value={pathDraft}
                      onChange={(e) => setPathDraft(e.target.value)}
                      onBlur={() => void commitPathEdit()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void commitPathEdit();
                        }
                        if (e.key === 'Escape') setEditingPath(false);
                      }}
                      placeholder="path/inside/bucket/"
                      disabled={busy}
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        className="breadcrumb-link"
                        title="Click to go to bucket root. Click again on current path to edit."
                        onClick={() => {
                          if (prefix === '') startPathEdit();
                          else void navigateTo('');
                        }}
                      >
                        {selectedBucket}
                      </button>
                      {crumbs.map((crumb, index) => {
                        const isLast = index === crumbs.length - 1;
                        return (
                          <span key={crumb} className="flex items-center gap-1">
                            <span style={{ color: 'var(--muted)' }}>/</span>
                            <button
                              type="button"
                              className="breadcrumb-link"
                              onClick={() => {
                                if (isLast) startPathEdit();
                                else void navigateTo(crumb);
                              }}
                            >
                              {folderLabel(crumb, crumbs[index - 1] ?? '')}
                            </button>
                          </span>
                        );
                      })}
                    </>
                  )}

                  <div className="relative ml-1" ref={addRef}>
                    <button
                      type="button"
                      className="btn-icon btn-icon-accent"
                      disabled={busy || !online}
                      onClick={() => setAddOpen((v) => !v)}
                      aria-haspopup="menu"
                      aria-expanded={addOpen}
                      title="Add in current folder"
                      aria-label="Add in current folder"
                    >
                      <PlusIcon />
                    </button>
                    {addOpen && (
                      <div
                        className="absolute left-0 z-20 mt-1 min-w-[200px] rounded-lg border py-1 shadow-lg"
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                        role="menu"
                      >
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:opacity-80"
                          role="menuitem"
                          onClick={openFolderModal}
                        >
                          Create folder
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:opacity-80"
                          role="menuitem"
                          onClick={openTextModal}
                        >
                          New text document
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:opacity-80"
                          role="menuitem"
                          onClick={openFilePicker}
                        >
                          Upload file…
                        </button>
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => void onFilePicked(e.target.files)}
                  />
                </nav>

                <button
                  type="button"
                  className="btn-icon shrink-0"
                  disabled={busy}
                  onClick={() => void refresh()}
                  title="Refresh"
                  aria-label="Refresh"
                >
                  <RefreshIcon />
                </button>
              </div>

              <div
                className="overflow-x-auto rounded-lg border"
                style={{ borderColor: 'var(--border)' }}
              >
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr
                      className="border-b text-xs uppercase tracking-wide"
                      style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                    >
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Size</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Created</th>
                      <th className="px-3 py-2 font-medium">Updated</th>
                      <th className="px-3 py-2 font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {folders.map((folder) => (
                      <tr
                        key={folder}
                        className="border-b last:border-0"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="inline-flex max-w-full items-center gap-2 font-medium"
                            onClick={() => void navigateTo(folder)}
                          >
                            <span style={{ color: 'var(--muted)' }}>
                              <FolderIcon />
                            </span>
                            <span className="truncate">{folderLabel(folder, prefix)}/</span>
                          </button>
                        </td>
                        <td className="px-3 py-2" style={{ color: 'var(--muted)' }}>
                          —
                        </td>
                        <td className="px-3 py-2" style={{ color: 'var(--muted)' }}>
                          Folder
                        </td>
                        <td className="px-3 py-2" style={{ color: 'var(--muted)' }}>
                          —
                        </td>
                        <td className="px-3 py-2" style={{ color: 'var(--muted)' }}>
                          —
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            className="btn-icon btn-icon-danger"
                            title="Delete folder"
                            disabled={busy}
                            onClick={() =>
                              run(() => api.deleteObject(selectedBucket, folder), 'Folder deleted.')
                            }
                          >
                            <DeleteIcon />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {objects.map((obj) => {
                      const shortName = obj.name.slice(prefix.length) || obj.name;
                      return (
                        <tr
                          key={obj.name}
                          className="border-b last:border-0"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          <td className="px-3 py-2">
                            <span className="inline-flex max-w-full items-center gap-2">
                              <span style={{ color: 'var(--muted)' }}>
                                <FileIcon />
                              </span>
                              <span className="truncate font-medium">{shortName}</span>
                            </span>
                          </td>
                          <td className="px-3 py-2" style={{ color: 'var(--muted)' }}>
                            {formatBytes(obj.size)}
                          </td>
                          <td className="px-3 py-2" style={{ color: 'var(--muted)' }}>
                            {guessType(shortName, obj.contentType)}
                          </td>
                          <td className="px-3 py-2" style={{ color: 'var(--muted)' }}>
                            {formatDate(obj.timeCreated)}
                          </td>
                          <td className="px-3 py-2" style={{ color: 'var(--muted)' }}>
                            {formatDate(obj.updated)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-0.5">
                              <a
                                className="btn-icon"
                                href={api.downloadObjectUrl(selectedBucket, obj.name)}
                                target="_blank"
                                rel="noreferrer"
                                title="Download"
                                aria-label="Download"
                              >
                                <DownloadIcon />
                              </a>
                              <button
                                type="button"
                                className="btn-icon"
                                title="Edit metadata"
                                aria-label="Edit metadata"
                                disabled={busy}
                                onClick={() => void openEditModal(obj)}
                              >
                                <EditIcon />
                              </button>
                              <button
                                type="button"
                                className="btn-icon btn-icon-danger"
                                title="Delete object"
                                disabled={busy}
                                onClick={() =>
                                  run(
                                    () => api.deleteObject(selectedBucket, obj.name),
                                    'Object deleted.'
                                  )
                                }
                              >
                                <DeleteIcon />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {empty && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-8 text-center text-sm"
                          style={{ color: 'var(--muted)' }}
                        >
                          This folder is empty. Use + to create a folder or upload a file.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      {modal && (
        <div className="modal-overlay" role="presentation" onClick={() => !busy && setModal(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="storage-add-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="storage-add-title" className="mb-1 text-lg font-semibold">
              {modal.kind === 'folder'
                ? 'Create folder'
                : modal.kind === 'text'
                  ? 'New text document'
                  : 'Upload file'}
            </h2>
            <p className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>
              Destination:{' '}
              <code>
                {selectedBucket}/{prefix}
              </code>
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm" style={{ color: 'var(--muted)' }}>
                  {modal.kind === 'folder' ? 'Folder name' : 'Object name'}
                </label>
                <input
                  className="input"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  disabled={busy}
                  placeholder={
                    modal.kind === 'folder'
                      ? 'reports'
                      : modal.kind === 'text'
                        ? 'notes.txt'
                        : modal.originalName
                  }
                  autoFocus
                />
              </div>

              {modal.kind === 'text' && (
                <div>
                  <label className="mb-1 block text-sm" style={{ color: 'var(--muted)' }}>
                    Content
                  </label>
                  <textarea
                    className="input min-h-[140px] font-mono"
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    disabled={busy}
                    placeholder="Plain text…"
                  />
                </div>
              )}

              {modal.kind === 'file' && (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Selected: <code>{modal.originalName}</code> ({modal.contentType})
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="btn-ghost"
                disabled={busy}
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={busy || !draftName.trim()}
                onClick={() => void submitModal()}
              >
                {modal.kind === 'folder' ? 'Create' : modal.kind === 'text' ? 'Save' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editObject && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => !busy && setEditObject(null)}
        >
          <div
            className="modal modal-wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="storage-edit-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="storage-edit-title" className="mb-1 text-lg font-semibold">
              Edit object
            </h2>
            <p className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>
              Update name, content type, encoding and custom metadata.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm" style={{ color: 'var(--muted)' }}>
                  Name
                </label>
                <input
                  className="input font-mono"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={busy}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm" style={{ color: 'var(--muted)' }}>
                    Content-Type
                  </label>
                  <input
                    className="input"
                    value={editContentType}
                    onChange={(e) => setEditContentType(e.target.value)}
                    disabled={busy}
                    placeholder="text/plain"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm" style={{ color: 'var(--muted)' }}>
                    Content-Encoding
                  </label>
                  <input
                    className="input"
                    value={editEncoding}
                    onChange={(e) => setEditEncoding(e.target.value)}
                    disabled={busy}
                    placeholder="gzip / identity"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm" style={{ color: 'var(--muted)' }}>
                  Custom metadata
                </label>
                <div className="space-y-2">
                  {editMetaRows.map((row, index) => {
                    const isAddRow = index === editMetaRows.length - 1;
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          className="input"
                          placeholder="key"
                          value={row.key}
                          disabled={busy}
                          onChange={(e) =>
                            setEditMetaRows((rows) =>
                              rows.map((r, i) => (i === index ? { ...r, key: e.target.value } : r))
                            )
                          }
                        />
                        <input
                          className="input"
                          placeholder="value"
                          value={row.value}
                          disabled={busy}
                          onChange={(e) =>
                            setEditMetaRows((rows) =>
                              rows.map((r, i) =>
                                i === index ? { ...r, value: e.target.value } : r
                              )
                            )
                          }
                        />
                        {isAddRow ? (
                          <button
                            type="button"
                            className="btn-icon shrink-0"
                            disabled={busy}
                            onClick={() =>
                              setEditMetaRows((rows) => [...rows, { key: '', value: '' }])
                            }
                            title="Add field"
                            aria-label="Add field"
                          >
                            <PlusIcon />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-icon btn-icon-danger shrink-0"
                            disabled={busy}
                            onClick={() =>
                              setEditMetaRows((rows) => rows.filter((_, i) => i !== index))
                            }
                            title="Remove field"
                            aria-label="Remove field"
                          >
                            <DeleteIcon />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm" style={{ color: 'var(--muted)' }}>
                  Public URL (emulator direct)
                </label>
                <div className="flex gap-1">
                  <input className="input font-mono text-xs" value={publicUrl} readOnly />
                  <button
                    type="button"
                    className="btn-icon shrink-0"
                    disabled={!publicUrl}
                    onClick={() => void navigator.clipboard.writeText(publicUrl)}
                    title="Copy URL"
                    aria-label="Copy URL"
                  >
                    <CopyIcon />
                  </button>
                  {publicUrl && (
                    <a
                      className="btn-icon shrink-0"
                      href={publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Open URL"
                      aria-label="Open URL"
                    >
                      <ExternalLinkIcon />
                    </a>
                  )}
                </div>
                <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                  Hits fake-gcs-server directly (`STORAGE_EMULATOR_HOST`), not the API proxy.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="btn-ghost"
                disabled={busy}
                onClick={() => setEditObject(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={busy || !editName.trim()}
                onClick={() => void submitEdit()}
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
