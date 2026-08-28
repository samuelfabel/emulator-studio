import { Storage, type Bucket, type File } from '@google-cloud/storage';
import type {
  StorageBucketInfo,
  StorageConnectionStatus,
  StorageListResult,
  StorageObjectInfo,
} from '@emulator-studio/shared';

export interface StorageServiceOptions {
  projectId: string;
  storage?: Storage;
}

function normalizeHost(host: string): string {
  const trimmed = host.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `http://${trimmed}`;
}

export class StorageService {
  private projectId: string;
  private storage: Storage;
  private readonly injectedClient: boolean;

  constructor(options: StorageServiceOptions) {
    this.projectId = options.projectId;
    this.injectedClient = Boolean(options.storage);
    this.storage = options.storage ?? this.createClient(options.projectId);
  }

  getProjectId(): string {
    return this.projectId;
  }

  syncFromEnvironment(): void {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? 'local-dev';
    this.syncProject(projectId);
  }

  syncProject(projectId: string): void {
    this.projectId = projectId;
    this.storage = this.createClient(projectId);
  }

  private createClient(projectId: string): Storage {
    const rawHost = process.env.STORAGE_EMULATOR_HOST?.trim();
    if (!rawHost) {
      return new Storage({ projectId });
    }

    // Strip accidental /storage/v1 suffix — apiEndpoint should be the host only.
    const apiEndpoint = normalizeHost(rawHost.replace(/\/storage\/v1\/?$/i, ''));

    // @google-cloud/storage treats STORAGE_EMULATOR_HOST as the full JSON API
    // baseUrl *without* appending `/storage/v1`. That makes listBuckets hit
    // `GET /b` on fake-gcs-server → "no bucket named b". Constructing with
    // apiEndpoint alone yields `${apiEndpoint}/storage/v1` as expected.
    const previous = process.env.STORAGE_EMULATOR_HOST;
    delete process.env.STORAGE_EMULATOR_HOST;
    try {
      return new Storage({
        projectId,
        apiEndpoint,
      });
    } finally {
      process.env.STORAGE_EMULATOR_HOST = previous;
    }
  }

  private ensureSynced(): void {
    if (this.injectedClient) return;
    this.syncFromEnvironment();
  }

