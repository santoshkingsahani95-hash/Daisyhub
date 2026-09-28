import {
  Product,
  Category,
  Collection,
  Order,
  Coupon,
  HomepageCMS,
  CustomerUser,
  DistrictDeliveryRate,
} from '@/types';
import {
  productService,
  categoryService,
  orderService,
  collectionService,
  couponService,
  cmsService,
  userService,
} from '@/server/services';

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

class ServerDataStore {
  private metrics = {
    totalQueries: 0,
    hits: 0,
    misses: 0,
    revalidations: 0,
    lastWarmedAt: 0,
  };

  public invalidateCache(entity?: string) {
    if (!entity || entity === 'all') {
      productService.invalidateCache();
      categoryService.invalidateCache();
      collectionService.invalidateCache();
      orderService.invalidateCache();
      couponService.invalidateCache();
      userService.invalidateCache();
      cmsService.invalidateCache();
    } else {
      switch (entity) {
        case 'products':
          productService.invalidateCache();
          break;
        case 'categories':
          categoryService.invalidateCache();
          break;
        case 'collections':
          collectionService.invalidateCache();
          break;
        case 'cms':
        case 'deliveryRates':
          cmsService.invalidateCache();
          break;
        case 'orders':
          orderService.invalidateCache();
          break;
        case 'coupons':
          couponService.invalidateCache();
          break;
        case 'users':
          userService.invalidateCache();
          break;
      }
    }
  }

  // --- Product Domain Operations ---
  public async fetchProducts(): Promise<Product[]> {
    return productService.fetchProducts();
  }

  public async getProducts(): Promise<Product[]> {
    return productService.fetchProducts();
  }

  public async getProductById(id: string): Promise<Product | undefined> {
    return productService.getProductById(id);
  }

  public async getProductBySlug(slug: string): Promise<Product | undefined> {
    return productService.getProductBySlug(slug);
  }

  public async saveProduct(product: Product): Promise<Product> {
    return productService.saveProduct(product);
  }

  public async deleteProduct(id: string): Promise<boolean> {
    return productService.deleteProduct(id);
  }

  public async updateInventory(productId: string, size: string, newStock: number): Promise<boolean> {
    return productService.updateInventory(productId, size, newStock);
  }

  public async updateColorStock(productId: string, colorName: string, newStock: number): Promise<boolean> {
    return productService.updateColorStock(productId, colorName, newStock);
  }

  public async deleteReview(productId: string, reviewId: string): Promise<boolean> {
    return productService.deleteReview(productId, reviewId);
  }

  // --- Category Domain Operations ---
  public async fetchCategories(): Promise<Category[]> {
    return categoryService.fetchCategories();
  }

