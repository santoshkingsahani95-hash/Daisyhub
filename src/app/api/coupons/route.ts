import { NextResponse } from 'next/server';
import {
  getCoupons,
  getCouponByCode,
  saveCoupon,
  deleteCoupon,
} from '@/lib/db-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (code) {
      const coupon = await getCouponByCode(code);
      if (!coupon) {
        return NextResponse.json({ success: false, error: 'Coupon not found' }, { status: 404, headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ success: true, coupon, data: coupon }, { headers: NO_CACHE_HEADERS });
    }

    const coupons = await getCoupons();
    return NextResponse.json({ success: true, count: coupons.length, coupons, data: { coupons } }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('[API /api/coupons GET Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch coupons', message: error?.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const coupon = body.coupon || body;

    if (!coupon || !coupon.code) {
      return NextResponse.json({ success: false, error: 'Coupon code is required' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const saved = await saveCoupon(coupon);
    const coupons = await getCoupons();

    return NextResponse.json({ success: true, coupon: saved, coupons, data: saved }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('[API /api/coupons POST Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to save coupon', message: error?.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let code = searchParams.get('code');

    if (!code) {
      const body = await request.json().catch(() => ({}));
      code = body.code;
    }

    if (!code) {
      return NextResponse.json({ success: false, error: 'Coupon code required' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const success = await deleteCoupon(code);
    return NextResponse.json({ success, message: success ? `Coupon ${code} deleted` : `Failed to delete coupon ${code}` }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('[API /api/coupons DELETE Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to delete coupon', message: error?.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

