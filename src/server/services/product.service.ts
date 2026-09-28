import { Product } from '@/types';
import { seedProducts } from '@/lib/seed-data';
import { prisma } from '@/lib/prisma';
import { initializeMySqlTables } from '@/lib/mysql';
import { sanitizeObjectImages } from '@/lib/image-upload';

interface EntityCache<T> {
  data: T | null;
  fetchedAt: number;
  softTtlMs: number;
  hardTtlMs: number;
}

export class ProductService {
  private cache: EntityCache<Product[]> = {
    data: null,
    fetchedAt: 0,
    softTtlMs: 45000, // 45 seconds soft TTL
    hardTtlMs: 300000, // 5 minutes hard TTL
  };

  private byIdMap = new Map<string, Product>();
  private bySlugMap = new Map<string, Product>();
  private byCategoryMap = new Map<string, Product[]>();
  private inFlight: Promise<Product[]> | null = null;

  /**
   * Invalidate product cache and index maps
   */
  public invalidateCache(): void {
    this.cache.data = null;
    this.cache.fetchedAt = 0;
    this.byIdMap.clear();
    this.bySlugMap.clear();
    this.byCategoryMap.clear();
  }

  /**
   * Fetch all products from MySQL/Prisma with auto-seeding & deduplication
   */
  public async fetchProducts(): Promise<Product[]> {
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
        const rows = await prisma.product.findMany();

        let products: Product[] = rows.map((r) => {
          const rawColors = Array.isArray(r.colors) ? (r.colors as any[]) : [];
          const rawSizes = Array.isArray(r.sizes) ? (r.sizes as any[]) : [];
          const sizes = rawSizes.length > 0 ? rawSizes : [{ size: 'Free Size', stock: 10 }];

          return {
            id: r.id,
            slug: r.slug,
            name: r.name,
            description: r.description || '',
            details: Array.isArray(r.details) ? (r.details as any) : [],
            fabricCare: r.fabricCare || '',
            category: r.category || 'tops',
            subcategory: r.subcategory || undefined,
            collections: Array.isArray(r.collections) ? (r.collections as any) : [],
            price: Number(r.price || 0),
            salePrice: r.salePrice !== null && r.salePrice !== undefined ? Number(r.salePrice) : undefined,
            discountPercentage: r.discountPercentage !== null && r.discountPercentage !== undefined ? Number(r.discountPercentage) : undefined,
            rating: Number(r.rating || 4.8),
            reviewCount: Number(r.reviewCount || 0),
            isTrending: Boolean(r.isTrending),
            isNewArrival: Boolean(r.isNewArrival),
            isBestSeller: Boolean(r.isBestSeller),
            isSale: Boolean(r.isSale),
            isOutOfStock: Boolean(r.isOutOfStock),
            colors: rawColors as any,
            sizes: sizes as any,
            sku: r.sku || `SKU-${r.id}`,
            reviews: Array.isArray(r.reviews) ? (r.reviews as any) : [],
            insideValleyFee: Number(r.insideValleyFee || 100),
            outsideValleyFee: Number(r.outsideValleyFee || 200),
            isFreeDelivery: Boolean(r.isFreeDelivery),
            seo: (r.seo as any) ?? undefined,
            createdAt: r.createdAt || new Date().toISOString(),
          };
        });

        // Auto-seed if database is empty
        if (products.length === 0 && seedProducts && seedProducts.length > 0) {
          console.log('[ProductService] Products table empty. Auto-populating initial products...');
          for (const p of seedProducts) {
            await this.saveProduct(p);
          }
          products = seedProducts;
        }

        this.cache = {
          data: products,
          fetchedAt: Date.now(),
          softTtlMs: 45000,
          hardTtlMs: 300000,
        };

        // Rebuild index maps
        this.byIdMap.clear();
        this.bySlugMap.clear();
        this.byCategoryMap.clear();

        products.forEach((p) => {
          if (p.id) this.byIdMap.set(p.id, p);
          if (p.slug) this.bySlugMap.set(p.slug.toLowerCase().trim(), p);

          const catKey = (p.category || '').toLowerCase().trim();
          if (catKey) {
            const list = this.byCategoryMap.get(catKey) || [];
            list.push(p);
            this.byCategoryMap.set(catKey, list);
          }
        });

        return products;
      } catch (err: any) {
        console.error('[ProductService fetchProducts Error]', err?.message || err);
        return this.cache.data || seedProducts;
      } finally {
        this.inFlight = null;
      }
    })();

    return this.inFlight;
  }

  /**
   * Fast O(1) Product lookup by ID
   */
  public async getProductById(id: string): Promise<Product | undefined> {
    if (!id) return undefined;
    if (this.byIdMap.has(id)) {
      return this.byIdMap.get(id);
    }
    const products = await this.fetchProducts();
    return products.find((p) => p.id === id);
  }

  /**
   * Fast O(1) Product lookup by Slug
   */
  public async getProductBySlug(slug: string): Promise<Product | undefined> {
    if (!slug) return undefined;
    const key = slug.toLowerCase().trim();
    if (this.bySlugMap.has(key)) {
      return this.bySlugMap.get(key);
    }
    const products = await this.fetchProducts();
    return products.find((p) => p.slug.toLowerCase() === key);
  }

  /**
   * Filter products by category slug
   */
  public async getProductsByCategory(category: string): Promise<Product[]> {
    if (!category) return [];
    const catLower = category.toLowerCase().trim();
    if (catLower === 'all') {
      return this.fetchProducts();
    }
    const products = await this.fetchProducts();
    return products.filter((p) => (p.category || '').toLowerCase() === catLower);
  }

  /**
   * Save (create or update) product in MySQL
   */
  public async saveProduct(rawProduct: Product): Promise<Product> {
    const product = await sanitizeObjectImages(rawProduct);
    this.invalidateCache();

    try {
      await initializeMySqlTables();
      await prisma.product.deleteMany({
        where: { OR: [{ id: product.id }, { slug: product.slug }] },
      });

      await prisma.product.create({
        data: {
          id: product.id,
          slug: product.slug,
          name: product.name,
          description: product.description || '',
          details: (product.details || []) as any,
          fabricCare: product.fabricCare || '',
          category: product.category,
          subcategory: product.subcategory || null,
          collections: (product.collections || []) as any,
          price: product.price,
          salePrice: product.salePrice ?? null,
          discountPercentage: product.discountPercentage ?? null,
          rating: product.rating || 4.8,
          reviewCount: product.reviewCount || 0,
          isTrending: !!product.isTrending,
          isNewArrival: !!product.isNewArrival,
          isBestSeller: !!product.isBestSeller,
          isSale: !!product.isSale,
          isOutOfStock: !!product.isOutOfStock,
          colors: (product.colors || []) as any,
          sizes: (product.sizes || []) as any,
          sku: product.sku,
          reviews: (product.reviews || []) as any,
          insideValleyFee: product.insideValleyFee || 100,
          outsideValleyFee: product.outsideValleyFee || 200,
          isFreeDelivery: !!product.isFreeDelivery,
          seo: (product.seo ?? null) as any,
          createdAt: product.createdAt || new Date().toISOString(),
        },
      });

      await this.syncInventoryDoc(product);
      await this.syncGalleryDocs(product);
      console.log(`[ProductService] Successfully saved product '${product.name}' (${product.id})`);
    } catch (err: any) {
      console.error(`[ProductService] Error saving product ${product.id}:`, err?.message || err);
      throw err;
    }

    return product;
  }

  /**
   * Delete product by ID from MySQL, inventory, and gallery
   */
  public async deleteProduct(id: string): Promise<boolean> {
    this.invalidateCache();
    try {
      await initializeMySqlTables();
      await prisma.product.deleteMany({ where: { id } });
      await prisma.inventory.deleteMany({ where: { OR: [{ productId: id }, { id: `inv-${id}` }] } });
      await prisma.photoGallery.deleteMany({ where: { productId: id } });
      console.log(`[ProductService] Successfully deleted product ${id}`);
      return true;
    } catch (err: any) {
      console.error(`[ProductService] Error deleting product ${id}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Update size stock for a product
   */
  public async updateInventory(productId: string, size: string, newStock: number): Promise<boolean> {
    this.invalidateCache();
    try {
      const prod = await this.getProductById(productId);
      if (!prod) return false;

      const cleanStock = isNaN(Number(newStock)) ? 0 : Math.max(0, Math.min(999, Math.floor(Number(newStock))));

      if (prod.sizes && prod.sizes.length > 0) {
        const existingSize = prod.sizes.find((s: any) => s.size === size);
        if (existingSize) {
          existingSize.stock = cleanStock;
        } else {
          prod.sizes = prod.sizes.map((s: any) => ({ ...s, stock: cleanStock }));
        }
      } else {
        prod.sizes = [{ size: size || 'Free Size', stock: cleanStock }];
      }

      const totalSizeStock = prod.sizes.reduce((sum: number, s: any) => sum + (s.stock || 0), 0);
      prod.isOutOfStock = totalSizeStock <= 0;

      await this.saveProduct(prod);
      console.log(`[ProductService] Updated inventory for product ${productId} size '${size}' to ${cleanStock}`);
      return true;
    } catch (err: any) {
      console.error(`[ProductService] Error updating inventory for ${productId}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Update color stock for a product
   */
  public async updateColorStock(productId: string, colorName: string, newStock: number): Promise<boolean> {
    this.invalidateCache();
    try {
      const prod = await this.getProductById(productId);
      if (!prod) return false;

      const cleanStock = isNaN(Number(newStock)) ? 0 : Math.max(0, Math.min(999, Math.floor(Number(newStock))));

      if (prod.colors && prod.colors.length > 0) {
        const targetColor = prod.colors.find((c: any) => c.name.toLowerCase() === colorName.toLowerCase());
        if (targetColor) {
          targetColor.stock = cleanStock;
        }
      }

      const totalColorStock = prod.colors
        ? prod.colors.reduce((acc: number, c: any) => acc + (typeof c.stock === 'number' ? c.stock : 0), 0)
        : 0;
      prod.sizes = [{ size: 'Free Size', stock: totalColorStock }];
      prod.isOutOfStock = totalColorStock <= 0;

      await this.saveProduct(prod);
      console.log(`[ProductService] Updated color stock for product ${productId} color '${colorName}' to ${cleanStock}`);
      return true;
    } catch (err: any) {
      console.error(`[ProductService] Error updating color stock for ${productId}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Delete review from product
   */
  public async deleteReview(productId: string, reviewId: string): Promise<boolean> {
    this.invalidateCache();
    try {
      const prod = await this.getProductById(productId);
      if (!prod) return false;

      if (prod.reviews) {
        const initialLen = prod.reviews.length;
        prod.reviews = prod.reviews.filter((r: any) => r.id !== reviewId);
        if (prod.reviews.length < initialLen) {
          prod.reviewCount = prod.reviews.length;
          if (prod.reviewCount > 0) {
            prod.rating = Number(
              (prod.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / prod.reviewCount).toFixed(1)
            );
          } else {
            prod.rating = 5.0;
          }
          await this.saveProduct(prod);
          console.log(`[ProductService] Deleted review ${reviewId} from product ${prod.id}`);
          return true;
        }
      }
      return false;
    } catch (err: any) {
      console.error(`[ProductService] Error deleting review ${reviewId}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Sync inventory table document
   */
  private async syncInventoryDoc(prod: any) {
    try {
      await initializeMySqlTables();
      const totalStock = prod.colors && prod.colors.length > 0
        ? prod.colors.reduce((sum: number, c: any) => sum + (typeof c.stock === 'number' ? c.stock : 0), 0)
        : (prod.sizes ? prod.sizes.reduce((sum: number, s: any) => sum + (s.stock || 0), 0) : 0);

      const invId = `inv-${prod.id}`;
      const updatedAt = new Date().toISOString();

      const data = {
        productId: prod.id,
        sku: prod.sku || 'N/A',
        productName: prod.name,
        category: prod.category || 'General',
        totalStock,
        isOutOfStock: totalStock <= 0,
        colors: (prod.colors || []) as any,
        sizes: (prod.sizes || []) as any,
        updatedAt,
      };

      await prisma.inventory.upsert({
        where: { id: invId },
        update: data,
        create: { id: invId, ...data },
      });
    } catch (e) {
      console.error('[ProductService syncInventoryDoc Error]', e);
    }
  }

  /**
   * Sync gallery table documents
   */
  private async syncGalleryDocs(prod: any) {
    try {
      await initializeMySqlTables();
      await prisma.photoGallery.deleteMany({ where: { productId: prod.id } });

      if (prod.colors && Array.isArray(prod.colors) && prod.colors.length > 0) {
        let sortOrder = 0;
        const rows: any[] = [];
        for (const c of prod.colors) {
          if (c.images && Array.isArray(c.images) && c.images.length > 0) {
            for (let i = 0; i < c.images.length; i++) {
              sortOrder++;
              rows.push({
                id: `gal-${prod.id}-${sortOrder}`,
                productId: prod.id,
                colorName: c.name || 'Default',
                colorCode: c.code || '#111111',
                imageUrl: c.images[i],
                isMain: i === 0 && sortOrder === 1,
                sortOrder,
              });
            }
          }
        }
        if (rows.length > 0) {
          await prisma.photoGallery.createMany({ data: rows });
        }
      }
    } catch (e) {
      console.error('[ProductService syncGalleryDocs Error]', e);
    }
  }
}

// Global singleton pattern for server runtime
const globalProductService = (globalThis as any).__productService || new ProductService();
if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).__productService = globalProductService;
}

export const productService = globalProductService as ProductService;