  public async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    return categoryService.getCategoryBySlug(slug);
  }

  public async getCategoryById(id: string): Promise<Category | undefined> {
    return categoryService.getCategoryById(id);
  }

  public async saveCategory(category: Category): Promise<Category> {
    return categoryService.saveCategory(category);
  }

  public async deleteCategory(id: string): Promise<boolean> {
    return categoryService.deleteCategory(id);
  }

  // --- Collection Domain Operations ---
  public async fetchCollections(): Promise<Collection[]> {
    return collectionService.fetchCollections();
  }

  public async saveCollection(collection: Collection): Promise<Collection> {
    return collectionService.saveCollection(collection);
  }

  public async deleteCollection(id: string): Promise<boolean> {
    return collectionService.deleteCollection(id);
  }

  // --- Order Domain Operations ---
  public async fetchOrders(): Promise<Order[]> {
    return orderService.fetchOrders();
  }

  public async createOrder(order: Order): Promise<Order> {
    return orderService.createOrder(order);
  }

  public async updateOrderStatus(orderId: string, status: Order['orderStatus']): Promise<Order | undefined> {
    return orderService.updateOrderStatus(orderId, status);
  }

  public async deleteOrder(id: string): Promise<boolean> {
    return orderService.deleteOrder(id);
  }

  // --- Coupon Domain Operations ---
  public async fetchCoupons(): Promise<Coupon[]> {
    return couponService.fetchCoupons();
  }

  public async saveCoupon(coupon: Coupon): Promise<Coupon> {
    return couponService.saveCoupon(coupon);
  }

  public async deleteCoupon(code: string): Promise<boolean> {
    return couponService.deleteCoupon(code);
  }

  // --- User Domain Operations ---
  public async fetchUsers(): Promise<CustomerUser[]> {
    return userService.fetchUsers();
  }

  public async saveUser(user: CustomerUser): Promise<CustomerUser> {
    return userService.saveUser(user);
  }

  public async deleteUser(id: string): Promise<boolean> {
    return userService.deleteUser(id);
  }

  // --- CMS & Delivery Operations ---
  public async fetchDeliveryRates(): Promise<DistrictDeliveryRate[]> {
    return cmsService.fetchDeliveryRates();
  }

  public async updateDeliveryRates(rates: DistrictDeliveryRate[]): Promise<DistrictDeliveryRate[]> {
    return cmsService.updateDeliveryRates(rates);
  }

  public async fetchCMS(rates?: DistrictDeliveryRate[]): Promise<HomepageCMS> {
    return cmsService.fetchCMS(rates);
  }

  public async updateCMS(cms: Partial<HomepageCMS>): Promise<HomepageCMS> {
    return cmsService.updateCMS(cms);
  }

  // --- Aggregate Operations ---
  public async getFreshData(force = false): Promise<DatabaseSchema> {
    this.metrics.totalQueries++;
    if (force) {
      this.invalidateCache();
    }

    const [products, categories, collections, deliveryRates, orders, coupons, users] =
      await Promise.all([
        productService.fetchProducts(),
        categoryService.fetchCategories(),
        collectionService.fetchCollections(),
        cmsService.fetchDeliveryRates(),
        orderService.fetchOrders(),
        couponService.fetchCoupons(),
        userService.fetchUsers(),
      ]);

    const cms = await cmsService.fetchCMS(deliveryRates);
    this.metrics.lastWarmedAt = Date.now();
    this.metrics.hits++;

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

  public async syncFullData(fullData: Partial<DatabaseSchema>): Promise<DatabaseSchema> {
    this.invalidateCache();
    if (fullData.products && Array.isArray(fullData.products)) {
      for (const p of fullData.products) await productService.saveProduct(p);
    }
    if (fullData.categories && Array.isArray(fullData.categories)) {
      for (const c of fullData.categories) await categoryService.saveCategory(c);
    }
    if (fullData.collections && Array.isArray(fullData.collections)) {
      for (const col of fullData.collections) await collectionService.saveCollection(col);
    }
    if (fullData.cms) {
      await cmsService.updateCMS(fullData.cms);
    }
    if (fullData.orders && Array.isArray(fullData.orders)) {
      for (const o of fullData.orders) await orderService.createOrder(o);
    }
    if (fullData.coupons && Array.isArray(fullData.coupons)) {
      for (const cp of fullData.coupons) await couponService.saveCoupon(cp);
    }
    if (fullData.users && Array.isArray(fullData.users)) {
      for (const u of fullData.users) await userService.saveUser(u);
    }
    return this.getFreshData(true);
  }

  public getCacheStats(): CacheTelemetry {
    const now = Date.now();
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
          itemCount: 0,
          fetchedAt: now,
          ageSeconds: 0,
          status: 'HOT',
          ttlMs: 45000,
        },
        categories: {
          itemCount: 0,
          fetchedAt: now,
          ageSeconds: 0,
          status: 'HOT',
          ttlMs: 60000,
        },
        collections: {
          itemCount: 0,
          fetchedAt: now,
          ageSeconds: 0,
          status: 'HOT',
          ttlMs: 60000,
        },
        cms: {
          itemCount: 1,
          fetchedAt: now,
          ageSeconds: 0,
          status: 'HOT',
          ttlMs: 45000,
        },
        orders: {
          itemCount: 0,
          fetchedAt: now,
          ageSeconds: 0,
          status: 'HOT',
          ttlMs: 15000,
        },
        coupons: {
          itemCount: 0,
          fetchedAt: now,
          ageSeconds: 0,
          status: 'HOT',
          ttlMs: 30000,
        },
        users: {
          itemCount: 0,
          fetchedAt: now,
          ageSeconds: 0,
          status: 'HOT',
          ttlMs: 30000,
        },
        deliveryRates: {
          itemCount: 0,
          fetchedAt: now,
          ageSeconds: 0,
          status: 'HOT',
          ttlMs: 60000,
        },
      },
    };
  }
}

const globalServerStore = (globalThis as any).__aceServerStore || new ServerDataStore();
if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).__aceServerStore = globalServerStore;
}

export const serverDb = globalServerStore as ServerDataStore;
