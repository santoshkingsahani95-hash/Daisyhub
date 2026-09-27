import { NextResponse } from 'next/server';
import { cachePrewarmer } from '@/lib/cache-prewarmer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { mode = 'full', force = true, baseUrl } = body;

    let result: any = {};

    if (mode === 'entities') {
      result = await cachePrewarmer.warmEntities(force);
    } else if (mode === 'routes') {
      result = await cachePrewarmer.crawlRoutes(baseUrl);
    } else {
      // mode === 'full'
      const warmRes = await cachePrewarmer.warmEntities(force);
      const crawlRes = await cachePrewarmer.crawlRoutes(baseUrl);
      result = {
        entities: warmRes,
        routes: crawlRes,
      };
    }

    const stats = cachePrewarmer.getStats();

    return NextResponse.json(
      {
        success: true,
        message: `Cache pre-warming triggered successfully (mode: ${mode})`,
        result,
        stats,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('[API /api/cache/warm Error]', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute cache pre-warming',
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
