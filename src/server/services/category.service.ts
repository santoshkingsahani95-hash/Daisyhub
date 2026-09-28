import { Category } from '@/types';
import { initialCategories } from '@/lib/seed-data';
import { prisma } from '@/lib/prisma';
import { initializeMySqlTables } from '@/lib/mysql';
import { sanitizeObjectImages } from '@/lib/image-upload';

interface EntityCache<T> {
  data: T | null;
  fetchedAt: number;
  softTtlMs: number;
  hardTtlMs: number;
}

export class CategoryService {
  private cache: EntityCache<Category[]> = {
    data: null,
    fetchedAt: 0,
    softTtlMs: 60000, // 60s soft TTL
    hardTtlMs: 600000, // 10 min hard TTL
  };

  private bySlugMap = new Map<string, Category>();
  private byIdMap = new Map<string, Category>();
  private inFlight: Promise<Category[]> | null = null;

  /**
   * Invalidate category cache and index maps
   */
  public invalidateCache(): void {
    this.cache.data = null;
    this.cache.fetchedAt = 0;
    this.bySlugMap.clear();
    this.byIdMap.clear();
  }

  /**
   * Fetch all categories with single-flight deduplication and auto-seeding
   */
  public async fetchCategories(): Promise<Category[]> {
    const now = Date.now();
    if (this.cache.data && now - this.cache.fetchedAt < this.cache.softTtlMs) {
      return this.cache.data;
    }

    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = (async () => {
      try {
        await initializeMySqlTables();
        const rows = await prisma.category.findMany();

        let categories: Category[] = rows.map((r) => ({
          id: r.id,
          slug: r.slug,
          name: r.name,
          description: r.description || '',
          image: r.image || '',
          subcategories: Array.isArray(r.subcategories) ? (r.subcategories as any) : [],
          seo: (r.seo as any) ?? undefined,
        }));

        if (categories.length === 0 && initialCategories && initialCategories.length > 0) {
          console.log('[CategoryService] Categories table empty. Auto-populating initial categories...');
          for (const c of initialCategories) {
            await this.saveCategory(c);
          }
          categories = initialCategories;
        }

        this.cache = {
          data: categories,
          fetchedAt: Date.now(),
          softTtlMs: 60000,
          hardTtlMs: 600000,
        };

        // Rebuild index maps
        this.bySlugMap.clear();
        this.byIdMap.clear();
        categories.forEach((c) => {
          if (c.slug) this.bySlugMap.set(c.slug.toLowerCase().trim(), c);
          if (c.id) this.byIdMap.set(c.id, c);
        });

        return categories;
      } catch (err: any) {
        console.error('[CategoryService fetchCategories Error]', err?.message || err);
        return this.cache.data || initialCategories;
      } finally {
        this.inFlight = null;
      }
    })();

    return this.inFlight;
  }

  /**
   * Get category by slug (fast indexed lookup)
   */
  public async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    if (!slug) return undefined;
    const key = slug.toLowerCase().trim();
    if (this.bySlugMap.has(key)) {
      return this.bySlugMap.get(key);
    }
    const categories = await this.fetchCategories();
    return categories.find((c) => c.slug.toLowerCase() === key);
  }

  /**
   * Get category by ID
   */
  public async getCategoryById(id: string): Promise<Category | undefined> {
    if (!id) return undefined;
    if (this.byIdMap.has(id)) {
      return this.byIdMap.get(id);
    }
    const categories = await this.fetchCategories();
    return categories.find((c) => c.id === id);
  }

  /**
   * Create or update category in MySQL
   */
  public async saveCategory(rawCategory: Category): Promise<Category> {
    const category = await sanitizeObjectImages(rawCategory);
    this.invalidateCache();

    try {
      await initializeMySqlTables();
      await prisma.category.deleteMany({
        where: { OR: [{ id: category.id }, { slug: category.slug }] },
      });

      await prisma.category.create({
        data: {
          id: category.id,
          slug: category.slug,
          name: category.name,
          description: category.description || '',
          image: category.image || '',
          subcategories: (category.subcategories || []) as any,
          seo: (category.seo ?? null) as any,
        },
      });
      console.log(`[CategoryService] Successfully saved category '${category.name}' (${category.id})`);
    } catch (err: any) {
      console.error(`[CategoryService] Error saving category '${category.name}':`, err?.message || err);
    }

    return category;
  }

  /**
   * Delete category by ID or Slug
   */
  public async deleteCategory(idOrSlug: string): Promise<boolean> {
    this.invalidateCache();
    try {
      await initializeMySqlTables();
      await prisma.category.deleteMany({
        where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      });
      console.log(`[CategoryService] Successfully deleted category ${idOrSlug}`);
      return true;
    } catch (err: any) {
      console.error(`[CategoryService] Error deleting category ${idOrSlug}:`, err?.message || err);
      return false;
    }
  }
}

// Global singleton pattern for server runtime
const globalCategoryService = (globalThis as any).__categoryService || new CategoryService();
if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).__categoryService = globalCategoryService;
}

export const categoryService = globalCategoryService as CategoryService;
