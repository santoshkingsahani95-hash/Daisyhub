import { Product, Category, Collection, Order, Coupon, HomepageCMS, CustomerUser, DistrictDeliveryRate } from '@/types';
import { seedProducts, initialCategories, initialCollections, initialCMS } from './seed-data';
import { generateDefaultDeliveryRates } from './nepal-locations';
import { executeQuery, initializeMySqlTables, toJSON, parseJSON } from './mysql';
import { sanitizeObjectImages } from './image-upload';

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
   * Fetch Products from MySQL with automatic seed fallback
   */
  public async fetchProducts(): Promise<Product[]> {
    return this.runSingleFlight('fetch_products', async () => {
      try {
        await initializeMySqlTables();
        const rows: any[] = await executeQuery('SELECT * FROM products');

        let products: Product[] = [];
        if (rows && rows.length > 0) {
          products = rows.map((r: any) => ({
            id: r.id,
            slug: r.slug,
            name: r.name,
            description: r.description || '',
            details: parseJSON(r.details, []),
            fabricCare: r.fabric_care || '',
            category: r.category,
            subcategory: r.subcategory || undefined,
            collections: parseJSON(r.collections, []),
            price: Number(r.price),
            salePrice: r.sale_price !== null && r.sale_price !== undefined ? Number(r.sale_price) : undefined,
            discountPercentage: r.discount_percentage !== null ? Number(r.discount_percentage) : undefined,
            rating: Number(r.rating || 4.8),
            reviewCount: Number(r.review_count || 0),
            isTrending: Boolean(r.is_trending),
            isNewArrival: Boolean(r.is_new_arrival),
            isBestSeller: Boolean(r.is_best_seller),
            isSale: Boolean(r.is_sale),
            isOutOfStock: Boolean(r.is_out_of_stock),
            colors: parseJSON(r.colors, []),
            sizes: parseJSON(r.sizes, []),
            sku: r.sku,
            reviews: parseJSON(r.reviews, []),
            insideValleyFee: Number(r.inside_valley_fee || 100),
            outsideValleyFee: Number(r.outside_valley_fee || 200),
            isFreeDelivery: Boolean(r.is_free_delivery),
            seo: parseJSON(r.seo, undefined),
            createdAt: r.created_at || new Date().toISOString(),
          }));
        }

        this.productsCache = {
          data: products,
          fetchedAt: Date.now(),
          softTtlMs: DEFAULT_SOFT_TTL_MS,
          hardTtlMs: DEFAULT_HARD_TTL_MS,
        };
        return products;
      } catch (err: any) {
        console.error('[MySQL fetchProducts Error]', err?.message || err);
        return this.productsCache.data || [];
      }
    });
  }

  /**
   * Fetch Categories from MySQL with fallback
   */
  public async fetchCategories(): Promise<Category[]> {
    return this.runSingleFlight('fetch_categories', async () => {
      try {
        await initializeMySqlTables();
        const rows: any[] = await executeQuery('SELECT * FROM categories');

        let categories: Category[] = [];
        if (rows && rows.length > 0) {
          categories = rows.map((r: any) => ({
            id: r.id,
            slug: r.slug,
            name: r.name,
            description: r.description || '',
            image: r.image || '',
            subcategories: parseJSON(r.subcategories, []),
            seo: parseJSON(r.seo, undefined),
          }));
        }

        // If MySQL table is empty, auto-seed with initialCategories
        if (categories.length === 0 && initialCategories && initialCategories.length > 0) {
          console.log('[MySQL] Categories table empty. Auto-populating initial categories...');
          for (const c of initialCategories) {
            await this.saveCategory(c);
          }
          categories = initialCategories;
        }

        this.categoriesCache = {
          data: categories,
          fetchedAt: Date.now(),
          softTtlMs: 60000,
          hardTtlMs: 600000,
        };
        return categories;
      } catch (err: any) {
        console.error('[MySQL fetchCategories Error]', err?.message || err);
        return this.categoriesCache.data || initialCategories;
      }
    });
  }

  /**
   * Fetch Collections from MySQL
   */
  public async fetchCollections(): Promise<Collection[]> {
    return this.runSingleFlight('fetch_collections', async () => {
      try {
        await initializeMySqlTables();
        const rows: any[] = await executeQuery('SELECT * FROM collections');

        let collections: Collection[] = [];
        if (rows && rows.length > 0) {
          collections = rows.map((r: any) => ({
            id: r.id,
            slug: r.slug,
            name: r.name,
            description: r.description || '',
            image: r.image || '',
            seo: parseJSON(r.seo, undefined),
          }));
        }

        // Auto-seed if empty
        if (collections.length === 0 && initialCollections && initialCollections.length > 0) {
          console.log('[MySQL] Collections table empty. Auto-populating initial collections...');
          for (const col of initialCollections) {
            await this.saveCollection(col);
          }
          collections = initialCollections;
        }

        this.collectionsCache = {
          data: collections,
          fetchedAt: Date.now(),
          softTtlMs: 60000,
          hardTtlMs: 600000,
        };
        return collections;
      } catch (err: any) {
        console.error('[MySQL fetchCollections Error]', err?.message || err);
        return this.collectionsCache.data || initialCollections;
      }
    });
  }

  /**
   * Fetch Delivery Rates from MySQL
   */
  private async fetchDeliveryRates(): Promise<DistrictDeliveryRate[]> {
    return this.runSingleFlight('fetch_delivery_rates', async () => {
      try {
        await initializeMySqlTables();
        const rows: any[] = await executeQuery('SELECT * FROM delivery_rates');

        let rates: DistrictDeliveryRate[] = [];
        if (rows && rows.length > 0) {
          rates = rows.map((r: any) => ({
            district: r.district,
            province: r.province,
            deliveryFee: Number(r.delivery_fee),
            enabled: Boolean(r.enabled),
            homeDeliveryFee: r.home_delivery_fee !== null ? Number(r.home_delivery_fee) : Number(r.delivery_fee),
            branchDeliveryFee: r.branch_delivery_fee !== null ? Number(r.branch_delivery_fee) : Number(r.delivery_fee),
            homeDeliveryEnabled: r.home_delivery_enabled !== null ? Boolean(r.home_delivery_enabled) : Boolean(r.enabled),
            branchDeliveryEnabled: r.branch_delivery_enabled !== null ? Boolean(r.branch_delivery_enabled) : Boolean(r.enabled),
          }));
        }

        // Auto-seed all 77 districts if empty
        if (rates.length === 0) {
          console.log('[MySQL] Delivery rates table empty. Bulk populating 77 Nepal districts...');
          const defaults = generateDefaultDeliveryRates();
          await this.updateDeliveryRates(defaults);
          rates = defaults;
        }

        this.deliveryRatesCache = {
          data: rates,
          fetchedAt: Date.now(),
          softTtlMs: 60000,
          hardTtlMs: 600000,
        };
        return rates;
      } catch (err: any) {
        console.error('[MySQL fetchDeliveryRates Error]', err?.message || err);
        return this.deliveryRatesCache.data || generateDefaultDeliveryRates();
      }
    });
  }

  /**
   * Fetch CMS from MySQL
   */
  public async fetchCMS(deliveryRates?: DistrictDeliveryRate[]): Promise<HomepageCMS> {
    return this.runSingleFlight('fetch_cms', async () => {
      try {
        await initializeMySqlTables();
        const rows: any[] = await executeQuery('SELECT * FROM cms WHERE `key` = ?', ['homepage']);

        const rates = deliveryRates || (await this.fetchDeliveryRates());

        let cms: HomepageCMS = { ...initialCMS };
        if (rows && rows.length > 0) {
          const r = rows[0];
          cms = {
            ...initialCMS,
            announcementBar: parseJSON(r.announcement_bar, initialCMS.announcementBar),
            hero: parseJSON(r.hero, initialCMS.hero),
            editorialBanner: parseJSON(r.editorial_banner, initialCMS.editorialBanner),
            instagramImages: parseJSON(r.instagram_images, initialCMS.instagramImages),
            fonepaySettings: parseJSON(r.fonepay_settings, initialCMS.fonepaySettings),
            seo: parseJSON(r.seo, initialCMS.seo),
            deliveryRates: rates,
          };
        } else {
          // Auto-seed homepage CMS
          console.log('[MySQL] CMS table empty. Auto-populating homepage CMS...');
          await this.updateCMS(initialCMS);
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
        console.error('[MySQL fetchCMS Error]', err?.message || err);
        return this.cmsCache.data || { ...initialCMS };
      }
    });
  }

  /**
   * Fetch Orders from MySQL
   */
  private async fetchOrders(): Promise<Order[]> {
    return this.runSingleFlight('fetch_orders', async () => {
      try {
        await initializeMySqlTables();
        const rows: any[] = await executeQuery('SELECT * FROM orders ORDER BY created_at DESC');

        const orders: Order[] = (rows || []).map((r: any) => ({
          id: r.id,
          orderNumber: r.order_number,
          createdAt: r.created_at || new Date().toISOString(),
          items: parseJSON(r.items, []),
          subtotal: Number(r.subtotal),
          discount: Number(r.discount || 0),
          shipping: Number(r.shipping || 0),
          total: Number(r.total),
          paymentMethod: r.payment_method,
          paymentStatus: r.payment_status || 'pending',
          orderStatus: r.order_status || 'Pending',
          customerName: r.customer_name,
          customerEmail: r.customer_email,
          customerMobile: r.customer_mobile,
          shippingAddress: parseJSON(r.shipping_address, {
            fullName: r.customer_name || '',
            mobile: r.customer_mobile || '',
            email: r.customer_email || '',
            province: 'Bagmati',
            district: 'Kathmandu',
            city: 'Kathmandu',
            streetAddress: 'Kathmandu Valley',
          }),
          estimatedDelivery: r.estimated_delivery || undefined,
          trackingNumber: r.tracking_number || undefined,
        }));

        this.ordersCache = {
          data: orders,
          fetchedAt: Date.now(),
          softTtlMs: 15000,
          hardTtlMs: 120000,
        };
        return orders;
      } catch (err: any) {
        console.error('[MySQL fetchOrders Error]', err?.message || err);
        return this.ordersCache.data || [];
      }
    });
  }

  /**
   * Fetch Coupons from MySQL
   */
  private async fetchCoupons(): Promise<Coupon[]> {
    return this.runSingleFlight('fetch_coupons', async () => {
      try {
        await initializeMySqlTables();
        const rows: any[] = await executeQuery('SELECT * FROM coupons');

        const coupons: Coupon[] = (rows || []).map((r: any) => ({
          code: r.code,
          discountType: r.discount_type,
          discountValue: Number(r.discount_value),
          minOrderValue: Number(r.min_order_value || 0),
          maxDiscount: r.max_discount !== null ? Number(r.max_discount) : undefined,
          expiryDate: r.expiry_date || undefined,
          active: Boolean(r.active),
        }));

        this.couponsCache = {
          data: coupons,
          fetchedAt: Date.now(),
          softTtlMs: 30000,
          hardTtlMs: 300000,
        };
        return coupons;
      } catch (err: any) {
        console.error('[MySQL fetchCoupons Error]', err?.message || err);
        return this.couponsCache.data || [];
      }
    });
  }

  /**
   * Fetch Users from MySQL
   */
  private async fetchUsers(): Promise<CustomerUser[]> {
    return this.runSingleFlight('fetch_users', async () => {
      try {
        await initializeMySqlTables();
        const rows: any[] = await executeQuery('SELECT * FROM users');

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

        let users: CustomerUser[] = (rows || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          mobile: r.mobile || undefined,
          role: r.role || 'CUSTOMER',
          registrationDate: r.registration_date || new Date().toISOString(),
          isBlocked: Boolean(r.is_blocked),
          addresses: parseJSON(r.addresses, []),
        }));

        if (users.length === 0) {
          await this.saveUser(defaultAdmin[0]);
          users = defaultAdmin;
        }

        this.usersCache = {
          data: users,
          fetchedAt: Date.now(),
          softTtlMs: 30000,
          hardTtlMs: 300000,
        };
        return users;
      } catch (err: any) {
        console.error('[MySQL fetchUsers Error]', err?.message || err);
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

    const getOrFetch = async <T>(
      cache: EntityCache<T>,
      fetcher: () => Promise<T>
    ): Promise<T> => {
      if (force || isHardExpired(cache)) {
        return await fetcher();
      }
      if (isSoftExpired(cache)) {
        this.metrics.revalidations++;
        fetcher().catch((e) =>
          console.error('[MySQL SWR Background Revalidate Error]', e)
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

  // --- DATABASE MUTATION METHODS FOR MYSQL ---

  private async syncInventoryDoc(prod: any) {
    try {
      await initializeMySqlTables();
      const totalStock = prod.colors && prod.colors.length > 0
        ? prod.colors.reduce((sum: number, c: any) => sum + (typeof c.stock === 'number' ? c.stock : 0), 0)
        : (prod.sizes ? prod.sizes.reduce((sum: number, s: any) => sum + (s.stock || 0), 0) : 0);

      const invId = `inv-${prod.id}`;
      const updatedAt = new Date().toISOString();

      await executeQuery(
        `INSERT INTO inventory (id, product_id, sku, product_name, category, total_stock, is_out_of_stock, colors, sizes, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           sku=VALUES(sku), product_name=VALUES(product_name), category=VALUES(category),
           total_stock=VALUES(total_stock), is_out_of_stock=VALUES(is_out_of_stock),
           colors=VALUES(colors), sizes=VALUES(sizes), updated_at=VALUES(updated_at);`,
        [
          invId,
          prod.id,
          prod.sku || 'N/A',
          prod.name,
          prod.category || 'General',
          totalStock,
          totalStock <= 0 ? 1 : 0,
          toJSON(prod.colors || []),
          toJSON(prod.sizes || []),
          updatedAt,
        ]
      );
    } catch (e) {
      console.error('[MySQL Inventory Sync Error]', e);
    }
  }

  async getProducts(): Promise<Product[]> {
    const data = await this.getFreshData();
    return data.products;
  }

  async saveProduct(rawProduct: Product): Promise<Product> {
    const product = await sanitizeObjectImages(rawProduct);
    this.invalidateCache('products');

    // Update in-memory product cache immediately for instant response
    if (this.productsCache.data) {
      const idx = this.productsCache.data.findIndex((p) => p.id === product.id);
      if (idx >= 0) {
        this.productsCache.data[idx] = product;
      } else {
        this.productsCache.data.unshift(product);
      }
    } else {
      this.productsCache.data = [product];
    }

    try {
      await initializeMySqlTables();
      await executeQuery(`DELETE FROM products WHERE id = ? OR slug = ?`, [product.id, product.slug]);
      await executeQuery(
        `INSERT INTO products (
          id, slug, name, description, details, fabric_care, category, subcategory,
          collections, price, sale_price, discount_percentage, rating, review_count,
          is_trending, is_new_arrival, is_best_seller, is_sale, is_out_of_stock,
          colors, sizes, sku, reviews, inside_valley_fee, outside_valley_fee, is_free_delivery, seo, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.id,
          product.slug,
          product.name,
          product.description || '',
          toJSON(product.details || []),
          product.fabricCare || '',
          product.category,
          product.subcategory || null,
          toJSON(product.collections || []),
          product.price,
          product.salePrice ?? null,
          product.discountPercentage ?? null,
          product.rating || 4.8,
          product.reviewCount || 0,
          product.isTrending ? 1 : 0,
          product.isNewArrival ? 1 : 0,
          product.isBestSeller ? 1 : 0,
          product.isSale ? 1 : 0,
          product.isOutOfStock ? 1 : 0,
          toJSON(product.colors || []),
          toJSON(product.sizes || []),
          product.sku,
          toJSON(product.reviews || []),
          product.insideValleyFee || 100,
          product.outsideValleyFee || 200,
          product.isFreeDelivery ? 1 : 0,
          toJSON(product.seo || null),
          product.createdAt || new Date().toISOString(),
        ]
      );

      await this.syncInventoryDoc(product);
      await this.syncGalleryDocs(product);
      console.log(`[MySQL] Successfully saved product '${product.name}' (${product.id})`);
    } catch (err: any) {
      console.error(`[MySQL Error] Saving product ${product.id}:`, err?.message || err);
      throw err;
    }
    return product;
  }

  private async syncGalleryDocs(prod: any) {
    try {
      await initializeMySqlTables();
      await executeQuery('DELETE FROM photo_gallery WHERE product_id = ?', [prod.id]);
      if (prod.colors && Array.isArray(prod.colors) && prod.colors.length > 0) {
        let sortOrder = 0;
        for (const c of prod.colors) {
          if (c.images && Array.isArray(c.images) && c.images.length > 0) {
            for (let i = 0; i < c.images.length; i++) {
              const imgUrl = c.images[i];
              sortOrder++;
              const galleryId = `gal-${prod.id}-${sortOrder}`;
              await executeQuery(
                `INSERT INTO photo_gallery (id, product_id, color_name, color_code, image_url, is_main, sort_order)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                   image_url=VALUES(image_url), color_name=VALUES(color_name), color_code=VALUES(color_code);`,
                [galleryId, prod.id, c.name || 'Default', c.code || '#111111', imgUrl, i === 0 && sortOrder === 1 ? 1 : 0, sortOrder]
              );
            }
          }
        }
      }
    } catch (e) {
      console.error('[MySQL Gallery Sync Error]', e);
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    this.invalidateCache('products');
    if (this.productsCache.data) {
      this.productsCache.data = this.productsCache.data.filter((p) => p.id !== id);
    }
    try {
      await initializeMySqlTables();
      await executeQuery('DELETE FROM products WHERE id = ?', [id]);
      await executeQuery('DELETE FROM inventory WHERE product_id = ? OR id = ?', [id, `inv-${id}`]);
      await executeQuery('DELETE FROM photo_gallery WHERE product_id = ?', [id]);
      console.log(`[MySQL] Successfully deleted product ${id}`);
      return true;
    } catch (err: any) {
      console.error(`[MySQL Error] Deleting product ${id}:`, err?.message || err);
      return false;
    }
  }

  async updateInventory(productId: string, size: string, newStock: number): Promise<boolean> {
    this.invalidateCache('products');
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
      console.log(`[MySQL] Updated inventory for product ${productId} size '${size}' to ${cleanStock}`);
      return true;
    } catch (err: any) {
      console.error(`[MySQL Error] Updating inventory for ${productId}:`, err?.message || err);
      return false;
    }
  }

  async updateColorStock(productId: string, colorName: string, newStock: number): Promise<boolean> {
    this.invalidateCache('products');
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

      const totalColorStock = prod.colors ? prod.colors.reduce((acc: number, c: any) => acc + (typeof c.stock === 'number' ? c.stock : 0), 0) : 0;
      prod.sizes = [{ size: 'Free Size', stock: totalColorStock }];
      prod.isOutOfStock = totalColorStock <= 0;

      await this.saveProduct(prod);
      console.log(`[MySQL] Updated color stock for product ${productId} color '${colorName}' to ${cleanStock}`);
      return true;
    } catch (err: any) {
      console.error(`[MySQL Error] Updating color stock for ${productId}:`, err?.message || err);
      return false;
    }
  }

  async saveCategory(rawCategory: Category): Promise<Category> {
    const category = await sanitizeObjectImages(rawCategory);
    this.invalidateCache('categories');

    if (this.categoriesCache.data) {
      const idx = this.categoriesCache.data.findIndex((c) => c.id === category.id || c.slug === category.slug);
      if (idx >= 0) {
        this.categoriesCache.data[idx] = category;
      } else {
        this.categoriesCache.data.unshift(category);
      }
    } else {
      this.categoriesCache.data = [category];
    }

    try {
      await initializeMySqlTables();
      await executeQuery(`DELETE FROM categories WHERE id = ? OR slug = ?`, [category.id, category.slug]);
      await executeQuery(
        `INSERT INTO categories (id, slug, name, description, image, subcategories, seo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          category.id,
          category.slug,
          category.name,
          category.description || '',
          category.image || '',
          toJSON(category.subcategories || []),
          toJSON(category.seo || null),
        ]
      );
      console.log(`[MySQL] Successfully saved category '${category.name}' (${category.id})`);
    } catch (err: any) {
      console.error(`[MySQL Error] Saving category '${category.name}':`, err?.message || err);
    }
    return category;
  }

  async deleteCategory(id: string): Promise<boolean> {
    this.invalidateCache('categories');
    if (this.categoriesCache.data) {
      this.categoriesCache.data = this.categoriesCache.data.filter((c) => c.id !== id && c.slug !== id);
    }
    try {
      await initializeMySqlTables();
      await executeQuery('DELETE FROM categories WHERE id = ? OR slug = ?', [id, id]);
      console.log(`[MySQL] Successfully deleted category ${id}`);
      return true;
    } catch (err: any) {
      console.error(`[MySQL Error] Deleting category ${id}:`, err?.message || err);
      return false;
    }
  }

  async saveCollection(rawCollection: Collection): Promise<Collection> {
    const collection = await sanitizeObjectImages(rawCollection);
    this.invalidateCache('collections');
    try {
      await initializeMySqlTables();
      await executeQuery(`DELETE FROM collections WHERE id = ? OR slug = ?`, [collection.id, collection.slug]);
      await executeQuery(
        `INSERT INTO collections (id, slug, name, description, image, seo)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          collection.id,
          collection.slug,
          collection.name,
          collection.description || '',
          collection.image || '',
          toJSON(collection.seo || null),
        ]
      );
      console.log(`[MySQL] Successfully saved collection '${collection.name}' (${collection.id})`);
    } catch (err: any) {
      console.error(`[MySQL Error] Saving collection '${collection.name}':`, err?.message || err);
    }
    return collection;
  }

  async deleteCollection(id: string): Promise<boolean> {
    this.invalidateCache('collections');
    try {
      await initializeMySqlTables();
      await executeQuery('DELETE FROM collections WHERE id = ? OR slug = ?', [id, id]);
      console.log(`[MySQL] Successfully deleted collection ${id}`);
      return true;
    } catch (err: any) {
      console.error(`[MySQL Error] Deleting collection ${id}:`, err?.message || err);
      return false;
    }
  }

  async saveCoupon(coupon: Coupon): Promise<Coupon> {
    this.invalidateCache('coupons');
    const cleanCode = coupon.code.trim().toUpperCase();
    const cleanCoupon = { ...coupon, code: cleanCode };
    try {
      await initializeMySqlTables();
      await executeQuery(
        `INSERT INTO coupons (code, discount_type, discount_value, min_order_value, max_discount, expiry_date, active)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           discount_type=VALUES(discount_type), discount_value=VALUES(discount_value),
           min_order_value=VALUES(min_order_value), max_discount=VALUES(max_discount),
           expiry_date=VALUES(expiry_date), active=VALUES(active);`,
        [
          cleanCode,
          cleanCoupon.discountType,
          cleanCoupon.discountValue,
          cleanCoupon.minOrderValue || 0,
          cleanCoupon.maxDiscount ?? null,
          cleanCoupon.expiryDate || null,
          cleanCoupon.active ? 1 : 0,
        ]
      );
      console.log(`[MySQL] Successfully saved coupon ${cleanCode}`);
    } catch (err: any) {
      console.error(`[MySQL Error] Saving coupon ${cleanCode}:`, err?.message || err);
    }
    return cleanCoupon;
  }

  async deleteCoupon(code: string): Promise<boolean> {
    this.invalidateCache('coupons');
    const cleanCode = code.trim().toUpperCase();
    try {
      await initializeMySqlTables();
      await executeQuery('DELETE FROM coupons WHERE code = ?', [cleanCode]);
      console.log(`[MySQL] Successfully deleted coupon ${cleanCode}`);
      return true;
    } catch (err: any) {
      console.error(`[MySQL Error] Deleting coupon ${cleanCode}:`, err?.message || err);
      return false;
    }
  }

  async saveUser(user: CustomerUser): Promise<CustomerUser> {
    this.invalidateCache('users');
    try {
      await initializeMySqlTables();
      await executeQuery(
        `INSERT INTO users (id, name, email, mobile, password, role, registration_date, is_blocked, addresses)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name=VALUES(name), email=VALUES(email), mobile=VALUES(mobile),
           role=VALUES(role), registration_date=VALUES(registration_date),
           is_blocked=VALUES(is_blocked), addresses=VALUES(addresses);`,
        [
          user.id,
          user.name,
          user.email,
          user.mobile || null,
          (user as any).password || null,
          user.role || 'CUSTOMER',
          user.registrationDate || new Date().toISOString(),
          user.isBlocked ? 1 : 0,
          toJSON(user.addresses || []),
        ]
      );
      console.log(`[MySQL] Successfully saved user ${user.email}`);
    } catch (err: any) {
      console.error(`[MySQL Error] Saving user ${user.email}:`, err?.message || err);
    }
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    this.invalidateCache('users');
    try {
      await initializeMySqlTables();
      await executeQuery('DELETE FROM users WHERE id = ? OR email = ?', [id, id]);
      console.log(`[MySQL] Successfully deleted user ${id}`);
      return true;
    } catch (err: any) {
      console.error(`[MySQL Error] Deleting user ${id}:`, err?.message || err);
      return false;
    }
  }

  async deleteOrder(id: string): Promise<boolean> {
    this.invalidateCache('orders');
    try {
      await initializeMySqlTables();
      await executeQuery('DELETE FROM orders WHERE id = ? OR order_number = ?', [id, id]);
      console.log(`[MySQL] Successfully deleted order ${id}`);
      return true;
    } catch (err: any) {
      console.error(`[MySQL Error] Deleting order ${id}:`, err?.message || err);
      return false;
    }
  }

  async deleteReview(productId: string, reviewId: string): Promise<boolean> {
    this.invalidateCache('products');
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
          console.log(`[MySQL] Deleted review ${reviewId} from product ${prod.id}`);
          return true;
        }
      }
      return false;
    } catch (err: any) {
      console.error(`[MySQL Error] Deleting review ${reviewId}:`, err?.message || err);
      return false;
    }
  }

  async updateDeliveryRates(rates: DistrictDeliveryRate[]): Promise<DistrictDeliveryRate[]> {
    this.invalidateCache('deliveryRates');
    this.invalidateCache('cms');
    try {
      await initializeMySqlTables();
      for (const r of rates) {
        await executeQuery(
          `INSERT INTO delivery_rates (
            district, province, delivery_fee, enabled, home_delivery_fee, branch_delivery_fee, home_delivery_enabled, branch_delivery_enabled
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            province=VALUES(province), delivery_fee=VALUES(delivery_fee), enabled=VALUES(enabled),
            home_delivery_fee=VALUES(home_delivery_fee), branch_delivery_fee=VALUES(branch_delivery_fee),
            home_delivery_enabled=VALUES(home_delivery_enabled), branch_delivery_enabled=VALUES(branch_delivery_enabled);`,
          [
            r.district,
            r.province,
            r.deliveryFee,
            r.enabled ? 1 : 0,
            r.homeDeliveryFee ?? r.deliveryFee,
            r.branchDeliveryFee ?? r.deliveryFee,
            r.homeDeliveryEnabled ? 1 : 0,
            r.branchDeliveryEnabled ? 1 : 0,
          ]
        );
      }
      console.log(`[MySQL] Successfully updated ${rates.length} delivery rates`);
      return rates;
    } catch (err: any) {
      console.error('[MySQL Error] Updating delivery rates:', err?.message || err);
      return rates;
    }
  }

  async updateCMS(rawCms: Partial<HomepageCMS>): Promise<HomepageCMS> {
    const newCms = await sanitizeObjectImages(rawCms);
    this.invalidateCache('cms');
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

      await executeQuery(`DELETE FROM cms WHERE key = ?`, ['homepage']);
      await executeQuery(
        `INSERT INTO cms (key, announcement_bar, hero, editorial_banner, instagram_images, fonepay_settings, delivery_rates, seo)
         VALUES ('homepage', ?, ?, ?, ?, ?, ?, ?)`,
        [
          toJSON(updated.announcementBar),
          toJSON(updated.hero),
          toJSON(updated.editorialBanner),
          toJSON(updated.instagramImages),
          toJSON(updated.fonepaySettings),
          toJSON(updated.deliveryRates),
          toJSON(updated.seo),
        ]
      );

      console.log(`[MySQL] Successfully updated CMS`);
      return updated;
    } catch (err: any) {
      console.error('[MySQL Error] Updating CMS:', err?.message || err);
      return { ...initialCMS, ...newCms };
    }
  }

  async createOrder(order: Order): Promise<Order> {
    this.invalidateCache('orders');
    try {
      await initializeMySqlTables();
      await executeQuery(`DELETE FROM orders WHERE id = ? OR order_number = ?`, [order.id, order.orderNumber]);
      await executeQuery(
        `INSERT INTO orders (
          id, order_number, created_at, items, subtotal, discount, shipping, total,
          payment_method, payment_status, order_status, customer_name, customer_email,
          customer_mobile, shipping_address, estimated_delivery, tracking_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.id,
          order.orderNumber,
          order.createdAt || new Date().toISOString(),
          toJSON(order.items || []),
          order.subtotal,
          order.discount || 0,
          order.shipping || 0,
          order.total,
          order.paymentMethod,
          order.paymentStatus || 'pending',
          order.orderStatus || 'Pending',
          order.customerName,
          order.customerEmail,
          order.customerMobile,
          toJSON(order.shippingAddress || null),
          order.estimatedDelivery || null,
          order.trackingNumber || null,
        ]
      );
      console.log(`[MySQL] Successfully created order ${order.orderNumber}`);
    } catch (err: any) {
      console.error(`[MySQL Error] Creating order ${order.orderNumber}:`, err?.message || err);
    }
    return order;
  }

  async updateOrderStatus(orderId: string, status: Order['orderStatus']): Promise<Order | undefined> {
    this.invalidateCache('orders');
    try {
      await initializeMySqlTables();
      await executeQuery(
        'UPDATE orders SET order_status = ? WHERE id = ? OR order_number = ?',
        [status, orderId, orderId]
      );
      console.log(`[MySQL] Updated order status for ${orderId} to ${status}`);
      const orders = await this.fetchOrders();
      return orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    } catch (err: any) {
      console.error(`[MySQL Error] Updating order status for ${orderId}:`, err?.message || err);
    }
    return undefined;
  }

  async syncFullData(fullData: Partial<DatabaseSchema>): Promise<DatabaseSchema> {
    this.invalidateCache('all');
    try {
      await initializeMySqlTables();
      if (fullData.products && Array.isArray(fullData.products)) {
        for (const p of fullData.products) await this.saveProduct(p);
      }
      if (fullData.categories && Array.isArray(fullData.categories)) {
        for (const c of fullData.categories) await this.saveCategory(c);
      }
      if (fullData.collections && Array.isArray(fullData.collections)) {
        for (const col of fullData.collections) await this.saveCollection(col);
      }
      if (fullData.cms) {
        await this.updateCMS(fullData.cms);
      }
      if (fullData.orders && Array.isArray(fullData.orders)) {
        for (const o of fullData.orders) await this.createOrder(o);
      }
      if (fullData.coupons && Array.isArray(fullData.coupons)) {
        for (const cp of fullData.coupons) await this.saveCoupon(cp);
      }
      if (fullData.users && Array.isArray(fullData.users)) {
        for (const u of fullData.users) await this.saveUser(u);
      }
    } catch (err: any) {
      console.error('[MySQL Error] Syncing full data:', err?.message || err);
    }
    return this.getFreshData(true);
  }
}

const globalServerStore = (globalThis as any).__aceServerStore || new ServerDataStore();
if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).__aceServerStore = globalServerStore;
}

export const serverDb = globalServerStore as ServerDataStore;
