import { Product, Category, Collection, Order, Coupon, HomepageCMS, CustomerUser, DistrictDeliveryRate } from '@/types';
import { seedProducts, initialCategories, initialCollections, initialCMS } from './seed-data';
import { generateDefaultDeliveryRates } from './nepal-locations';
import { connectToDatabase } from './mongodb';
import {
  ProductModel,
  CategoryModel,
  CollectionModel,
  OrderModel,
  CouponModel,
  CMSModel,
  UserModel,
  InventoryModel,
  DeliveryRateModel,
} from '@/models';

export interface DatabaseSchema {
  products: Product[];
  categories: Category[];
  collections: Collection[];
  cms: HomepageCMS;
  orders: Order[];
  coupons: Coupon[];
  users: CustomerUser[];
  version: number;
}

export interface CacheEntityStats {
  itemCount: number;
  fetchedAt: number;
  ageSeconds: number;
  status: 'HOT' | 'STALE' | 'COLD';
  ttlMs: number;
}

export interface CacheTelemetry {
  totalQueries: number;
  hits: number;
  misses: number;
  revalidations: number;
  hitRatioPercent: number;
  lastWarmedAt: number;
  entities: {
    products: CacheEntityStats;
    categories: CacheEntityStats;
    collections: CacheEntityStats;
    cms: CacheEntityStats;
    orders: CacheEntityStats;
    coupons: CacheEntityStats;
    users: CacheEntityStats;
    deliveryRates: CacheEntityStats;
  };
}

interface EntityCache<T> {
  data: T | null;
  fetchedAt: number;
  softTtlMs: number;
  hardTtlMs: number;
}

const DEFAULT_SOFT_TTL_MS = 45000; // 45 seconds soft TTL (background revalidate)
const DEFAULT_HARD_TTL_MS = 300000; // 5 minutes hard TTL (force fresh fetch)

class ServerDataStore {
  // Granular Entity Object Caches
  private productsCache: EntityCache<Product[]> = { data: null, fetchedAt: 0, softTtlMs: 45000, hardTtlMs: 300000 };
  private categoriesCache: EntityCache<Category[]> = { data: null, fetchedAt: 0, softTtlMs: 60000, hardTtlMs: 600000 };
  private collectionsCache: EntityCache<Collection[]> = { data: null, fetchedAt: 0, softTtlMs: 60000, hardTtlMs: 600000 };
  private cmsCache: EntityCache<HomepageCMS> = { data: null, fetchedAt: 0, softTtlMs: 45000, hardTtlMs: 300000 };
  private ordersCache: EntityCache<Order[]> = { data: null, fetchedAt: 0, softTtlMs: 15000, hardTtlMs: 120000 };
  private couponsCache: EntityCache<Coupon[]> = { data: null, fetchedAt: 0, softTtlMs: 30000, hardTtlMs: 300000 };
  private usersCache: EntityCache<CustomerUser[]> = { data: null, fetchedAt: 0, softTtlMs: 30000, hardTtlMs: 300000 };
  private deliveryRatesCache: EntityCache<DistrictDeliveryRate[]> = { data: null, fetchedAt: 0, softTtlMs: 60000, hardTtlMs: 600000 };

  // High-performance In-Memory Indexes
  private productsByIdMap = new Map<string, Product>();
  private productsBySlugMap = new Map<string, Product>();
  private productsByCategoryMap = new Map<string, Product[]>();
  private categoriesBySlugMap = new Map<string, Category>();
  private categoriesByIdMap = new Map<string, Category>();
  private couponsByCodeMap = new Map<string, Coupon>();

  // Single-Flight Query Deduplication Locks
  private inFlightPromises = new Map<string, Promise<any>>();

  // Metrics & Telemetry
  private metrics = {
    totalQueries: 0,
    hits: 0,
    misses: 0,
    revalidations: 0,
    lastWarmedAt: 0,
  };

