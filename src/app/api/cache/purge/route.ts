import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { serverDb } from '@/lib/server-db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { entity = 'all' } = body;

    serverDb.invalidateCache(entity);
    revalidatePath('/', 'layout');
    revalidatePath('/shop');
    revalidatePath('/category/[slug]', 'page');
    revalidatePath('/product/[slug]', 'page');

    const updatedTelemetry = serverDb.getCacheStats();

    return NextResponse.json(
      {
        success: true,
        message: `Cache for '${entity}' purged and Next.js paths revalidated successfully`,
        purgedTarget: entity,
        telemetry: updatedTelemetry,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('[API /api/cache/purge Error]', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to purge cache',
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
