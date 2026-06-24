import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './app.module';
import { PubSubService } from '@emulator-studio/pubsub';

function createMockService(): PubSubService {
  return {
    getConnectionStatus: vi.fn().mockResolvedValue({
      connected: true,
      host: 'localhost:8085',
      projectId: 'local-dev',
      topics: ['orders'],
      subscriptions: [],
    }),
    createTopic: vi.fn(),
    deleteTopic: vi.fn(),
    createSubscription: vi.fn(),
    deleteSubscription: vi.fn(),
    publishMessage: vi.fn().mockResolvedValue({
      messageId: '1',
      topic: 'orders',
      projectId: 'local-dev',
    }),
    pullMessages: vi.fn(),
    close: vi.fn(),
    getProjectId: vi.fn().mockReturnValue('local-dev'),
    syncProject: vi.fn(),
    syncFromEnvironment: vi.fn(),
  } as unknown as PubSubService;
}

describe('API (NestJS)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PubSubService)
      .useValue(createMockService())
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns health check', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('returns pubsub status', async () => {
    const res = await request(app.getHttpServer()).get('/api/pubsub/status');
    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(true);
  });

  it('publishes a message', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/pubsub/publish')
      .send({ topic: 'orders', message: 'hello' });
    expect(res.status).toBe(201);
    expect(res.body.messageId).toBe('1');
  });
});
