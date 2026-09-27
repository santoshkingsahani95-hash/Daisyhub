import { NextResponse } from 'next/server';
import { serverDb } from '@/lib/server-db';
import { cachePrewarmer } from '@/lib/cache-prewarmer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const dbTelemetry = serverDb.getCacheStats();
    const crawlerTelemetry = cachePrewarmer.getStats();

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        objectCache: dbTelemetry,
        crawler: crawlerTelemetry,
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
