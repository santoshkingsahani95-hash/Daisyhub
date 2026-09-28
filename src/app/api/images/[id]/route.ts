import { NextResponse } from 'next/server';
import { getImageBlobFromDb, initializeMySqlTables } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await initializeMySqlTables();
    const imageId = params.id;
    if (!imageId) {
      return new NextResponse('Image ID required', { status: 400 });
    }

    const imageData = await getImageBlobFromDb(imageId);
    if (!imageData) {
      return new NextResponse('Image not found', { status: 404 });
    }

    return new NextResponse(new Uint8Array(imageData.buffer), {
      headers: {
        'Content-Type': imageData.mimeType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[API /api/images GET Error]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
