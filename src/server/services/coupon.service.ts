import { Coupon } from '@/types';
import { prisma } from '@/lib/prisma';

interface EntityCache<T> {
  data: T | null;
  fetchedAt: number;
  softTtlMs: number;
  hardTtlMs: number;
}

export class CouponService {
  private cache: EntityCache<Coupon[]> = {
    data: null,
    fetchedAt: 0,
    softTtlMs: 1000,
    hardTtlMs: 10000,
  };

  private inFlight: Promise<Coupon[]> | null = null;

  public invalidateCache(): void {
    this.cache.data = null;
    this.cache.fetchedAt = 0;
  }

  public async fetchCoupons(): Promise<Coupon[]> {
    const now = Date.now();
    if (this.cache.data && now - this.cache.fetchedAt < this.cache.softTtlMs) {
      return this.cache.data;
    }

    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = (async () => {
      try {
        const rows = await prisma.coupon.findMany();

        const coupons: Coupon[] = rows.map((r) => ({
          code: r.code,
          discountType: r.discountType as any,
          discountValue: Number(r.discountValue),
          minOrderValue: Number(r.minOrderValue || 0),
          maxDiscount: r.maxDiscount ? Number(r.maxDiscount) : undefined,
          expiryDate: r.expiryDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          active: Boolean(r.active),
        }));

        this.cache = {
          data: coupons,
          fetchedAt: Date.now(),
          softTtlMs: 30000,
          hardTtlMs: 300000,
        };
        return coupons;
      } catch (err: any) {
        console.error('[CouponService fetchCoupons Error]', err?.message || err);
        return this.cache.data || [];
      } finally {
        this.inFlight = null;
      }
    })();

    return this.inFlight;
  }

  public async getCouponByCode(code: string): Promise<Coupon | undefined> {
    const clean = code.trim().toUpperCase();
    const coupons = await this.fetchCoupons();
    return coupons.find((c) => c.code.toUpperCase() === clean);
  }

  public async saveCoupon(coupon: Coupon): Promise<Coupon> {
    this.invalidateCache();
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
      console.log(`[CouponService] Successfully saved coupon ${cleanCode}`);
    } catch (err: any) {
      console.error(`[CouponService] Error saving coupon ${cleanCode}:`, err?.message || err);
    }
    return cleanCoupon;
  }

  public async deleteCoupon(code: string): Promise<boolean> {
    this.invalidateCache();
    const cleanCode = code.trim().toUpperCase();
    try {
      await prisma.coupon.deleteMany({ where: { code: cleanCode } });
      console.log(`[CouponService] Successfully deleted coupon ${cleanCode}`);
      return true;
    } catch (err: any) {
      console.error(`[CouponService] Error deleting coupon ${cleanCode}:`, err?.message || err);
      return false;
    }
  }
}

const globalCouponService = (globalThis as any).__couponService || new CouponService();
if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).__couponService = globalCouponService;
}

export const couponService = globalCouponService as CouponService;
