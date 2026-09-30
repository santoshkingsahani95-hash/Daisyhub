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

async function queryCMS(): Promise<HomepageCMS> {
  try {
    const row = await prisma.cms.findUnique({ where: { key: 'homepage' } });

    if (!row) {
      return { ...DEFAULT_CMS, deliveryRates: generateDefaultDeliveryRates() };
    }

    const deliveryRates =
      Array.isArray(row.deliveryRates) && (row.deliveryRates as any[]).length > 0
        ? (row.deliveryRates as any)
        : generateDefaultDeliveryRates();

    return {
      announcementBar: (row.announcementBar as any) || DEFAULT_CMS.announcementBar,
      hero: (row.hero as any) || DEFAULT_CMS.hero,
      editorialBanner: (row.editorialBanner as any) || DEFAULT_CMS.editorialBanner,
      instagramImages: Array.isArray(row.instagramImages) ? (row.instagramImages as any) : DEFAULT_CMS.instagramImages,
      fonepaySettings: (row.fonepaySettings as any) || DEFAULT_CMS.fonepaySettings,
      deliveryRates,
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

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/shop');
    } catch (e) {
      // Ignore revalidate error in dynamic runtime
    }

    return NextResponse.json({ success: true, cms: updated, data: updated }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('[API /api/cms POST Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to update CMS', message: error?.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
