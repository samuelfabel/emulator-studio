export interface EmulatorCatalogItem {
  id: string;
  name: string;
  description: string;
  installable: boolean;
}

export interface PubSubEmulatorConfig {
  projectId: string;
  hostPort: string;
}

/** Cloud Storage local emulator (fake-gcs-server). */
export interface StorageEmulatorConfig {
  projectId: string;
  /** e.g. localhost:4443 — API sets STORAGE_EMULATOR_HOST=http://… */
  hostPort: string;
}

export interface InstalledEmulator {
  id: string;
  installedAt: string;
  config: PubSubEmulatorConfig | StorageEmulatorConfig | Record<string, string>;
}

export interface EmulatorRuntimeStatus {
  id: string;
  running: boolean;
  /** True when this API started the emulator process. */
  managed?: boolean;
  pid?: number;
  /** Short Docker container ID when the emulator runs in a container. */
  containerId?: string;
  startedAt?: string;
  hostPort?: string;
  projectId?: string;
  error?: string;
}

export interface EmulatorListItem extends EmulatorCatalogItem {
  installed: boolean;
  installedAt?: string;
  config?: PubSubEmulatorConfig | StorageEmulatorConfig | Record<string, string>;
  runtime?: EmulatorRuntimeStatus;
}

export const EMULATOR_CATALOG: EmulatorCatalogItem[] = [
  {
    id: 'pubsub',
    name: 'Cloud Pub/Sub',
    description: 'Topics, subscriptions, publish and pull messages locally.',
    installable: true,
  },
  {
    id: 'firestore',
    name: 'Cloud Firestore',
    description: 'Document database emulator (coming soon).',
    installable: false,
  },
  {
    id: 'storage',
    name: 'Cloud Storage',
    description:
      'Buckets and objects via fake-gcs-server (browse folders, upload, download, delete). Requires Docker.',
    installable: true,
  },
];

export const DEFAULT_PUBSUB_CONFIG: PubSubEmulatorConfig = {
  projectId: 'local-dev',
  hostPort: 'localhost:8085',
};

export const DEFAULT_STORAGE_CONFIG: StorageEmulatorConfig = {
  projectId: 'local-dev',
  hostPort: 'localhost:4443',
};
