import { HomepageCMS, DistrictDeliveryRate } from '@/types';
import { initialCMS } from '@/lib/seed-data';
import { generateDefaultDeliveryRates } from '@/lib/nepal-locations';
import { prisma } from '@/lib/prisma';
import { initializeMySqlTables } from '@/lib/mysql';
import { sanitizeObjectImages } from '@/lib/image-upload';

interface EntityCache<T> {
  data: T | null;
  fetchedAt: number;
  softTtlMs: number;
  hardTtlMs: number;
}

export class CMSService {
  private cmsCache: EntityCache<HomepageCMS> = {
    data: null,
    fetchedAt: 0,
    softTtlMs: 45000,
    hardTtlMs: 300000,
  };

  private deliveryRatesCache: EntityCache<DistrictDeliveryRate[]> = {
    data: null,
    fetchedAt: 0,
    softTtlMs: 60000,
    hardTtlMs: 600000,
  };

  private inFlightCMS: Promise<HomepageCMS> | null = null;
  private inFlightDelivery: Promise<DistrictDeliveryRate[]> | null = null;

  public invalidateCache(): void {
    this.cmsCache.data = null;
    this.cmsCache.fetchedAt = 0;
    this.deliveryRatesCache.data = null;
    this.deliveryRatesCache.fetchedAt = 0;
  }

  public async fetchDeliveryRates(): Promise<DistrictDeliveryRate[]> {
    const now = Date.now();
    if (this.deliveryRatesCache.data && now - this.deliveryRatesCache.fetchedAt < this.deliveryRatesCache.softTtlMs) {
      return this.deliveryRatesCache.data;
    }

    if (this.inFlightDelivery) {
      return this.inFlightDelivery;
    }

    this.inFlightDelivery = (async () => {
      try {
        await initializeMySqlTables();
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
          console.log('[CMSService] Delivery rates empty. Auto-generating defaults...');
          rates = generateDefaultDeliveryRates();
          await this.updateDeliveryRates(rates);
        }

        this.deliveryRatesCache = {
          data: rates,
          fetchedAt: Date.now(),
          softTtlMs: 60000,
          hardTtlMs: 600000,
        };
        return rates;
      } catch (err: any) {
        console.error('[CMSService fetchDeliveryRates Error]', err?.message || err);
        return this.deliveryRatesCache.data || generateDefaultDeliveryRates();
      } finally {
        this.inFlightDelivery = null;
      }
    })();

    return this.inFlightDelivery;
  }

  public async updateDeliveryRates(rates: DistrictDeliveryRate[]): Promise<DistrictDeliveryRate[]> {
    this.deliveryRatesCache.data = null;
    this.cmsCache.data = null;
    try {
      await initializeMySqlTables();
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
      console.log(`[CMSService] Successfully updated ${rates.length} delivery rates`);
      return rates;
    } catch (err: any) {
      console.error('[CMSService updateDeliveryRates Error]', err?.message || err);
      return rates;
    }
  }

  public async fetchCMS(deliveryRates?: DistrictDeliveryRate[]): Promise<HomepageCMS> {
    const now = Date.now();
    if (this.cmsCache.data && now - this.cmsCache.fetchedAt < this.cmsCache.softTtlMs) {
      return this.cmsCache.data;
    }

    if (this.inFlightCMS) {
      return this.inFlightCMS;
    }

    this.inFlightCMS = (async () => {
      try {
        await initializeMySqlTables();
        const row = await prisma.cms.findUnique({ where: { key: 'homepage' } });
        const rates = deliveryRates || (await this.fetchDeliveryRates());

        let cms: HomepageCMS;
        if (!row) {
          cms = {
            ...initialCMS,
            deliveryRates: rates,
          };
          await this.updateCMS(cms);
        } else {
          cms = {
            announcementBar: (row.announcementBar as any) || initialCMS.announcementBar,
            hero: (row.hero as any) || initialCMS.hero,
            editorialBanner: (row.editorialBanner as any) || initialCMS.editorialBanner,
            instagramImages: Array.isArray(row.instagramImages) ? (row.instagramImages as any) : initialCMS.instagramImages,
            fonepaySettings: (row.fonepaySettings as any) || initialCMS.fonepaySettings,
            deliveryRates: rates,
            seo: (row.seo as any) || initialCMS.seo,
          };
        }

        this.cmsCache = {
          data: cms,
          fetchedAt: Date.now(),
          softTtlMs: 45000,
          hardTtlMs: 300000,
        };
        return cms;
      } catch (err: any) {
        console.error('[CMSService fetchCMS Error]', err?.message || err);
        return this.cmsCache.data || initialCMS;
      } finally {
        this.inFlightCMS = null;
      }
    })();

    return this.inFlightCMS;
  }

  public async updateCMS(rawCms: Partial<HomepageCMS>): Promise<HomepageCMS> {
    const newCms = await sanitizeObjectImages(rawCms);
    this.cmsCache.data = null;
    try {
      await initializeMySqlTables();
      if (newCms.deliveryRates && Array.isArray(newCms.deliveryRates) && newCms.deliveryRates.length > 0) {
        await this.updateDeliveryRates(newCms.deliveryRates);
      }
      const existingCMS = await this.fetchCMS();
      const updated: HomepageCMS = {
        ...existingCMS,
        ...newCms,
        announcementBar: newCms.announcementBar ? { ...existingCMS.announcementBar, ...newCms.announcementBar } : existingCMS.announcementBar,
        hero: newCms.hero ? { ...existingCMS.hero, ...newCms.hero } : existingCMS.hero,
        editorialBanner: newCms.editorialBanner ? { ...existingCMS.editorialBanner, ...newCms.editorialBanner } : existingCMS.editorialBanner,
        fonepaySettings: newCms.fonepaySettings ? { ...existingCMS.fonepaySettings, ...newCms.fonepaySettings } : existingCMS.fonepaySettings,
        seo: newCms.seo ? { ...existingCMS.seo, ...newCms.seo } : existingCMS.seo,
        deliveryRates: newCms.deliveryRates ? newCms.deliveryRates : existingCMS.deliveryRates,
      };

      const data = {
        announcementBar: (updated.announcementBar ?? null) as any,
        hero: (updated.hero ?? null) as any,
        editorialBanner: (updated.editorialBanner ?? null) as any,
        instagramImages: (updated.instagramImages ?? null) as any,
        fonepaySettings: (updated.fonepaySettings ?? null) as any,
        deliveryRates: (updated.deliveryRates ?? null) as any,
        seo: (updated.seo ?? null) as any,
      };

      await prisma.cms.upsert({
        where: { key: 'homepage' },
        update: data,
        create: { key: 'homepage', ...data },
      });

      console.log(`[CMSService] Successfully updated CMS`);
      return updated;
    } catch (err: any) {
      console.error('[CMSService updateCMS Error]:', err?.message || err);
      return { ...initialCMS, ...newCms };
    }
  }
}

const globalCMSService = (globalThis as any).__cmsService || new CMSService();
if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).__cmsService = globalCMSService;
}

export const cmsService = globalCMSService as CMSService;
