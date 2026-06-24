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

export const RESOURCE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9._~-]{0,254}$/;

export function validateResourceName(name: string, label: string): string | null {
  if (!name.trim()) return `${label} is required.`;
  if (!RESOURCE_NAME_PATTERN.test(name)) {
    return `Invalid ${label}. Must start with a letter and contain only letters, numbers, ".", "_", "~", "-" or "+".`;
  }
  return null;
}
