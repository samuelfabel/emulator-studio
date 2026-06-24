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

export interface InstalledEmulator {
  id: string;
  installedAt: string;
  config: PubSubEmulatorConfig | Record<string, string>;
}

export interface EmulatorRuntimeStatus {
  id: string;
  running: boolean;
  /** True when this API started the emulator process. */
  managed?: boolean;
  pid?: number;
  startedAt?: string;
  hostPort?: string;
  projectId?: string;
  error?: string;
}

export interface EmulatorListItem extends EmulatorCatalogItem {
  installed: boolean;
  installedAt?: string;
  config?: PubSubEmulatorConfig | Record<string, string>;
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
    description: 'Object storage emulator (coming soon).',
    installable: false,
  },
];

export const DEFAULT_PUBSUB_CONFIG: PubSubEmulatorConfig = {
  projectId: 'local-dev',
  hostPort: 'localhost:8085',
};
