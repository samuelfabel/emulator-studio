import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      STORAGE_EMULATOR_HOST: 'http://localhost:4443',
      GOOGLE_CLOUD_PROJECT: 'local-dev',
    };
  });

  it('reports disconnected when STORAGE_EMULATOR_HOST is missing', async () => {
    delete process.env.STORAGE_EMULATOR_HOST;

    const service = new StorageService({
      projectId: 'local-dev',
      storage: {} as never,
    });

    const status = await service.getConnectionStatus();
    expect(status.connected).toBe(false);
    expect(status.error).toMatch(/STORAGE_EMULATOR_HOST/);
  });

  it('restores STORAGE_EMULATOR_HOST after creating the real client', () => {
    process.env.STORAGE_EMULATOR_HOST = 'http://localhost:4443';

    const service = new StorageService({ projectId: 'local-dev' });
    expect(service.getProjectId()).toBe('local-dev');
    expect(process.env.STORAGE_EMULATOR_HOST).toBe('http://localhost:4443');
  });

  it('lists buckets when connected', async () => {
    const getBuckets = vi.fn().mockResolvedValue([
      [{ name: 'ondt-paysource-load-dev', metadata: { location: 'US' } }],
    ]);

    const service = new StorageService({
      projectId: 'local-dev',
      storage: { getBuckets } as never,
    });

    const status = await service.getConnectionStatus();
    expect(status.connected).toBe(true);
    expect(status.buckets).toEqual([
      expect.objectContaining({ name: 'ondt-paysource-load-dev', location: 'US' }),
    ]);
  });

  it('lists objects with folder prefixes', async () => {
    const getFiles = vi.fn().mockResolvedValue([
      [{ name: 'docs/readme.txt', metadata: { size: '12', contentType: 'text/plain' } }],
      undefined,
      { prefixes: ['docs/archive/'] },
    ]);

    const service = new StorageService({
      projectId: 'local-dev',
      storage: {
        bucket: vi.fn().mockReturnValue({ getFiles }),
      } as never,
    });

    const listing = await service.listObjects('demo', 'docs');
    expect(listing.prefix).toBe('docs/');
    expect(listing.folders).toEqual(['docs/archive/']);
    expect(listing.objects[0]?.name).toBe('docs/readme.txt');
  });

  it('uploads and deletes objects', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const deleteFn = vi.fn().mockResolvedValue(undefined);
    const getMetadata = vi.fn().mockResolvedValue([
      {
        name: 'a.txt',
        size: '5',
        contentType: 'text/plain',
      },
    ]);

    const file = { save, delete: deleteFn, getMetadata, name: 'a.txt', metadata: {} };
    const service = new StorageService({
      projectId: 'local-dev',
      storage: {
        bucket: vi.fn().mockReturnValue({
          file: vi.fn().mockReturnValue(file),
        }),
      } as never,
    });

    const uploaded = await service.uploadObject('demo', 'a.txt', 'hello', 'text/plain');
    expect(save).toHaveBeenCalled();
    expect(uploaded.name).toBe('a.txt');

    await service.deleteObject('demo', 'a.txt');
    expect(deleteFn).toHaveBeenCalledWith({ ignoreNotFound: true });
  });

  it('replaces custom metadata by clearing then writing desired keys', async () => {
    const setMetadata = vi.fn().mockResolvedValue([{}]);
    const getMetadata = vi.fn().mockResolvedValue([
      {
        name: 'a.txt',
        size: '1',
        contentType: 'text/plain',
        metadata: { keep: 'yes' },
      },
    ]);

    const file = { setMetadata, getMetadata, name: 'a.txt', metadata: {} };
    const service = new StorageService({
      projectId: 'local-dev',
      storage: {
        bucket: vi.fn().mockReturnValue({
          file: vi.fn().mockReturnValue(file),
        }),
      } as never,
    });

    await service.updateObject('demo', 'a.txt', { metadata: { keep: 'yes' } });

    expect(setMetadata).toHaveBeenNthCalledWith(1, { metadata: null });
    expect(setMetadata).toHaveBeenNthCalledWith(2, {
      metadata: { keep: 'yes' },
    });
  });
});
