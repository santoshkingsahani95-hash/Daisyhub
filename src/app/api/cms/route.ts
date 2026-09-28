import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { HomepageCMS, DistrictDeliveryRate } from '@/types';
import { DEFAULT_CMS } from '@/lib/defaults';
import { generateDefaultDeliveryRates } from '@/lib/nepal-locations';
import { sanitizeObjectImages } from '@/lib/image-upload';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

// -------------------------------------------------------------
// Direct Database Queries & Mutations (Internal)
// -------------------------------------------------------------

async function queryDeliveryRates(): Promise<DistrictDeliveryRate[]> {
  try {
    const rows = await prisma.deliveryRate.findMany();
    let rates: DistrictDeliveryRate[] = rows.map((r) => ({
      province: r.province,
      district: r.district,
      deliveryFee: Number(r.deliveryFee),
      enabled: Boolean(r.enabled),
      homeDeliveryFee: r.homeDeliveryFee !== null && r.homeDeliveryFee !== undefined ? Number(r.homeDeliveryFee) : undefined,
      branchDeliveryFee: r.branchDeliveryFee !== null && r.branchDeliveryFee !== undefined ? Number(r.branchDeliveryFee) : undefined,
      homeDeliveryEnabled: r.homeDeliveryEnabled !== null && r.homeDeliveryEnabled !== undefined ? Boolean(r.homeDeliveryEnabled) : undefined,
      branchDeliveryEnabled: r.branchDeliveryEnabled !== null && r.branchDeliveryEnabled !== undefined ? Boolean(r.branchDeliveryEnabled) : undefined,
    }));

    if (rates.length === 0) {
      rates = generateDefaultDeliveryRates();
      await saveDeliveryRatesToDb(rates);
    }
    return rates;
  } catch (error) {
    console.error('[queryDeliveryRates Error]', error);
    return generateDefaultDeliveryRates();
  }
}

async function saveDeliveryRatesToDb(rates: DistrictDeliveryRate[]): Promise<DistrictDeliveryRate[]> {
  try {
    await prisma.$transaction(
      rates.map((r) => {
        const data = {
          province: r.province,
          deliveryFee: r.deliveryFee,
          enabled: !!r.enabled,
          homeDeliveryFee: r.homeDeliveryFee ?? r.deliveryFee,
          branchDeliveryFee: r.branchDeliveryFee ?? r.deliveryFee,
          homeDeliveryEnabled: !!r.homeDeliveryEnabled,
          branchDeliveryEnabled: !!r.branchDeliveryEnabled,
        };
        return prisma.deliveryRate.upsert({
          where: { district: r.district },
          update: data,
          create: { district: r.district, ...data },
        });
      })
    );
  } catch (error) {
    console.error('[saveDeliveryRatesToDb Error]', error);
  }
  return rates;
}

async function queryCMS(): Promise<HomepageCMS> {
  try {
    const [row, rates] = await Promise.all([
      prisma.cms.findUnique({ where: { key: 'homepage' } }),
      queryDeliveryRates(),
    ]);

    if (!row) {
      return { ...DEFAULT_CMS, deliveryRates: rates };
    }

    return {
      announcementBar: (row.announcementBar as any) || DEFAULT_CMS.announcementBar,
      hero: (row.hero as any) || DEFAULT_CMS.hero,
      editorialBanner: (row.editorialBanner as any) || DEFAULT_CMS.editorialBanner,
      instagramImages: Array.isArray(row.instagramImages) ? (row.instagramImages as any) : DEFAULT_CMS.instagramImages,
      fonepaySettings: (row.fonepaySettings as any) || DEFAULT_CMS.fonepaySettings,
      deliveryRates: rates,
      seo: (row.seo as any) || DEFAULT_CMS.seo,
    };
  } catch (error) {
    console.error('[queryCMS Error]', error);
    return DEFAULT_CMS;
  }
}

async function saveCMSToDb(rawCms: Partial<HomepageCMS>): Promise<HomepageCMS> {
  const newCms = await sanitizeObjectImages(rawCms);
  try {
    if (newCms.deliveryRates && Array.isArray(newCms.deliveryRates)) {
      await saveDeliveryRatesToDb(newCms.deliveryRates);
    }
    const existing = await queryCMS();
    const updated: HomepageCMS = {
      ...existing,
      ...newCms,
      announcementBar: newCms.announcementBar ? { ...existing.announcementBar, ...newCms.announcementBar } : existing.announcementBar,
      hero: newCms.hero ? { ...existing.hero, ...newCms.hero } : existing.hero,
      editorialBanner: newCms.editorialBanner ? { ...existing.editorialBanner, ...newCms.editorialBanner } : existing.editorialBanner,
      fonepaySettings: newCms.fonepaySettings ? { ...existing.fonepaySettings, ...newCms.fonepaySettings } : existing.fonepaySettings,
      seo: newCms.seo ? { ...existing.seo, ...newCms.seo } : existing.seo,
      deliveryRates: newCms.deliveryRates ? newCms.deliveryRates : existing.deliveryRates,
    };

    const data = {
      announcementBar: (updated.announcementBar ?? null) as any,
      hero: (updated.hero ?? null) as any,
      editorialBanner: (updated.editorialBanner ?? null) as any,
      instagramImages: (updated.instagramImages ?? []) as any,
      fonepaySettings: (updated.fonepaySettings ?? null) as any,
      deliveryRates: (updated.deliveryRates ?? []) as any,
      seo: (updated.seo ?? null) as any,
    };

    await prisma.cms.upsert({
      where: { key: 'homepage' },
      update: data,
      create: { key: 'homepage', ...data },
    });
    return updated;
  } catch (error) {
    console.error('[saveCMSToDb Error]', error);
    return { ...DEFAULT_CMS, ...newCms };
  }
}

// -------------------------------------------------------------
// Route Handlers (Next.js App Router API)
// -------------------------------------------------------------

export async function GET() {
  try {
    const cms = await queryCMS();
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

    const updated = await saveCMSToDb(cms);

    revalidatePath('/', 'layout');
    revalidatePath('/shop');

    return NextResponse.json({ success: true, cms: updated, data: updated }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('[API /api/cms POST Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to update CMS', message: error?.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
