import { NextResponse } from 'next/server';
import { getImageBlobFromDb, initializeMySqlTables } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500" fill="none">
  <rect width="400" height="500" fill="#F3F4F6"/>
  <rect x="150" y="200" width="100" height="80" rx="8" fill="#E5E7EB"/>
  <path d="M165 240L185 220L215 250L230 235L245 250" stroke="#9CA3AF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="180" cy="225" r="5" fill="#9CA3AF"/>
  <text x="200" y="310" text-anchor="middle" fill="#9CA3AF" font-family="system-ui, sans-serif" font-size="14" font-weight="500">Image Unavailable</text>
</svg>`;

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
      return new NextResponse(FALLBACK_SVG, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=60, s-maxage=60',
        },
      });
    }

    return new NextResponse(new Uint8Array(imageData.buffer), {
      headers: {
        'Content-Type': imageData.mimeType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[API /api/images GET Error]', error);
    return new NextResponse(FALLBACK_SVG, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-store',
      },
    });
  }
}
