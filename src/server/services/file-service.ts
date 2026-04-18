import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type FileBucket = 'public' | 'private';

export interface UploadUrlResult {
  uploadUrl: string;
  fileUrl: string;
}

export interface Attachment {
  key: string;
  url: string;
  mime: string;
  name: string;
  size: number;
  bucket: FileBucket;
}

export class FileService {
  private client: S3Client;
  private publicBucket: string;
  private privateBucket: string;
  private cdnUrl: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    if (!accountId) throw new Error('R2_ACCOUNT_ID env var is required');

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId:
          process.env.R2_ACCESS_KEY_ID ??
          (() => {
            throw new Error('R2_ACCESS_KEY_ID env var is required');
          })(),
        secretAccessKey:
          process.env.R2_SECRET_ACCESS_KEY ??
          (() => {
            throw new Error('R2_SECRET_ACCESS_KEY env var is required');
          })()
      }
    });
    this.publicBucket = process.env.R2_PUBLIC_BUCKET ?? 'ruta-public';
    this.privateBucket = process.env.R2_PRIVATE_BUCKET ?? 'ruta-private';
    this.cdnUrl = process.env.R2_PUBLIC_CDN_URL ?? 'https://cdn.ruta.cam';
  }

  async getUploadUrl(bucket: FileBucket, key: string, mime: string): Promise<UploadUrlResult> {
    const bucketName = bucket === 'public' ? this.publicBucket : this.privateBucket;
    const command = new PutObjectCommand({ Bucket: bucketName, Key: key, ContentType: mime });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 300 });

    const fileUrl =
      bucket === 'public' ? `${this.cdnUrl}/${key}` : `/api/files/${encodeURIComponent(key)}`;

    return { uploadUrl, fileUrl };
  }

  /**
   * Generates a presigned GET URL for private files (15 min TTL).
   * Public files should be accessed directly via their CDN URL.
   */
  async getDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.privateBucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: 900 }); // 15 min
  }

  async deleteFile(key: string, bucket: FileBucket): Promise<void> {
    const bucketName = bucket === 'public' ? this.publicBucket : this.privateBucket;
    await this.client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
  }
}

let _fileService: FileService | undefined;
export const fileService = new Proxy({} as FileService, {
  get(_target, prop) {
    if (!_fileService) _fileService = new FileService();
    return (_fileService as unknown as Record<string | symbol, unknown>)[prop];
  }
});
