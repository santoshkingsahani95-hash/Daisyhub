import { NextResponse } from 'next/server';
import { serverDb } from '@/lib/server-db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const dbTelemetry = serverDb.getCacheStats();

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        objectCache: dbTelemetry,
        crawler: {
          status: 'IDLE',
          lastWarmedAt: Date.now(),
          lastCrawlDurationMs: 0,
          totalWarmRuns: 0,
          totalCrawlRuns: 0,
          totalUrlsCrawled: 0,
          failedUrlsCount: 0,
          daemonActive: false,
          logs: [
            {
              timestamp: new Date().toISOString(),
              type: 'INFO',
              message: 'Native Next.js caching active (stale time: 1s, direct MySQL)',
            },
          ],
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve cache telemetry',
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
