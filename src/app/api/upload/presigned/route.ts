import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/server/auth';
import { fileService, type FileBucket } from '@/server/services/file-service';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as {
    key: string;
    mime: string;
    size: number;
    bucket: FileBucket;
  };
  const { key, mime, size, bucket } = body;

  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
  }
  if (size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
  }
  if (!key || typeof key !== 'string' || key.includes('..')) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }

  const result = await fileService.getUploadUrl(bucket, key, mime);
  return NextResponse.json(result);
}