  async getConnectionStatus(): Promise<StorageConnectionStatus> {
    this.ensureSynced();
    const host = process.env.STORAGE_EMULATOR_HOST ?? '(not set)';

    if (!process.env.STORAGE_EMULATOR_HOST) {
      return {
        connected: false,
        host,
        projectId: this.projectId,
        buckets: [],
        error: 'STORAGE_EMULATOR_HOST is not set in the environment.',
      };
    }

    try {
      const buckets = await this.listBuckets();
      return {
        connected: true,
        host: normalizeHost(host),
        projectId: this.projectId,
        buckets,
      };
    } catch (err) {
      return {
        connected: false,
        host: normalizeHost(host),
        projectId: this.projectId,
        buckets: [],
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async listBuckets(): Promise<StorageBucketInfo[]> {
    this.ensureSynced();
    const [buckets] = await this.storage.getBuckets();
    return buckets.map((b) => this.toBucketInfo(b));
  }

  async createBucket(name: string): Promise<StorageBucketInfo> {
    this.ensureSynced();
    const [bucket] = await this.storage.createBucket(name);
    return this.toBucketInfo(bucket);
  }

  async deleteBucket(name: string, force = false): Promise<void> {
    this.ensureSynced();
    const bucket = this.storage.bucket(name);
    if (force) {
      await bucket.deleteFiles({ force: true });
    }
    await bucket.delete({ ignoreNotFound: true });
  }

  async getBucket(name: string): Promise<StorageBucketInfo> {
    this.ensureSynced();
    const bucket = this.storage.bucket(name);
    const [metadata] = await bucket.getMetadata();
    return {
      name: metadata.name ?? name,
      location: metadata.location,
      storageClass: metadata.storageClass,
      timeCreated: metadata.timeCreated,
      updated: metadata.updated,
    };
  }

  async listObjects(bucketName: string, prefix = ''): Promise<StorageListResult> {
    this.ensureSynced();
    const normalizedPrefix = prefix && !prefix.endsWith('/') ? `${prefix}/` : prefix;
    const bucket = this.storage.bucket(bucketName);
    const [files, , apiResponse] = await bucket.getFiles({
      prefix: normalizedPrefix || undefined,
      delimiter: '/',
      autoPaginate: false,
    });

    const folders = ((apiResponse as { prefixes?: string[] } | undefined)?.prefixes ?? []).map(
      (p) => p
    );

    const objects: StorageObjectInfo[] = files
      .filter((f) => f.name !== normalizedPrefix)
      .map((f) => this.toObjectInfo(f, false));

    return {
      bucket: bucketName,
      prefix: normalizedPrefix,
      folders,
      objects,
    };
  }

  async getObject(bucketName: string, objectName: string): Promise<StorageObjectInfo> {
    this.ensureSynced();
    const file = this.storage.bucket(bucketName).file(objectName);
    const [metadata] = await file.getMetadata();
    return {
      name: metadata.name ?? objectName,
      isFolder: objectName.endsWith('/'),
      size: metadata.size?.toString(),
      contentType: metadata.contentType,
      contentEncoding: metadata.contentEncoding,
      timeCreated: metadata.timeCreated,
      updated: metadata.updated,
      generation: metadata.generation?.toString(),
      md5Hash: metadata.md5Hash,
      metadata: metadata.metadata as Record<string, string> | undefined,
    };
  }

  async updateObject(
    bucketName: string,
    objectName: string,
    updates: {
      newName?: string;
      contentType?: string;
      contentEncoding?: string;
      metadata?: Record<string, string>;
    }
  ): Promise<StorageObjectInfo> {
    this.ensureSynced();
    const bucket = this.storage.bucket(bucketName);
    let currentName = objectName;
    const newName = updates.newName?.trim();

    if (newName && newName !== objectName) {
      await bucket.file(objectName).copy(bucket.file(newName));
      await bucket.file(objectName).delete({ ignoreNotFound: true });
      currentName = newName;
    }

    const file = bucket.file(currentName);
    const meta: Record<string, unknown> = {};
    if (updates.contentType !== undefined) meta.contentType = updates.contentType;
    if (updates.contentEncoding !== undefined) meta.contentEncoding = updates.contentEncoding;

    if (updates.metadata !== undefined) {
      // PATCH merges custom metadata and emulators often keep keys with "" when
      // sent as null. Clear the whole map first, then write the desired keys.
      await file.setMetadata({ metadata: null } as Record<string, unknown>);
      if (Object.keys(updates.metadata).length > 0) {
        meta.metadata = updates.metadata;
      }
    }

    if (Object.keys(meta).length > 0) {
      await file.setMetadata(meta);
    }

    return this.getObject(bucketName, currentName);
  }

  async downloadObject(bucketName: string, objectName: string): Promise<Buffer> {
    this.ensureSynced();
    const [contents] = await this.storage.bucket(bucketName).file(objectName).download();
    return contents;
  }

  async uploadObject(
    bucketName: string,
    objectName: string,
    data: Buffer | string,
    contentType?: string
  ): Promise<StorageObjectInfo> {
    this.ensureSynced();
    const file = this.storage.bucket(bucketName).file(objectName);
    await file.save(data, {
      contentType: contentType ?? 'application/octet-stream',
      resumable: false,
    });
    return this.getObject(bucketName, objectName);
  }

  async createFolder(bucketName: string, folderPath: string): Promise<StorageObjectInfo> {
    const name = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
    return this.uploadObject(
      bucketName,
      name,
      Buffer.alloc(0),
      'application/x-www-form-urlencoded'
    );
  }

  async deleteObject(bucketName: string, objectName: string): Promise<void> {
    this.ensureSynced();
    await this.storage.bucket(bucketName).file(objectName).delete({ ignoreNotFound: true });
  }

  /**
   * Soft “IAM / security” surface for the emulator: returns bucket IAM if the
   * emulator supports it; otherwise a clear limitation message.
   */
  async getBucketIam(bucketName: string): Promise<{
    supported: boolean;
    bindings?: Array<{ role: string; members: string[] }>;
    note?: string;
  }> {
    this.ensureSynced();
    try {
      const [policy] = await this.storage.bucket(bucketName).iam.getPolicy();
      return {
        supported: true,
        bindings: (policy.bindings ?? []).map((b) => ({
          role: b.role ?? '',
          members: b.members ?? [],
        })),
      };
    } catch (err) {
      return {
        supported: false,
        note:
          err instanceof Error
            ? `IAM not available on this emulator: ${err.message}`
            : 'IAM not available on this emulator.',
      };
    }
  }

  private toBucketInfo(bucket: Bucket): StorageBucketInfo {
    const m = bucket.metadata ?? {};
    return {
      name: bucket.name,
      location: m.location,
      storageClass: m.storageClass,
      timeCreated: m.timeCreated,
      updated: m.updated,
    };
  }

  private toObjectInfo(file: File, isFolder: boolean): StorageObjectInfo {
    const m = file.metadata ?? {};
    return {
      name: file.name,
      isFolder,
      size: m.size?.toString(),
      contentType: m.contentType,
      contentEncoding: m.contentEncoding,
      timeCreated: m.timeCreated,
      updated: m.updated,
      generation: m.generation?.toString(),
      md5Hash: m.md5Hash,
      metadata: m.metadata as Record<string, string> | undefined,
    };
  }
}
