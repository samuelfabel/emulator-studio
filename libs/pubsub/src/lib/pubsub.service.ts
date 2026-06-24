import { PubSub, v1 } from '@google-cloud/pubsub';
import type {
  ConnectionStatus,
  PublishResult,
  PulledMessage,
  PullResult,
  SubscriptionInfo,
} from '@emulator-studio/shared';

export interface PubSubServiceOptions {
  projectId: string;
  pubsub?: PubSub;
}

export class PubSubService {
  private projectId: string;
  private pubsub: PubSub;
  private subscriberClient: v1.SubscriberClient | null = null;
  private subscriberClientPromise: Promise<v1.SubscriberClient> | null = null;

  constructor(options: PubSubServiceOptions) {
    this.projectId = options.projectId;
    this.pubsub = options.pubsub ?? new PubSub({ projectId: options.projectId });
  }

  getProjectId(): string {
    return this.projectId;
  }

  syncFromEnvironment(): void {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? 'local-dev';
    this.syncProject(projectId);
  }

  syncProject(projectId: string): void {
    if (projectId === this.projectId) {
      return;
    }

    this.projectId = projectId;
    this.pubsub = new PubSub({ projectId });
    this.resetSubscriberClient();
  }

  private resetSubscriberClient(): void {
    if (this.subscriberClient) {
      void this.subscriberClient.close();
    }
    this.subscriberClient = null;
    this.subscriberClientPromise = null;
  }

  private ensureProjectSynced(): void {
    this.syncFromEnvironment();
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    this.ensureProjectSynced();
    const host = process.env.PUBSUB_EMULATOR_HOST ?? '(not set)';

    if (!process.env.PUBSUB_EMULATOR_HOST) {
      return {
        connected: false,
        host,
        projectId: this.projectId,
        topics: [],
        subscriptions: [],
        error: 'PUBSUB_EMULATOR_HOST is not set in the environment.',
      };
    }

    try {
      const [[topics], [subscriptions]] = await Promise.all([
        this.pubsub.getTopics(),
        this.pubsub.getSubscriptions(),
      ]);

      const topicNames = topics
        .map((t) => t.name?.split('/').pop())
        .filter((name): name is string => Boolean(name));

      const subscriptionList: SubscriptionInfo[] = await Promise.all(
        subscriptions.map(async (sub) => {
          const name = sub.name?.split('/').pop() ?? '(unnamed)';
          let topic: string | null = null;
          try {
            const [metadata] = await sub.getMetadata();
            topic = metadata.topic?.split('/').pop() ?? null;
          } catch {
            // ignore per-subscription metadata errors
          }
          return { name, topic };
        })
      );

      return {
        connected: true,
        host,
        projectId: this.projectId,
        topics: topicNames,
        subscriptions: subscriptionList,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        connected: false,
        host,
        projectId: this.projectId,
        topics: [],
        subscriptions: [],
        error: message,
      };
    }
  }

  async createTopic(topicName: string): Promise<void> {
    this.ensureProjectSynced();
    const topic = this.pubsub.topic(topicName);
    const [exists] = await topic.exists();
    if (exists) {
      throw new Error(`Topic "${topicName}" already exists.`);
    }
    await this.pubsub.createTopic(topicName);
  }

  async deleteTopic(topicName: string): Promise<void> {
    this.ensureProjectSynced();
    const topic = this.pubsub.topic(topicName);
    const [exists] = await topic.exists();
    if (!exists) {
      throw new Error(`Topic "${topicName}" does not exist.`);
    }
    await topic.delete();
  }

  async createSubscription(topicName: string, subscriptionName: string): Promise<void> {
    this.ensureProjectSynced();
    const topic = this.pubsub.topic(topicName);
    const [topicExists] = await topic.exists();
    if (!topicExists) {
      throw new Error(`Topic "${topicName}" does not exist. Create the topic first.`);
    }

    const subscription = topic.subscription(subscriptionName);
    const [subExists] = await subscription.exists();
    if (subExists) {
      throw new Error(`Subscription "${subscriptionName}" already exists.`);
    }

    await topic.createSubscription(subscriptionName);
  }

