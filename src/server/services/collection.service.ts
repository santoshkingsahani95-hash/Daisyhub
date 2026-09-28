import { Collection } from '@/types';
import { DEFAULT_COLLECTIONS } from '@/server/config/defaults';
import { prisma } from '@/lib/prisma';
import { sanitizeObjectImages } from '@/lib/image-upload';

interface EntityCache<T> {
  data: T | null;
  fetchedAt: number;
  softTtlMs: number;
  hardTtlMs: number;
}

export class CollectionService {
  private cache: EntityCache<Collection[]> = {
    data: null,
    fetchedAt: 0,
    softTtlMs: 1000,
    hardTtlMs: 10000,
  };

  private inFlight: Promise<Collection[]> | null = null;

  public invalidateCache(): void {
    this.cache.data = null;
    this.cache.fetchedAt = 0;
  }

  public async fetchCollections(): Promise<Collection[]> {
    const now = Date.now();
    if (this.cache.data && now - this.cache.fetchedAt < this.cache.softTtlMs) {
      return this.cache.data;
    }

    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = (async () => {
      try {
        const rows = await prisma.collection.findMany();

        let collections: Collection[] = rows.map((r) => ({
          id: r.id,
          slug: r.slug,
          name: r.name,
          description: r.description || '',
          image: r.image || '',
          seo: (r.seo as any) ?? undefined,
        }));

        if (collections.length === 0 && DEFAULT_COLLECTIONS.length > 0) {
          console.log('[CollectionService] Collections table empty. Auto-seeding initial collections...');
          for (const col of DEFAULT_COLLECTIONS) {
            await this.saveCollection(col);
          }
          collections = DEFAULT_COLLECTIONS;
        }

        this.cache = {
          data: collections,
          fetchedAt: Date.now(),
          softTtlMs: 1000,
          hardTtlMs: 10000,
        };
        return collections;
      } catch (err: any) {
        console.error('[CollectionService fetchCollections Error]', err?.message || err);
        return this.cache.data || DEFAULT_COLLECTIONS;
      } finally {
        this.inFlight = null;
      }
    })();

    return this.inFlight;
  }

  public async getCollectionBySlug(slug: string): Promise<Collection | undefined> {
    const collections = await this.fetchCollections();
    return collections.find((c) => c.slug.toLowerCase() === slug.toLowerCase().trim());
  }

  public async saveCollection(rawCollection: Collection): Promise<Collection> {
    const collection = await sanitizeObjectImages(rawCollection);
    this.invalidateCache();
    try {
      await prisma.collection.deleteMany({
        where: { OR: [{ id: collection.id }, { slug: collection.slug }] },
      });
      await prisma.collection.create({
        data: {
          id: collection.id,
          slug: collection.slug,
          name: collection.name,
          description: collection.description || '',
          image: collection.image || '',
          seo: (collection.seo ?? null) as any,
        },
      });
      console.log(`[CollectionService] Successfully saved collection '${collection.name}'`);
    } catch (err: any) {
      console.error(`[CollectionService] Error saving collection '${collection.name}':`, err?.message || err);
    }
    return collection;
  }

  public async deleteCollection(idOrSlug: string): Promise<boolean> {
    this.invalidateCache();
    try {
      await prisma.collection.deleteMany({
        where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      });
      console.log(`[CollectionService] Successfully deleted collection ${idOrSlug}`);
      return true;
    } catch (err: any) {
      console.error(`[CollectionService] Error deleting collection ${idOrSlug}:`, err?.message || err);
      return false;
    }
  }
}

const globalCollectionService = (globalThis as any).__collectionService || new CollectionService();
if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).__collectionService = globalCollectionService;
}

export const collectionService = globalCollectionService as CollectionService;
