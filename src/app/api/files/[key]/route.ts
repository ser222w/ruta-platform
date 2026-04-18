import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/server/auth';
import { fileService } from '@/server/services/file-service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { key } = await params;
  const decodedKey = decodeURIComponent(key);

  const presignedUrl = await fileService.getDownloadUrl(decodedKey);
  return NextResponse.redirect(presignedUrl);
}
