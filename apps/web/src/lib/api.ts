import type {
  ConnectionStatus,
  EmulatorListItem,
  EmulatorRuntimeStatus,
  PublishResult,
  PullResult,
  PubSubEmulatorConfig,
  StorageBucketInfo,
  StorageConnectionStatus,
  StorageEmulatorConfig,
  StorageListResult,
  StorageObjectInfo,
} from '@emulator-studio/shared';

// In dev, leave unset so requests go through the Vite proxy (see vite.config.ts).
// In production, set VITE_API_URL to the API origin (e.g. http://localhost:3001).
const API_URL = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? `Request failed (${res.status})`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listEmulators: () => request<EmulatorListItem[]>('/api/emulators'),
  installEmulator: (id: string, config?: Partial<PubSubEmulatorConfig | StorageEmulatorConfig>) =>
    request(`/api/emulators/${id}/install`, {
      method: 'POST',
      body: JSON.stringify({ config }),
    }).then(() => undefined),
  uninstallEmulator: (id: string) =>
    request<{ id: string; uninstalled: boolean }>(`/api/emulators/${id}/uninstall`, {
      method: 'DELETE',
    }).then(() => undefined),
  getPubSubConfig: () => request<PubSubEmulatorConfig>('/api/emulators/pubsub/config'),
  updatePubSubConfig: (config: PubSubEmulatorConfig) =>
    request<PubSubEmulatorConfig>('/api/emulators/pubsub/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    }).then(() => undefined),
  getPubSubRuntime: () => request<EmulatorRuntimeStatus>('/api/emulators/pubsub/runtime'),
  startPubSub: () =>
    request<EmulatorRuntimeStatus>('/api/emulators/pubsub/start', { method: 'POST' }).then(
      () => undefined
    ),
  stopPubSub: () =>
    request<EmulatorRuntimeStatus>('/api/emulators/pubsub/stop', { method: 'POST' }).then(
      () => undefined
    ),

  getStorageConfig: () => request<StorageEmulatorConfig>('/api/emulators/storage/config'),
  updateStorageConfig: (config: StorageEmulatorConfig) =>
    request<StorageEmulatorConfig>('/api/emulators/storage/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    }).then(() => undefined),
  getStorageRuntime: () => request<EmulatorRuntimeStatus>('/api/emulators/storage/runtime'),
  startStorage: () =>
    request<EmulatorRuntimeStatus>('/api/emulators/storage/start', { method: 'POST' }).then(
      () => undefined
    ),
  stopStorage: () =>
    request<EmulatorRuntimeStatus>('/api/emulators/storage/stop', { method: 'POST' }).then(
      () => undefined
    ),
  restartStorage: () =>
    request<EmulatorRuntimeStatus>('/api/emulators/storage/restart', { method: 'POST' }).then(
      () => undefined
    ),

  getPubSubStatus: () => request<ConnectionStatus>('/api/pubsub/status'),
  createTopic: (name: string) =>
    request<{ name: string }>('/api/pubsub/topics', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  deleteTopic: (name: string) =>
    request<void>(`/api/pubsub/topics/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  createSubscription: (name: string, topicName: string) =>
    request<{ name: string; topic: string }>('/api/pubsub/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ name, topicName }),
    }),
  deleteSubscription: (name: string) =>
    request<void>(`/api/pubsub/subscriptions/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    }),
  publish: (topic: string, message: string) =>
    request<PublishResult>('/api/pubsub/publish', {
      method: 'POST',
      body: JSON.stringify({ topic, message }),
    }),
  pull: (name: string, options?: { ack?: boolean; maxMessages?: number }) =>
    request<PullResult>(`/api/pubsub/subscriptions/${encodeURIComponent(name)}/pull`, {
      method: 'POST',
      body: JSON.stringify({
        maxMessages: options?.maxMessages ?? 5,
        ack: options?.ack ?? true,
      }),
    }),

  getStorageStatus: () => request<StorageConnectionStatus>('/api/storage/status'),
  createBucket: (name: string) =>
    request<StorageBucketInfo>('/api/storage/buckets', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  deleteBucket: (name: string, force = false) =>
    request<void>(
      `/api/storage/buckets/${encodeURIComponent(name)}?force=${force ? 'true' : 'false'}`,
      { method: 'DELETE' }
    ),
  getBucketIam: (name: string) =>
    request<{
      supported: boolean;
      bindings?: Array<{ role: string; members: string[] }>;
      note?: string;
    }>(`/api/storage/buckets/${encodeURIComponent(name)}/iam`),
  listObjects: (bucket: string, prefix = '') =>
    request<StorageListResult>(
      `/api/storage/buckets/${encodeURIComponent(bucket)}/objects?prefix=${encodeURIComponent(prefix)}`
    ),
  getObjectMeta: (bucket: string, name: string) =>
    request<StorageObjectInfo>(
      `/api/storage/buckets/${encodeURIComponent(bucket)}/objects/meta?name=${encodeURIComponent(name)}`
    ),
  updateObject: (
    bucket: string,
    name: string,
    body: {
      newName?: string;
      contentType?: string;
      contentEncoding?: string;
      metadata?: Record<string, string>;
    }
  ) =>
    request<StorageObjectInfo>(
      `/api/storage/buckets/${encodeURIComponent(bucket)}/objects?name=${encodeURIComponent(name)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      }
    ),
  uploadObject: (
    bucket: string,
    name: string,
    content: string,
    options?: { encoding?: 'utf8' | 'base64'; contentType?: string }
  ) =>
    request<StorageObjectInfo>(`/api/storage/buckets/${encodeURIComponent(bucket)}/objects`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        content,
        encoding: options?.encoding ?? 'utf8',
        contentType: options?.contentType,
      }),
    }),
  createFolder: (bucket: string, path: string) =>
    request<StorageObjectInfo>(`/api/storage/buckets/${encodeURIComponent(bucket)}/folders`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),
  deleteObject: (bucket: string, name: string) =>
    request<void>(
      `/api/storage/buckets/${encodeURIComponent(bucket)}/objects?name=${encodeURIComponent(name)}`,
      { method: 'DELETE' }
    ),
  downloadObjectUrl: (bucket: string, name: string) =>
    `${API_URL}/api/storage/buckets/${encodeURIComponent(bucket)}/objects/download?name=${encodeURIComponent(name)}`,
};
