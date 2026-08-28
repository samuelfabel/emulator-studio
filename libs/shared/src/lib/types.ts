export interface SubscriptionInfo {
  name: string;
  topic: string | null;
}

export interface ConnectionStatus {
  connected: boolean;
  host: string;
  projectId: string;
  topics: string[];
  subscriptions: SubscriptionInfo[];
  error?: string;
}

export interface PublishResult {
  messageId: string;
  topic: string;
  projectId: string;
}

export interface PulledMessage {
  messageId?: string;
  publishTime?: string;
  orderingKey?: string;
  attributes: Record<string, string>;
  data: string;
  ackId?: string;
}

export interface PullResult {
  subscription: string;
  messages: PulledMessage[];
  count: number;
  acked: boolean;
}

export interface ApiError {
  error: string;
}

export interface StorageConnectionStatus {
  connected: boolean;
  host: string;
  projectId: string;
  buckets: StorageBucketInfo[];
  error?: string;
}

export interface StorageBucketInfo {
  name: string;
  location?: string;
  storageClass?: string;
  timeCreated?: string;
  updated?: string;
}

export interface StorageObjectInfo {
  name: string;
  /** True when this entry is a folder prefix (delimiter listing). */
  isFolder: boolean;
  size?: string;
  contentType?: string;
  contentEncoding?: string;
  timeCreated?: string;
  updated?: string;
  generation?: string;
  md5Hash?: string;
  metadata?: Record<string, string>;
}

export interface UpdateStorageObjectInput {
  /** Rename object (same bucket). */
  newName?: string;
  contentType?: string;
  contentEncoding?: string;
  /** Custom metadata map (replaces existing custom metadata when provided). */
  metadata?: Record<string, string>;
}

export interface StorageListResult {
  bucket: string;
  prefix: string;
  folders: string[];
  objects: StorageObjectInfo[];
}

export const RESOURCE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9._~-]{0,254}$/;

/** GCS bucket naming (simplified for local emulator). */
export const BUCKET_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$/;

export function validateBucketName(name: string): string | null {
  if (!name.trim()) return 'Bucket name is required.';
  if (name.length < 3 || name.length > 63) {
    return 'Bucket name must be between 3 and 63 characters.';
  }
  if (!BUCKET_NAME_PATTERN.test(name)) {
    return 'Invalid bucket name. Use lowercase letters, numbers, ".", "_", "-".';
  }
  return null;
}

export function validateResourceName(name: string, label: string): string | null {
  if (!name.trim()) return `${label} is required.`;
  if (!RESOURCE_NAME_PATTERN.test(name)) {
    return `Invalid ${label}. Must start with a letter and contain only letters, numbers, ".", "_", "~", "-" or "+".`;
  }
  return null;
}
