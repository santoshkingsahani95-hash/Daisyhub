import { NextResponse } from 'next/server';
import { cmsService } from '@/server/services';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  try {
    const cms = await cmsService.fetchCMS();
    return NextResponse.json({ success: true, cms, data: cms }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('[API /api/cms GET Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch CMS', message: error?.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cms = body.cms || body;

    const updated = await cmsService.updateCMS(cms);
    return NextResponse.json({ success: true, cms: updated, data: updated }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('[API /api/cms POST Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to update CMS', message: error?.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
