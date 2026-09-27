import { NextResponse } from 'next/server';
import { serverDb } from '@/lib/server-db';
import { cachePrewarmer } from '@/lib/cache-prewarmer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { entity = 'all', rewarm = true } = body;

    serverDb.invalidateCache(entity);

    let warmResult = null;
    if (rewarm) {
      warmResult = await cachePrewarmer.warmEntities(true);
    }

    const updatedTelemetry = serverDb.getCacheStats();

    return NextResponse.json(
      {
        success: true,
        message: `Object cache for '${entity}' purged successfully`,
        purgedTarget: entity,
        rewarmResult: warmResult,
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