  /**
   * Single-flight execution helper to coalesce duplicate simultaneous database requests
   */
  private async runSingleFlight<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    if (this.inFlightPromises.has(key)) {
      return this.inFlightPromises.get(key) as Promise<T>;
    }
    const promise = fetchFn()
      .finally(() => {
        this.inFlightPromises.delete(key);
      });
    this.inFlightPromises.set(key, promise);
    return promise;
  }

  /**
   * Invalidate specific or all entity caches
   */
  public invalidateCache(entity?: string) {
    if (!entity || entity === 'all') {
      this.productsCache.fetchedAt = 0;
      this.categoriesCache.fetchedAt = 0;
      this.collectionsCache.fetchedAt = 0;
      this.cmsCache.fetchedAt = 0;
      this.ordersCache.fetchedAt = 0;
      this.couponsCache.fetchedAt = 0;
      this.usersCache.fetchedAt = 0;
      this.deliveryRatesCache.fetchedAt = 0;
    } else {
      switch (entity) {
        case 'products': this.productsCache.fetchedAt = 0; break;
        case 'categories': this.categoriesCache.fetchedAt = 0; break;
        case 'collections': this.collectionsCache.fetchedAt = 0; break;
        case 'cms': this.cmsCache.fetchedAt = 0; break;
        case 'orders': this.ordersCache.fetchedAt = 0; break;
        case 'coupons': this.couponsCache.fetchedAt = 0; break;
        case 'users': this.usersCache.fetchedAt = 0; break;
        case 'deliveryRates': this.deliveryRatesCache.fetchedAt = 0; break;
      }
    }
  }

  /**
   * Rebuild high-speed in-memory indexes
   */
  private rebuildIndexes(products: Product[], categories: Category[], coupons: Coupon[]) {
    this.productsByIdMap.clear();
    this.productsBySlugMap.clear();
    this.productsByCategoryMap.clear();
    this.categoriesBySlugMap.clear();
    this.categoriesByIdMap.clear();
    this.couponsByCodeMap.clear();

    products.forEach((p) => {
      if (p.id) this.productsByIdMap.set(p.id, p);
      if (p.slug) this.productsBySlugMap.set(p.slug.toLowerCase(), p);
      if (p.category) {
        const catKey = p.category.toLowerCase().trim();
        const list = this.productsByCategoryMap.get(catKey) || [];
        list.push(p);
        this.productsByCategoryMap.set(catKey, list);
      }
    });

    categories.forEach((c) => {
      if (c.id) this.categoriesByIdMap.set(c.id, c);
      if (c.slug) this.categoriesBySlugMap.set(c.slug.toLowerCase(), c);
    });

    coupons.forEach((cp) => {
      if (cp.code) this.couponsByCodeMap.set(cp.code.toUpperCase(), cp);
    });
  }

  /**
   * Fetch Products from MongoDB with direct driver fallback
   */
  private async fetchProducts(): Promise<Product[]> {
    return this.runSingleFlight('fetch_products', async () => {
      try {
        const conn = await connectToDatabase();
        let dbProds = await ProductModel.find().lean();
        if ((!dbProds || dbProds.length === 0) && conn && conn.db) {
          dbProds = await conn.db.collection('products').find({}).toArray();
        }
        const products = (dbProds || []).map((p: any) => {
          const { _id, __v, ...rest } = p;
          return rest as Product;
        });
        const finalProducts = (products && products.length > 0) ? products : (this.productsCache.data || seedProducts);
        this.productsCache = {
          data: finalProducts,
          fetchedAt: Date.now(),
          softTtlMs: DEFAULT_SOFT_TTL_MS,
          hardTtlMs: DEFAULT_HARD_TTL_MS,
        };
        return finalProducts;
      } catch (err: any) {
        console.error('[ServerDataStore fetchProducts Error]', err?.message || err);
        return this.productsCache.data || seedProducts;
      }
    });
  }

  /**
   * Fetch Categories from MongoDB with fallback
   */
  private async fetchCategories(): Promise<Category[]> {
    return this.runSingleFlight('fetch_categories', async () => {
      try {
        const conn = await connectToDatabase();
        let dbCats = await CategoryModel.find().lean();
        if ((!dbCats || dbCats.length === 0) && conn && conn.db) {
          dbCats = await conn.db.collection('categories').find({}).toArray();
        }
        const categories = (dbCats || []).map((c: any) => {
          const { _id, __v, ...rest } = c;
          return rest as Category;
        });
        const finalCategories = (categories && categories.length > 0) ? categories : initialCategories;
        this.categoriesCache = {
          data: finalCategories,
          fetchedAt: Date.now(),
          softTtlMs: 60000,
          hardTtlMs: 600000,
        };
        return finalCategories;
      } catch (err: any) {
        console.error('[ServerDataStore fetchCategories Error]', err?.message || err);
        return this.categoriesCache.data || initialCategories;
      }
    });
  }

  /**
   * Fetch Collections from MongoDB
   */
  private async fetchCollections(): Promise<Collection[]> {
    return this.runSingleFlight('fetch_collections', async () => {
      try {
        const conn = await connectToDatabase();
        let dbCols = await CollectionModel.find().lean();
        if ((!dbCols || dbCols.length === 0) && conn && conn.db) {
          dbCols = await conn.db.collection('collections').find({}).toArray();
        }
        const collections = (dbCols || []).map((c: any) => {
          const { _id, __v, ...rest } = c;
          return rest as Collection;
        });
        const finalCols = (collections && collections.length > 0) ? collections : initialCollections;
        this.collectionsCache = {
          data: finalCols,
          fetchedAt: Date.now(),
          softTtlMs: 60000,
          hardTtlMs: 600000,
        };
        return finalCols;
      } catch (err: any) {
        console.error('[ServerDataStore fetchCollections Error]', err?.message || err);
        return this.collectionsCache.data || initialCollections;
      }
    });
  }

  /**
   * Fetch Delivery Rates from MongoDB
   */
  private async fetchDeliveryRates(): Promise<DistrictDeliveryRate[]> {
    return this.runSingleFlight('fetch_delivery_rates', async () => {
      try {
        const conn = await connectToDatabase();
        let dbRates = await DeliveryRateModel.find().lean();
        if ((!dbRates || dbRates.length === 0) && conn && conn.db) {
          dbRates = await conn.db.collection('delivery_rates').find({}).toArray();
        }

        if (!dbRates || dbRates.length === 0) {
          const defaultRates = generateDefaultDeliveryRates();
          try {
            await DeliveryRateModel.insertMany(defaultRates, { ordered: false });
          } catch (e) {
            // ignore duplicate key warning
          }
          dbRates = await DeliveryRateModel.find().lean();
        }

        const deliveryRates: DistrictDeliveryRate[] = (dbRates || []).map((r: any) => {
          const { _id, __v, ...rest } = r;
          const fee = typeof rest.deliveryFee === 'number' ? rest.deliveryFee : (typeof rest.homeDeliveryFee === 'number' ? rest.homeDeliveryFee : 150);
          const isEn = typeof rest.enabled === 'boolean' ? rest.enabled : (typeof rest.homeDeliveryEnabled === 'boolean' ? rest.homeDeliveryEnabled : true);
          return {
            district: rest.district,
            province: rest.province,
            deliveryFee: fee,
            enabled: isEn,
            homeDeliveryFee: fee,
            branchDeliveryFee: typeof rest.branchDeliveryFee === 'number' ? rest.branchDeliveryFee : fee,
            homeDeliveryEnabled: isEn,
            branchDeliveryEnabled: typeof rest.branchDeliveryEnabled === 'boolean' ? rest.branchDeliveryEnabled : isEn,
          } as DistrictDeliveryRate;
        });

        const finalRates = deliveryRates.length > 0 ? deliveryRates : generateDefaultDeliveryRates();
        this.deliveryRatesCache = {
          data: finalRates,
          fetchedAt: Date.now(),
          softTtlMs: 60000,
          hardTtlMs: 600000,
        };
        return finalRates;
      } catch (err: any) {
        console.error('[ServerDataStore fetchDeliveryRates Error]', err?.message || err);
        return this.deliveryRatesCache.data || generateDefaultDeliveryRates();
      }
    });
  }

  /**
   * Fetch CMS from MongoDB
   */
  private async fetchCMS(deliveryRates?: DistrictDeliveryRate[]): Promise<HomepageCMS> {
    return this.runSingleFlight('fetch_cms', async () => {
      try {
        await connectToDatabase();
        let cmsDoc = await CMSModel.findOne({ key: 'homepage' }).lean();
        if (!cmsDoc) {
          await CMSModel.findOneAndUpdate({ key: 'homepage' }, initialCMS, { upsert: true });
          cmsDoc = await CMSModel.findOne({ key: 'homepage' }).lean();
        }

        const rates = deliveryRates || (await this.fetchDeliveryRates());

        let cms: HomepageCMS = { ...initialCMS };
        if (cmsDoc) {
          const { _id, __v, key, ...rest } = cmsDoc as any;
          cms = {
            ...initialCMS,
            ...rest,
            announcementBar: rest.announcementBar ? { ...initialCMS.announcementBar, ...rest.announcementBar } : initialCMS.announcementBar,
            hero: rest.hero ? { ...initialCMS.hero, ...rest.hero } : initialCMS.hero,
            editorialBanner: rest.editorialBanner ? { ...initialCMS.editorialBanner, ...rest.editorialBanner } : initialCMS.editorialBanner,
            fonepaySettings: rest.fonepaySettings ? { ...initialCMS.fonepaySettings, ...rest.fonepaySettings } : initialCMS.fonepaySettings,
            seo: rest.seo ? { ...initialCMS.seo, ...rest.seo } : initialCMS.seo,
            deliveryRates: rates && rates.length > 0 ? rates : generateDefaultDeliveryRates(),
          };
        } else {
          cms.deliveryRates = rates;
        }

        this.cmsCache = {
          data: cms,
          fetchedAt: Date.now(),
          softTtlMs: 45000,
          hardTtlMs: 300000,
        };
        return cms;
      } catch (err: any) {
        console.error('[ServerDataStore fetchCMS Error]', err?.message || err);
        return this.cmsCache.data || { ...initialCMS };
      }
    });
  }

  /**
   * Fetch Orders from MongoDB
   */
  private async fetchOrders(): Promise<Order[]> {
    return this.runSingleFlight('fetch_orders', async () => {
      try {
        await connectToDatabase();
        const dbOrds = await OrderModel.find().sort({ createdAt: -1 }).lean();
        const orders = (dbOrds || []).map((o: any) => {
          const { _id, __v, ...rest } = o;
          return rest as Order;
        });
        this.ordersCache = {
          data: orders,
          fetchedAt: Date.now(),
          softTtlMs: 15000,
          hardTtlMs: 120000,
        };
        return orders;
      } catch (err: any) {
        console.error('[ServerDataStore fetchOrders Error]', err?.message || err);
        return this.ordersCache.data || [];
      }
    });
  }

  /**
   * Fetch Coupons from MongoDB
   */
  private async fetchCoupons(): Promise<Coupon[]> {
    return this.runSingleFlight('fetch_coupons', async () => {
      try {
        await connectToDatabase();
        const dbCoups = await CouponModel.find().lean();
        const coupons = (dbCoups || []).map((cp: any) => {
          const { _id, __v, ...rest } = cp;
          return rest as Coupon;
        });
        this.couponsCache = {
          data: coupons,
          fetchedAt: Date.now(),
          softTtlMs: 30000,
          hardTtlMs: 300000,
        };
        return coupons;
      } catch (err: any) {
        console.error('[ServerDataStore fetchCoupons Error]', err?.message || err);
        return this.couponsCache.data || [];
      }
    });
  }

  /**
   * Fetch Users from MongoDB
   */
  private async fetchUsers(): Promise<CustomerUser[]> {
    return this.runSingleFlight('fetch_users', async () => {
      try {
        await connectToDatabase();
        const dbUsers = await UserModel.find().lean();
        const defaultAdmin: CustomerUser[] = [
          {
            id: 'usr-admin-1',
            name: 'Admin Manager',
            email: 'admin@daisyhub.com',
            mobile: '+977 9800000000',
            role: 'ADMIN',
            registrationDate: '2026-01-01',
          },
        ];
        const users: CustomerUser[] = (dbUsers && dbUsers.length > 0)
          ? dbUsers.map((u: any) => {
              const { _id, __v, ...rest } = u;
              return rest as CustomerUser;
            })
          : defaultAdmin;

        this.usersCache = {
          data: users,
          fetchedAt: Date.now(),
          softTtlMs: 30000,
          hardTtlMs: 300000,
        };
        return users;
      } catch (err: any) {
        console.error('[ServerDataStore fetchUsers Error]', err?.message || err);
        return this.usersCache.data || [];
      }
    });
  }

  /**
   * Get Fresh Data with Stale-While-Revalidate and Single-Flight Coalescing
   */
  public async getFreshData(force = false): Promise<DatabaseSchema> {
    this.metrics.totalQueries++;
    const now = Date.now();

    const isSoftExpired = (cache: EntityCache<any>) =>
      !cache.data || now - cache.fetchedAt > cache.softTtlMs;
    const isHardExpired = (cache: EntityCache<any>) =>
      !cache.data || now - cache.fetchedAt > cache.hardTtlMs;

    // Check if all entity caches are fully warm & fresh
    const allHot =
      !force &&
      !isSoftExpired(this.productsCache) &&
      !isSoftExpired(this.categoriesCache) &&
      !isSoftExpired(this.collectionsCache) &&
      !isSoftExpired(this.cmsCache) &&
      !isSoftExpired(this.ordersCache) &&
      !isSoftExpired(this.couponsCache) &&
      !isSoftExpired(this.usersCache) &&
      !isSoftExpired(this.deliveryRatesCache);

    if (allHot) {
      this.metrics.hits++;
      return {
        products: this.productsCache.data!,
        categories: this.categoriesCache.data!,
        collections: this.collectionsCache.data!,
        cms: this.cmsCache.data!,
        orders: this.ordersCache.data!,
        coupons: this.couponsCache.data!,
        users: this.usersCache.data!,
        version: Math.max(
          this.productsCache.fetchedAt,
          this.categoriesCache.fetchedAt
        ),
      };
    }

    this.metrics.misses++;

    // Determine which entities need synchronous fetching vs background revalidation
    const fetchPromises: Promise<any>[] = [];

    const getOrFetch = async <T>(
      cache: EntityCache<T>,
      fetcher: () => Promise<T>
    ): Promise<T> => {
      if (force || isHardExpired(cache)) {
        return await fetcher();
      }
      if (isSoftExpired(cache)) {
        // Trigger background revalidation non-blocking
        this.metrics.revalidations++;
        fetcher().catch((e) =>
          console.error('[SWR Background Revalidate Error]', e)
        );
      }
      return cache.data!;
    };

    const [products, categories, collections, deliveryRates, orders, coupons, users] =
      await Promise.all([
        getOrFetch(this.productsCache, () => this.fetchProducts()),
        getOrFetch(this.categoriesCache, () => this.fetchCategories()),
        getOrFetch(this.collectionsCache, () => this.fetchCollections()),
        getOrFetch(this.deliveryRatesCache, () => this.fetchDeliveryRates()),
        getOrFetch(this.ordersCache, () => this.fetchOrders()),
        getOrFetch(this.couponsCache, () => this.fetchCoupons()),
        getOrFetch(this.usersCache, () => this.fetchUsers()),
      ]);

    const cms = await getOrFetch(this.cmsCache, () =>
      this.fetchCMS(deliveryRates)
    );

    // Rebuild high-speed index maps
    this.rebuildIndexes(products, categories, coupons);
    this.metrics.lastWarmedAt = Date.now();

    return {
      products,
      categories,
      collections,
      cms,
      orders,
      coupons,
      users,
      version: Date.now(),
    };
  }

  /**
   * Fast O(1) Indexed Lookups
   */
  public async getProductById(id: string): Promise<Product | undefined> {
    if (this.productsByIdMap.has(id)) {
      return this.productsByIdMap.get(id);
    }
    const data = await this.getFreshData();
    return data.products.find((p) => p.id === id);
  }

  public async getProductBySlug(slug: string): Promise<Product | undefined> {
    const key = slug.toLowerCase().trim();
    if (this.productsBySlugMap.has(key)) {
      return this.productsBySlugMap.get(key);
    }
    const data = await this.getFreshData();
    return data.products.find((p) => p.slug.toLowerCase() === key);
  }

  public async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const key = slug.toLowerCase().trim();
    if (this.categoriesBySlugMap.has(key)) {
      return this.categoriesBySlugMap.get(key);
    }
    const data = await this.getFreshData();
    return data.categories.find((c) => c.slug.toLowerCase() === key);
  }

  /**
   * Cache Telemetry & Stats for Monitoring
   */
  public getCacheStats(): CacheTelemetry {
    const now = Date.now();
    const getStatus = (cache: EntityCache<any>): 'HOT' | 'STALE' | 'COLD' => {
      if (!cache.data) return 'COLD';
      const age = now - cache.fetchedAt;
      if (age <= cache.softTtlMs) return 'HOT';
      if (age <= cache.hardTtlMs) return 'STALE';
      return 'COLD';
    };

    const totalReqs = this.metrics.hits + this.metrics.misses;
    const hitRatioPercent = totalReqs > 0 ? Number(((this.metrics.hits / totalReqs) * 100).toFixed(1)) : 100;

    return {
      totalQueries: this.metrics.totalQueries,
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      revalidations: this.metrics.revalidations,
      hitRatioPercent,
      lastWarmedAt: this.metrics.lastWarmedAt,
      entities: {
        products: {
          itemCount: this.productsCache.data?.length || 0,
          fetchedAt: this.productsCache.fetchedAt,
          ageSeconds: Math.floor((now - this.productsCache.fetchedAt) / 1000),
          status: getStatus(this.productsCache),
          ttlMs: this.productsCache.softTtlMs,
        },
        categories: {
          itemCount: this.categoriesCache.data?.length || 0,
          fetchedAt: this.categoriesCache.fetchedAt,
          ageSeconds: Math.floor((now - this.categoriesCache.fetchedAt) / 1000),
          status: getStatus(this.categoriesCache),
          ttlMs: this.categoriesCache.softTtlMs,
        },
        collections: {
          itemCount: this.collectionsCache.data?.length || 0,
          fetchedAt: this.collectionsCache.fetchedAt,
          ageSeconds: Math.floor((now - this.collectionsCache.fetchedAt) / 1000),
          status: getStatus(this.collectionsCache),
          ttlMs: this.collectionsCache.softTtlMs,
        },
        cms: {
          itemCount: this.cmsCache.data ? 1 : 0,
          fetchedAt: this.cmsCache.fetchedAt,
          ageSeconds: Math.floor((now - this.cmsCache.fetchedAt) / 1000),
          status: getStatus(this.cmsCache),
          ttlMs: this.cmsCache.softTtlMs,
        },
        orders: {
          itemCount: this.ordersCache.data?.length || 0,
          fetchedAt: this.ordersCache.fetchedAt,
          ageSeconds: Math.floor((now - this.ordersCache.fetchedAt) / 1000),
          status: getStatus(this.ordersCache),
          ttlMs: this.ordersCache.softTtlMs,
        },
        coupons: {
          itemCount: this.couponsCache.data?.length || 0,
          fetchedAt: this.couponsCache.fetchedAt,
          ageSeconds: Math.floor((now - this.couponsCache.fetchedAt) / 1000),
          status: getStatus(this.couponsCache),
          ttlMs: this.couponsCache.softTtlMs,
        },
        users: {
          itemCount: this.usersCache.data?.length || 0,
          fetchedAt: this.usersCache.fetchedAt,
          ageSeconds: Math.floor((now - this.usersCache.fetchedAt) / 1000),
          status: getStatus(this.usersCache),
          ttlMs: this.usersCache.softTtlMs,
        },
        deliveryRates: {
          itemCount: this.deliveryRatesCache.data?.length || 0,
          fetchedAt: this.deliveryRatesCache.fetchedAt,
          ageSeconds: Math.floor((now - this.deliveryRatesCache.fetchedAt) / 1000),
          status: getStatus(this.deliveryRatesCache),
          ttlMs: this.deliveryRatesCache.softTtlMs,
        },
      },
    };
  }

  // --- EXISTING DATABASE MUTATION & INTERFACE METHODS ---

  private async syncInventoryDoc(prod: any) {
    try {
      const conn = await connectToDatabase();
      const totalStock = prod.colors && prod.colors.length > 0
        ? prod.colors.reduce((sum: number, c: any) => sum + (typeof c.stock === 'number' ? c.stock : 0), 0)
        : (prod.sizes ? prod.sizes.reduce((sum: number, s: any) => sum + (s.stock || 0), 0) : 0);

      const invItem = {
        id: `inv-${prod.id}`,
        productId: prod.id,
        sku: prod.sku,
        productName: prod.name,
        category: prod.category,
        totalStock,
        isOutOfStock: totalStock <= 0,
        colors: prod.colors || [],
        sizes: prod.sizes || [],
        updatedAt: new Date().toISOString(),
      };

      await InventoryModel.findOneAndUpdate({ productId: prod.id }, invItem, { upsert: true, new: true });
      if (conn && conn.db) {
        await conn.db.collection('inventory').updateOne({ productId: prod.id }, { $set: invItem }, { upsert: true });
      }
    } catch (e) {
      console.error('[MongoDB Atlas Inventory Sync Error]', e);
    }
  }

  async getProducts(): Promise<Product[]> {
    const data = await this.getFreshData();
    return data.products;
  }

  async saveProduct(product: Product): Promise<Product> {
    this.invalidateCache('products');
    try {
      const conn = await connectToDatabase();
      await ProductModel.findOneAndUpdate({ id: product.id }, product, { upsert: true, new: true });
      if (conn && conn.db) {
        await conn.db.collection('products').updateOne({ id: product.id }, { $set: product }, { upsert: true });
      }
      await this.syncInventoryDoc(product);
      console.log(`[MongoDB Atlas] Successfully saved product '${product.name}' (${product.id}) and synced to inventory collection`);
    } catch (err: any) {
      console.error(`[MongoDB Atlas Error] Saving product ${product.id}:`, err?.message || err);
    }
    return product;
  }

  async deleteProduct(id: string): Promise<boolean> {
    this.invalidateCache('products');
    try {
      const conn = await connectToDatabase();
      const res = await ProductModel.deleteOne({ id });
      await InventoryModel.deleteOne({ productId: id });
      if (conn && conn.db) {
        await conn.db.collection('products').deleteOne({ id });
        await conn.db.collection('inventory').deleteOne({ productId: id });
      }
      console.log(`[MongoDB Atlas] Successfully deleted product ${id} from products and inventory`);
      return res.deletedCount ? res.deletedCount > 0 : true;
    } catch (err: any) {
      console.error(`[MongoDB Atlas Error] Deleting product ${id}:`, err?.message || err);
      return false;
    }
  }

  async updateInventory(productId: string, size: string, newStock: number): Promise<boolean> {
    this.invalidateCache('products');
    try {
      const conn = await connectToDatabase();
      const prodDoc = await ProductModel.findOne({ id: productId });
      if (!prodDoc) return false;

      const prod = prodDoc.toObject();
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

      await ProductModel.findOneAndUpdate({ id: productId }, prod, { upsert: true });
      if (conn && conn.db) {
        await conn.db.collection('products').updateOne({ id: productId }, { $set: prod }, { upsert: true });
      }
      await this.syncInventoryDoc(prod);
      console.log(`[MongoDB Atlas] Updated inventory for product ${productId} size '${size}' to ${cleanStock}`);
      return true;
    } catch (err: any) {
      console.error(`[MongoDB Atlas Error] Updating inventory for ${productId}:`, err?.message || err);
      return false;
    }
  }

  async updateColorStock(productId: string, colorName: string, newStock: number): Promise<boolean> {
    this.invalidateCache('products');
    try {
      const conn = await connectToDatabase();
      const prodDoc = await ProductModel.findOne({ id: productId });
      if (!prodDoc) return false;

      const prod = prodDoc.toObject();
      const cleanStock = isNaN(Number(newStock)) ? 0 : Math.max(0, Math.min(999, Math.floor(Number(newStock))));

      if (prod.colors && prod.colors.length > 0) {
        const targetColor = prod.colors.find((c: any) => c.name.toLowerCase() === colorName.toLowerCase());
        if (targetColor) {
          targetColor.stock = cleanStock;
        }
      }

      const totalColorStock = prod.colors ? prod.colors.reduce((acc: number, c: any) => acc + (typeof c.stock === 'number' ? c.stock : 0), 0) : 0;
      prod.sizes = [{ size: 'Free Size', stock: totalColorStock }];
      prod.isOutOfStock = totalColorStock <= 0;

      await ProductModel.findOneAndUpdate({ id: productId }, prod, { upsert: true });
      if (conn && conn.db) {
        await conn.db.collection('products').updateOne({ id: productId }, { $set: prod }, { upsert: true });
      }
      await this.syncInventoryDoc(prod);
      console.log(`[MongoDB Atlas] Updated color stock for product ${productId} color '${colorName}' to ${cleanStock}`);
      return true;
    } catch (err: any) {
      console.error(`[MongoDB Atlas Error] Updating color stock for ${productId}:`, err?.message || err);
      return false;
    }
  }

  async saveCategory(category: Category): Promise<Category> {
    this.invalidateCache('categories');
    try {
      const conn = await connectToDatabase();
      await CategoryModel.findOneAndUpdate({ id: category.id }, category, { upsert: true, new: true });
      if (conn && conn.db) {
        await conn.db.collection('categories').updateOne({ id: category.id }, { $set: category }, { upsert: true });
      }
      console.log(`[MongoDB Atlas] Successfully saved category '${category.name}' (${category.id})`);
    } catch (err: any) {
      console.error(`[MongoDB Atlas Error] Saving category '${category.name}':`, err?.message || err);
    }
    return category;
  }

  async deleteCategory(id: string): Promise<boolean> {
    this.invalidateCache('categories');
    try {
      const conn = await connectToDatabase();
      const res = await CategoryModel.deleteOne({ $or: [{ id }, { slug: id }] });
      if (conn && conn.db) {
        await conn.db.collection('categories').deleteOne({ $or: [{ id }, { slug: id }] });
      }
      console.log(`[MongoDB Atlas] Successfully deleted category ${id}`);
      return res.deletedCount ? res.deletedCount > 0 : true;
    } catch (err: any) {
      console.error(`[MongoDB Atlas Error] Deleting category ${id}:`, err?.message || err);
      return false;
    }
  }

  async saveCollection(collection: Collection): Promise<Collection> {
    this.invalidateCache('collections');
    try {
      const conn = await connectToDatabase();
      await CollectionModel.findOneAndUpdate({ id: collection.id }, collection, { upsert: true, new: true });
      if (conn && conn.db) {
        await conn.db.collection('collections').updateOne({ id: collection.id }, { $set: collection }, { upsert: true });
      }
      console.log(`[MongoDB Atlas] Successfully saved collection '${collection.name}' (${collection.id})`);
    } catch (err: any) {
      console.error(`[MongoDB Atlas Error] Saving collection '${collection.name}':`, err?.message || err);
    }
    return collection;
  }

  async deleteCollection(id: string): Promise<boolean> {
    this.invalidateCache('collections');
    try {
      const conn = await connectToDatabase();
      const res = await CollectionModel.deleteOne({ $or: [{ id }, { slug: id }] });
      if (conn && conn.db) {
        await conn.db.collection('collections').deleteOne({ $or: [{ id }, { slug: id }] });
      }
      console.log(`[MongoDB Atlas] Successfully deleted collection ${id}`);
      return res.deletedCount ? res.deletedCount > 0 : true;
    } catch (err: any) {
      console.error(`[MongoDB Atlas Error] Deleting collection ${id}:`, err?.message || err);
      return false;
    }
  }

  async saveCoupon(coupon: Coupon): Promise<Coupon> {
    this.invalidateCache('coupons');
    const cleanCode = coupon.code.trim().toUpperCase();
    const cleanCoupon = { ...coupon, code: cleanCode };
    try {
      const conn = await connectToDatabase();
      await CouponModel.findOneAndUpdate({ code: cleanCode }, cleanCoupon, { upsert: true, new: true });
      if (conn && conn.db) {
        await conn.db.collection('coupons').updateOne({ code: cleanCode }, { $set: cleanCoupon }, { upsert: true });
      }
      console.log(`[MongoDB Atlas] Successfully saved coupon ${cleanCode}`);
    } catch (err: any) {
      console.error(`[MongoDB Atlas Error] Saving coupon ${cleanCode}:`, err?.message || err);
    }
    return cleanCoupon;
  }

  async deleteCoupon(code: string): Promise<boolean> {
    this.invalidateCache('coupons');
    const cleanCode = code.trim().toUpperCase();
    try {
      const conn = await connectToDatabase();
      const res = await CouponModel.deleteOne({ code: cleanCode });
      if (conn && conn.db) {
        await conn.db.collection('coupons').deleteOne({ code: cleanCode });
      }
      console.log(`[MongoDB Atlas] Successfully deleted coupon ${cleanCode}`);
      return res.deletedCount ? res.deletedCount > 0 : true;
    } catch (err: any) {
      console.error(`[MongoDB Atlas Error] Deleting coupon ${cleanCode}:`, err?.message || err);
      return false;
    }
  }

  async saveUser(user: CustomerUser): Promise<CustomerUser> {
    this.invalidateCache('users');
    try {
      const conn = await connectToDatabase();
      await UserModel.findOneAndUpdate({ id: user.id }, user, { upsert: true, new: true });
      if (conn && conn.db) {
        await conn.db.collection('users').updateOne({ id: user.id }, { $set: user }, { upsert: true });
      }
      console.log(`[MongoDB Atlas] Successfully saved user ${user.email}`);
    } catch (err: any) {
      console.error(`[MongoDB Atlas Error] Saving user ${user.email}:`, err?.message || err);
    }
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    this.invalidateCache('users');
    try {
      const conn = await connectToDatabase();
      const res = await UserModel.deleteOne({ $or: [{ id }, { email: id }] });
      if (conn && conn.db) {
        await conn.db.collection('users').deleteOne({ $or: [{ id }, { email: id }] });
      }
      console.log(`[MongoDB Atlas] Successfully deleted user ${id}`);
      return res.deletedCount ? res.deletedCount > 0 : true;
    } catch (err: any) {
      console.error(`[MongoDB Atlas Error] Deleting user ${id}:`, err?.message || err);
      return false;
    }
  }

  async deleteOrder(id: string): Promise<boolean> {
    this.invalidateCache('orders');
    try {
      const conn = await connectToDatabase();
      const res = await OrderModel.deleteOne({ $or: [{ id }, { orderNumber: id }] });
      if (conn && conn.db) {
        await conn.db.collection('orders').deleteOne({ $or: [{ id }, { orderNumber: id }] });
      }
      console.log(`[MongoDB Atlas] Successfully deleted order ${id}`);
      return res.deletedCount ? res.deletedCount > 0 : true;
    } catch (err: any) {
      console.error(`[MongoDB Atlas Error] Deleting order ${id}:`, err?.message || err);
      return false;
    }
  }

  async deleteReview(productId: string, reviewId: string): Promise<boolean> {
    this.invalidateCache('products');
    try {
      const conn = await connectToDatabase();
      const prodDoc = await ProductModel.findOne({ $or: [{ id: productId }, { slug: productId }] });
      if (!prodDoc) return false;

      const prod = prodDoc.toObject();
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
          await ProductModel.findOneAndUpdate({ id: prod.id }, prod, { upsert: true });
          if (conn && conn.db) {
            await conn.db.collection('products').updateOne({ id: prod.id }, { $set: prod }, { upsert: true });
          }
          console.log(`[MongoDB Atlas] Deleted review ${reviewId} from product ${prod.id}`);
          return true;
        }
      }
      return false;
    } catch (err: any) {
      console.error(`[MongoDB Atlas Error] Deleting review ${reviewId}:`, err?.message || err);
      return false;
    }
  }

  async updateDeliveryRates(rates: DistrictDeliveryRate[]): Promise<DistrictDeliveryRate[]> {
    this.invalidateCache('deliveryRates');
    this.invalidateCache('cms');
    try {
      const conn = await connectToDatabase();
      for (const r of rates) {
        await DeliveryRateModel.findOneAndUpdate({ district: r.district }, r, { upsert: true, new: true });
        if (conn && conn.db) {
          await conn.db.collection('delivery_rates').updateOne({ district: r.district }, { $set: r }, { upsert: true });
        }
      }
      await CMSModel.findOneAndUpdate({ key: 'homepage' }, { $set: { deliveryRates: rates } }, { upsert: true });
      if (conn && conn.db) {
        await conn.db.collection('cms').updateOne({ key: 'homepage' }, { $set: { deliveryRates: rates } }, { upsert: true });
      }
      console.log(`[MongoDB Atlas] Successfully updated ${rates.length} delivery rates in delivery_rates collection`);
      return rates;
    } catch (err: any) {
      console.error('[MongoDB Atlas Error] Updating delivery rates:', err?.message || err);
      return rates;
    }
  }

  async updateCMS(newCms: Partial<HomepageCMS>): Promise<HomepageCMS> {
    this.invalidateCache('cms');
    try {
      const conn = await connectToDatabase();
      if (newCms.deliveryRates && Array.isArray(newCms.deliveryRates) && newCms.deliveryRates.length > 0) {
        await this.updateDeliveryRates(newCms.deliveryRates);
      }
      const existingCMSDoc = await CMSModel.findOne({ key: 'homepage' }).lean();
      let currentCMS = { ...initialCMS };
      if (existingCMSDoc) {
        const { _id, __v, key, ...rest } = existingCMSDoc as any;
        currentCMS = { ...currentCMS, ...rest };
      }
      const updated: HomepageCMS = {
        ...currentCMS,
        ...newCms,
        announcementBar: newCms.announcementBar ? { ...currentCMS.announcementBar, ...newCms.announcementBar } : currentCMS.announcementBar,
        hero: newCms.hero ? { ...currentCMS.hero, ...newCms.hero } : currentCMS.hero,
        editorialBanner: newCms.editorialBanner ? { ...currentCMS.editorialBanner, ...newCms.editorialBanner } : currentCMS.editorialBanner,
        fonepaySettings: newCms.fonepaySettings ? { ...currentCMS.fonepaySettings, ...newCms.fonepaySettings } : currentCMS.fonepaySettings,
        seo: newCms.seo ? { ...currentCMS.seo, ...newCms.seo } : currentCMS.seo,
        deliveryRates: newCms.deliveryRates ? newCms.deliveryRates : currentCMS.deliveryRates,
      };
      await CMSModel.findOneAndUpdate({ key: 'homepage' }, { $set: updated }, { upsert: true, new: true });
      if (conn && conn.db) {
        await conn.db.collection('cms').updateOne({ key: 'homepage' }, { $set: updated }, { upsert: true });
      }
      console.log(`[MongoDB Atlas] Successfully updated CMS (rates count: ${updated.deliveryRates?.length || 0})`);
      return updated;
    } catch (err: any) {
      console.error('[MongoDB Atlas Error] Updating CMS:', err?.message || err);
      return { ...initialCMS, ...newCms };
    }
  }

  async createOrder(order: Order): Promise<Order> {
    this.invalidateCache('orders');
    try {
      const conn = await connectToDatabase();
      await OrderModel.findOneAndUpdate({ id: order.id }, order, { upsert: true, new: true });
      if (conn && conn.db) {
        await conn.db.collection('orders').updateOne({ id: order.id }, { $set: order }, { upsert: true });
      }
      console.log(`[MongoDB Atlas] Successfully created order ${order.orderNumber}`);
    } catch (err: any) {
      console.error(`[MongoDB Atlas Error] Creating order ${order.orderNumber}:`, err?.message || err);
    }
    return order;
  }

  async updateOrderStatus(orderId: string, status: Order['orderStatus']): Promise<Order | undefined> {
    this.invalidateCache('orders');
    try {
      const conn = await connectToDatabase();
      const ordDoc = await OrderModel.findOne({ $or: [{ id: orderId }, { orderNumber: orderId }] });
      if (ordDoc) {
        ordDoc.orderStatus = status;
        await ordDoc.save();
        if (conn && conn.db) {
          await conn.db.collection('orders').updateOne(
            { $or: [{ id: orderId }, { orderNumber: orderId }] },
            { $set: { orderStatus: status } }
          );
        }
        console.log(`[MongoDB Atlas] Updated order status for ${ordDoc.orderNumber} to ${status}`);
        const { _id, __v, ...rest } = ordDoc.toObject();
        return rest as Order;
      }
    } catch (err: any) {
      console.error(`[MongoDB Atlas Error] Updating order status for ${orderId}:`, err?.message || err);
    }
    return undefined;
  }

  async syncFullData(fullData: Partial<DatabaseSchema>): Promise<DatabaseSchema> {
    this.invalidateCache('all');
    try {
      const conn = await connectToDatabase();
      if (fullData.products && Array.isArray(fullData.products)) {
        for (const p of fullData.products) {
          await ProductModel.findOneAndUpdate({ id: p.id }, p, { upsert: true });
          if (conn && conn.db) await conn.db.collection('products').updateOne({ id: p.id }, { $set: p }, { upsert: true });
        }
      }
      if (fullData.categories && Array.isArray(fullData.categories)) {
        for (const c of fullData.categories) {
          await CategoryModel.findOneAndUpdate({ id: c.id }, c, { upsert: true });
          if (conn && conn.db) await conn.db.collection('categories').find();
        }
      }
      if (fullData.collections && Array.isArray(fullData.collections)) {
        for (const col of fullData.collections) {
          await CollectionModel.findOneAndUpdate({ id: col.id }, col, { upsert: true });
          if (conn && conn.db) await conn.db.collection('collections').updateOne({ id: col.id }, { $set: col }, { upsert: true });
        }
      }
      if (fullData.cms) {
        await CMSModel.findOneAndUpdate({ key: 'homepage' }, fullData.cms, { upsert: true });
        if (conn && conn.db) await conn.db.collection('cms').updateOne({ key: 'homepage' }, { $set: fullData.cms }, { upsert: true });
      }
      if (fullData.orders && Array.isArray(fullData.orders)) {
        for (const o of fullData.orders) {
          await OrderModel.findOneAndUpdate({ id: o.id }, o, { upsert: true });
          if (conn && conn.db) await conn.db.collection('orders').updateOne({ id: o.id }, { $set: o }, { upsert: true });
        }
      }
      if (fullData.coupons && Array.isArray(fullData.coupons)) {
        for (const cp of fullData.coupons) {
          await CouponModel.findOneAndUpdate({ code: cp.code }, cp, { upsert: true });
          if (conn && conn.db) await conn.db.collection('coupons').updateOne({ code: cp.code }, { $set: cp }, { upsert: true });
        }
      }
      if (fullData.users && Array.isArray(fullData.users)) {
        for (const u of fullData.users) {
          await UserModel.findOneAndUpdate({ id: u.id }, u, { upsert: true });
          if (conn && conn.db) await conn.db.collection('users').updateOne({ id: u.id }, { $set: u }, { upsert: true });
        }
      }
    } catch (err: any) {
      console.error('[MongoDB Atlas Error] Syncing full data:', err?.message || err);
    }
    return this.getFreshData(true);
  }
}

const globalServerStore = (globalThis as any).__aceServerStore || new ServerDataStore();
if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).__aceServerStore = globalServerStore;
}

export const serverDb = globalServerStore as ServerDataStore;
