import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { Client } from 'minio';
import type { Readable } from 'node:stream';

/** Penyimpanan objek di MinIO milik UNICAL; berkas tidak pernah menyentuh disk host. */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: Client;
  readonly bucket = process.env.S3_BUCKET ?? 'unical-assets';

  constructor() {
    const endpoint = new URL(process.env.S3_ENDPOINT ?? 'http://minio:9000');
    this.client = new Client({
      endPoint: endpoint.hostname,
      port: Number(endpoint.port || 9000),
      useSSL: endpoint.protocol === 'https:',
      accessKey: process.env.S3_ACCESS_KEY ?? '',
      secretKey: process.env.S3_SECRET_KEY ?? '',
    });
  }

  async put(key: string, buffer: Buffer, contentType: string): Promise<void> {
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': contentType,
    });
  }

  async stream(key: string): Promise<{ stream: Readable; size: number } | null> {
    try {
      const stat = await this.client.statObject(this.bucket, key);
      const stream = await this.client.getObject(this.bucket, key);
      return { stream, size: stat.size };
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, key);
    } catch (error) {
      this.logger.warn(`Gagal menghapus ${key}: ${(error as Error).message}`);
    }
  }
}

@Global()
@Module({ providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
