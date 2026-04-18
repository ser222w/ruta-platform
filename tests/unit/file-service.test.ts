import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(function (this: { send: ReturnType<typeof vi.fn> }) {
    this.send = vi.fn();
  }),
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn()
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://r2.example.com/presigned?sig=abc')
}));

import { FileService } from '@/server/services/file-service';

describe('FileService', () => {
  let svc: FileService;

  beforeEach(() => {
    process.env.R2_ACCOUNT_ID = 'test-account';
    process.env.R2_ACCESS_KEY_ID = 'test-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
    process.env.R2_PUBLIC_BUCKET = 'ruta-public';
    process.env.R2_PRIVATE_BUCKET = 'ruta-private';
    process.env.R2_PUBLIC_CDN_URL = 'https://cdn.ruta.cam';
    svc = new FileService();
  });

  it('getUploadUrl for public bucket returns CDN fileUrl', async () => {
    const result = await svc.getUploadUrl('public', 'inbox/conv1/msg1/photo.jpg', 'image/jpeg');
    expect(result.uploadUrl).toContain('presigned');
    expect(result.fileUrl).toBe('https://cdn.ruta.cam/inbox/conv1/msg1/photo.jpg');
  });

  it('getUploadUrl for private bucket returns /api/files path', async () => {
    const result = await svc.getUploadUrl(
      'private',
      'documents/guest1/passport/scan.pdf',
      'application/pdf'
    );
    expect(result.fileUrl).toBe('/api/files/documents%2Fguest1%2Fpassport%2Fscan.pdf');
  });

  it('getDownloadUrl returns presigned GET URL', async () => {
    const url = await svc.getDownloadUrl('documents/guest1/passport/scan.pdf');
    expect(url).toContain('presigned');
  });
});
