import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Coupon } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

// -------------------------------------------------------------
// Direct Database Logic (Internal)
// -------------------------------------------------------------

async function queryCoupons(): Promise<Coupon[]> {
  try {
    const rows = await prisma.coupon.findMany();
    return rows.map((r) => ({
      code: r.code,
      discountType: r.discountType as any,
      discountValue: Number(r.discountValue),
      minOrderValue: Number(r.minOrderValue || 0),
      maxDiscount: r.maxDiscount ? Number(r.maxDiscount) : undefined,
      expiryDate: r.expiryDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      active: Boolean(r.active),
    }));
  } catch (error) {
    console.error('[queryCoupons Error]', error);
    return [];
  }
}

async function queryCouponByCode(code: string): Promise<Coupon | null> {
  try {
    const cleanCode = code.trim().toUpperCase();
    const r = await prisma.coupon.findUnique({ where: { code: cleanCode } });
    if (!r) return null;
    return {
      code: r.code,
      discountType: r.discountType as any,
      discountValue: Number(r.discountValue),
      minOrderValue: Number(r.minOrderValue || 0),
      maxDiscount: r.maxDiscount ? Number(r.maxDiscount) : undefined,
      expiryDate: r.expiryDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      active: Boolean(r.active),
    };
  } catch (error) {
    console.error('[queryCouponByCode Error]', error);
    return null;
  }
}

async function saveCouponToDb(coupon: Coupon): Promise<Coupon> {
  const cleanCode = coupon.code.trim().toUpperCase();
  const cleanCoupon = { ...coupon, code: cleanCode };
  try {
    const data = {
      discountType: cleanCoupon.discountType,
      discountValue: cleanCoupon.discountValue,
      minOrderValue: cleanCoupon.minOrderValue || 0,
      maxDiscount: cleanCoupon.maxDiscount ?? null,
      expiryDate: cleanCoupon.expiryDate || null,
      active: !!cleanCoupon.active,
    };
    await prisma.coupon.upsert({
      where: { code: cleanCode },
      update: data,
      create: { code: cleanCode, ...data },
    });
  } catch (error) {
    console.error('[saveCouponToDb Error]', error);
  }
  return cleanCoupon;
}

async function deleteCouponFromDb(code: string): Promise<boolean> {
  try {
    const cleanCode = code.trim().toUpperCase();
    await prisma.coupon.deleteMany({ where: { code: cleanCode } });
    return true;
  } catch (error) {
    console.error('[deleteCouponFromDb Error]', error);
    return false;
  }
}

// -------------------------------------------------------------
// Route Handlers (Next.js App Router API)
// -------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (code) {
      const coupon = await queryCouponByCode(code);
      if (!coupon) {
        return NextResponse.json({ success: false, error: 'Coupon not found' }, { status: 404, headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ success: true, coupon, data: coupon }, { headers: NO_CACHE_HEADERS });
    }

    const coupons = await queryCoupons();
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

    const saved = await saveCouponToDb(coupon);
    const coupons = await queryCoupons();

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

    const success = await deleteCouponFromDb(code);
    return NextResponse.json({ success, message: success ? `Coupon ${code} deleted` : `Failed to delete coupon ${code}` }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('[API /api/coupons DELETE Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to delete coupon', message: error?.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
