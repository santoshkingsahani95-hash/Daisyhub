import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { serverDb } from '@/lib/server-db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    await serverDb.getFreshData();
    revalidatePath('/', 'layout');
    revalidatePath('/shop');

    return NextResponse.json(
      {
        success: true,
        message: 'Entities refreshed and Next.js paths revalidated successfully',
        stats: {
          status: 'IDLE',
          lastWarmedAt: Date.now(),
          lastCrawlDurationMs: 0,
          totalWarmRuns: 1,
          totalCrawlRuns: 0,
          totalUrlsCrawled: 1,
          failedUrlsCount: 0,
          daemonActive: false,
          logs: [
            {
              timestamp: new Date().toISOString(),
              type: 'SUCCESS',
              message: 'Next.js cache paths revalidated and fresh DB entities loaded',
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
