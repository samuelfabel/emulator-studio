import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PubSubService } from './pubsub.service';

describe('PubSubService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, PUBSUB_EMULATOR_HOST: 'localhost:8085' };
  });

  it('reports disconnected when emulator host is missing', async () => {
    delete process.env.PUBSUB_EMULATOR_HOST;

    const service = new PubSubService({
      projectId: 'local-dev',
      pubsub: {} as never,
    });

    const status = await service.getConnectionStatus();
    expect(status.connected).toBe(false);
    expect(status.error).toMatch(/PUBSUB_EMULATOR_HOST/);
  });

  it('creates topic when it does not exist', async () => {
    const createTopic = vi.fn().mockResolvedValue(undefined);
    const exists = vi.fn().mockResolvedValue([false]);

    const pubsub = {
      topic: vi.fn().mockReturnValue({ exists }),
      createTopic,
      close: vi.fn((cb: (err?: Error) => void) => cb()),
    };

    const service = new PubSubService({ projectId: 'local-dev', pubsub: pubsub as never });
    await service.createTopic('orders');

    expect(createTopic).toHaveBeenCalledWith('orders');
  });

  it('throws when publishing to missing topic', async () => {
    const pubsub = {
      topic: vi.fn().mockReturnValue({ exists: vi.fn().mockResolvedValue([false]) }),
      close: vi.fn((cb: (err?: Error) => void) => cb()),
    };

    const service = new PubSubService({ projectId: 'local-dev', pubsub: pubsub as never });

    await expect(service.publishMessage('missing', 'hello')).rejects.toThrow(/does not exist/);
  });
});
