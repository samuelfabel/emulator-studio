import type {
  ConnectionStatus,
  EmulatorListItem,
  EmulatorRuntimeStatus,
  PublishResult,
  PullResult,
  PubSubEmulatorConfig,
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
  installEmulator: (id: string, config?: Partial<PubSubEmulatorConfig>) =>
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
};