  async deleteSubscription(subscriptionName: string): Promise<void> {
    this.ensureProjectSynced();
    const subscription = this.pubsub.subscription(subscriptionName);
    const [exists] = await subscription.exists();
    if (!exists) {
      throw new Error(`Subscription "${subscriptionName}" does not exist.`);
    }
    await subscription.delete();
  }

  async publishMessage(topicName: string, message: string): Promise<PublishResult> {
    this.ensureProjectSynced();
    const topic = this.pubsub.topic(topicName);
    const [exists] = await topic.exists();
    if (!exists) {
      throw new Error(`Topic "${topicName}" does not exist. Select an existing topic.`);
    }

    const dataBuffer = Buffer.from(message);
    const messageId = await topic.publishMessage({ data: dataBuffer });

    return {
      messageId,
      topic: topicName,
      projectId: this.projectId,
    };
  }

  async pullMessages(subscriptionName: string, maxMessages = 5, ack = true): Promise<PullResult> {
    this.ensureProjectSynced();
    const subscription = this.pubsub.subscription(subscriptionName);
    const [exists] = await subscription.exists();
    if (!exists) {
      throw new Error(`Subscription "${subscriptionName}" does not exist.`);
    }

    const subscriberClient = await this.getSubscriberClient();
    const subscriptionPath = subscriberClient.subscriptionPath(this.projectId, subscriptionName);

    const [response] = await subscriberClient.pull({
      subscription: subscriptionPath,
      maxMessages,
      returnImmediately: true,
    });

    const received = response.receivedMessages ?? [];
    if (!received.length) {
      return {
        subscription: subscriptionName,
        messages: [],
        count: 0,
        acked: ack,
      };
    }

    const ackIds = received.map((msg) => msg.ackId).filter((id): id is string => Boolean(id));

    if (ack) {
      await subscriberClient.acknowledge({
        subscription: subscriptionPath,
        ackIds,
      });
    } else {
      await subscriberClient.modifyAckDeadline({
        subscription: subscriptionPath,
        ackIds,
        ackDeadlineSeconds: 0,
      });
    }

    const messages: PulledMessage[] = received.map((receivedMsg) => {
      const pubsubMessage = receivedMsg.message;
      const data = pubsubMessage?.data
        ? Buffer.from(pubsubMessage.data as Uint8Array).toString('utf8')
        : '';

      return {
        messageId: pubsubMessage?.messageId ?? undefined,
        publishTime: this.formatPublishTime(pubsubMessage?.publishTime),
        orderingKey: pubsubMessage?.orderingKey || undefined,
        attributes: pubsubMessage?.attributes ? { ...pubsubMessage.attributes } : {},
        data,
        ackId: receivedMsg.ackId ?? undefined,
      };
    });

    return { subscription: subscriptionName, messages, count: messages.length, acked: ack };
  }

  private formatPublishTime(value: unknown): string | undefined {
    if (!value) return undefined;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null && 'seconds' in value) {
      const record = value as { seconds?: string | number; nanos?: number };
      const seconds = Number(record.seconds ?? 0);
      const nanos = Number(record.nanos ?? 0);
      return new Date(seconds * 1000 + nanos / 1_000_000).toISOString();
    }
    return String(value);
  }

  async close(): Promise<void> {
    if (this.subscriberClient) {
      await this.subscriberClient.close();
      this.subscriberClient = null;
      this.subscriberClientPromise = null;
    }

    await new Promise<void>((resolve, reject) => {
      this.pubsub.close((err) => (err ? reject(err) : resolve()));
    });
  }

  private async getSubscriberClient(): Promise<v1.SubscriberClient> {
    if (!this.subscriberClient) {
      if (!this.subscriberClientPromise) {
        this.subscriberClientPromise = this.pubsub.getClientConfig().then((options) => {
          this.subscriberClient = new v1.SubscriberClient(
            options as ConstructorParameters<typeof v1.SubscriberClient>[0]
          );
          return this.subscriberClient;
        });
      }
      await this.subscriberClientPromise;
    }
    return this.subscriberClient as v1.SubscriberClient;
  }
}
