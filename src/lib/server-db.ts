import fs from 'fs';
import path from 'path';
import { Product, Category, Collection, Order, Coupon, HomepageCMS, CustomerUser } from '@/types';
import { seedProducts, initialCategories, initialCollections, initialCMS } from './seed-data';
import { connectToDatabase } from './mongodb';
import {
  ProductModel,
  CategoryModel,
  CollectionModel,
  OrderModel,
  CouponModel,
  CMSModel,
  UserModel,
} from '@/models';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DatabaseSchema {
  products: Product[];
  categories: Category[];
  collections: Collection[];
  cms: HomepageCMS;
  orders: Order[];
  coupons: Coupon[];
  users: CustomerUser[];
  version: number;
}

class ServerDataStore {
  private data: DatabaseSchema = {
    products: [...seedProducts],
    categories: [...initialCategories],
    collections: [...initialCollections],
    cms: { ...initialCMS },
    orders: [],

    coupons: [
      {
        code: 'WELCOME10',
        discountType: 'percentage',
        discountValue: 10,
        minOrderValue: 1500,
        maxDiscount: 500,
        expiryDate: '2026-12-31',
        active: true,
      },
      {
        code: 'ACE500',
        discountType: 'fixed',
        discountValue: 500,
        minOrderValue: 3000,
        expiryDate: '2026-12-31',
        active: true,
      },
    ],
    users: [
      {
        id: 'usr-admin-1',
        name: 'Admin Manager',
        email: 'admin@daisyhub.com',
        mobile: '+977 9800000000',
        role: 'ADMIN',
        registrationDate: '2026-01-01',
      },
    ],
    version: Date.now(),
  };

  private isLoaded = false;
  private isMongoConnected = false;

  constructor() {
    this.loadFromDisk();
    this.initMongoDB();
  }

  private async initMongoDB() {
    try {
      const dbConn = await connectToDatabase();
      if (!dbConn) return;

      this.isMongoConnected = true;

      // Seed & Load Products
      const prodCount = await ProductModel.countDocuments();
      if (prodCount === 0) {
        console.log('[MongoDB Seeding] Populating products collection...');
        await ProductModel.insertMany(this.data.products);
      } else {
        const dbProds = await ProductModel.find().lean();
        this.data.products = dbProds.map((p: any) => {
          const { _id, __v, ...rest } = p;
          return rest as Product;
        });
      }

      // Seed & Load Categories
      const catCount = await CategoryModel.countDocuments();
      if (catCount === 0) {
        console.log('[MongoDB Seeding] Populating categories collection...');
        await CategoryModel.insertMany(this.data.categories);
      } else {
        const dbCats = await CategoryModel.find().lean();
        this.data.categories = dbCats.map((c: any) => {
          const { _id, __v, ...rest } = c;
          return rest as Category;
        });
      }

      // Seed & Load Collections
      const colCount = await CollectionModel.countDocuments();
      if (colCount === 0) {
        await CollectionModel.insertMany(this.data.collections);
      }

      // Seed & Load CMS
      const cmsDoc = await CMSModel.findOne({ key: 'homepage' }).lean();
      if (!cmsDoc) {
        await CMSModel.create({ key: 'homepage', ...this.data.cms });
      } else {
        const { _id, __v, key, ...rest } = cmsDoc as any;
        this.data.cms = { ...this.data.cms, ...rest };
      }

      // Seed & Load Orders
      const ordCount = await OrderModel.countDocuments();
      if (ordCount === 0) {
        await OrderModel.insertMany(this.data.orders);
      } else {
        const dbOrds = await OrderModel.find().lean();
        this.data.orders = dbOrds.map((o: any) => {
          const { _id, __v, ...rest } = o;
          return rest as Order;
        });
      }

      // Seed & Load Coupons
      const coupCount = await CouponModel.countDocuments();
      if (coupCount === 0) {
        await CouponModel.insertMany(this.data.coupons);
      } else {
        const dbCoups = await CouponModel.find().lean();
        this.data.coupons = dbCoups.map((cp: any) => {
          const { _id, __v, ...rest } = cp;
          return rest as Coupon;
        });
      }

      this.saveToDisk();
      console.log('🎉 [MongoDB Atlas Sync] Fully initialized and synchronized database collections!');
    } catch (err) {
      console.error('[ServerDataStore MongoDB Init Error]', err);
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.products)) {
            this.data = {
              ...this.data,
              ...parsed,
            };
          }
        }
      } else {
        this.saveToDisk();
      }
    } catch (e) {
      console.error('[ServerDataStore] Error loading db from disk:', e);
    }
    this.isLoaded = true;
  }

  private saveToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      this.data.version = Date.now();
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[ServerDataStore] Error saving db to disk:', e);
    }
  }

  getData(): DatabaseSchema {
    if (!this.isLoaded) this.loadFromDisk();
    return this.data;
  }

  getProducts(): Product[] {
    return this.getData().products;
  }

  saveProduct(product: Product): Product {
    const data = this.getData();
    const existingIdx = data.products.findIndex((p) => p.id === product.id);
    if (existingIdx >= 0) {
      data.products[existingIdx] = product;
    } else {
      data.products.unshift(product);
    }
    this.saveToDisk();

    // MongoDB Sync
    ProductModel.findOneAndUpdate({ id: product.id }, product, { upsert: true, new: true }).catch(() => {});

    return product;
  }

  deleteProduct(id: string): boolean {
    const data = this.getData();
    const initialLen = data.products.length;
    data.products = data.products.filter((p) => p.id !== id);
    if (data.products.length < initialLen) {
      this.saveToDisk();
      ProductModel.deleteOne({ id }).catch(() => {});
      return true;
    }
    return false;
  }

  updateInventory(productId: string, size: string, newStock: number): boolean {
    const data = this.getData();
    const prod = data.products.find((p) => p.id === productId);
    if (!prod) return false;
    const cleanStock = isNaN(Number(newStock)) ? 0 : Math.max(0, Math.min(999, Math.floor(Number(newStock))));

    if (prod.sizes && prod.sizes.length > 0) {
      const existingSize = prod.sizes.find((s) => s.size === size);
      if (existingSize) {
        existingSize.stock = cleanStock;
      } else {
        prod.sizes = prod.sizes.map((s) => ({ ...s, stock: cleanStock }));
      }
    } else {
      prod.sizes = [{ size: size || 'Free Size', stock: cleanStock }];
    }

    if (prod.colors) {
      prod.colors.forEach((c) => (c.stock = cleanStock));
    }

    const totalSizeStock = prod.sizes.reduce((sum, s) => sum + (s.stock || 0), 0);
    prod.isOutOfStock = totalSizeStock <= 0;

    this.saveToDisk();

    // MongoDB Sync
    ProductModel.findOneAndUpdate({ id: productId }, prod, { upsert: true }).catch(() => {});

    return true;
  }

  updateColorStock(productId: string, colorName: string, newStock: number): boolean {
    const data = this.getData();
    const prod = data.products.find((p) => p.id === productId);
    if (!prod) return false;
    const cleanStock = isNaN(Number(newStock)) ? 0 : Math.max(0, Math.min(999, Math.floor(Number(newStock))));

    const targetColor = prod.colors.find((c) => c.name.toLowerCase() === colorName.toLowerCase());
    if (targetColor) {
      targetColor.stock = cleanStock;
    } else if (prod.colors.length > 0) {
      prod.colors[0].stock = cleanStock;
    }

    const totalColorStock = prod.colors.reduce((acc, c) => acc + (c.stock !== undefined ? c.stock : 0), 0);
    prod.sizes = [{ size: 'Free Size', stock: totalColorStock }];
    prod.isOutOfStock = totalColorStock <= 0;

    this.saveToDisk();

    // MongoDB Sync
    ProductModel.findOneAndUpdate({ id: productId }, prod, { upsert: true }).catch(() => {});

    return true;
  }

  saveCategory(category: Category): Category {
    const data = this.getData();
    const existingIndex = data.categories.findIndex((c) => c.id === category.id || c.slug === category.slug);
    if (existingIndex >= 0) {
      data.categories[existingIndex] = category;
    } else {
      data.categories.push(category);
    }
    this.saveToDisk();

    // MongoDB Sync
    CategoryModel.findOneAndUpdate({ id: category.id }, category, { upsert: true }).catch(() => {});

    return category;
  }

  deleteCategory(id: string): boolean {
    const data = this.getData();
    const initialLen = data.categories.length;
    data.categories = data.categories.filter((c) => c.id !== id && c.slug !== id);
    if (data.categories.length < initialLen) {
      this.saveToDisk();
      CategoryModel.deleteOne({ id }).catch(() => {});
      return true;
    }
    return false;
  }

  deleteCollection(id: string): boolean {
    const data = this.getData();
    const initialLen = data.collections.length;
    data.collections = data.collections.filter((c) => c.id !== id && c.slug !== id);
    if (data.collections.length < initialLen) {
      this.saveToDisk();
      CollectionModel.deleteOne({ id }).catch(() => {});
      return true;
    }
    return false;
  }

  deleteCoupon(code: string): boolean {
    const data = this.getData();
    const cleanCode = code.trim().toUpperCase();
    const initialLen = data.coupons.length;
    data.coupons = data.coupons.filter((c) => c.code.trim().toUpperCase() !== cleanCode);
    if (data.coupons.length < initialLen) {
      this.saveToDisk();
      CouponModel.deleteOne({ code: cleanCode }).catch(() => {});
      return true;
    }
    return false;
  }

  deleteOrder(id: string): boolean {
    const data = this.getData();
    const initialLen = data.orders.length;
    data.orders = data.orders.filter((o) => o.id !== id && o.orderNumber !== id);
    if (data.orders.length < initialLen) {
      this.saveToDisk();
      OrderModel.deleteOne({ $or: [{ id }, { orderNumber: id }] }).catch(() => {});
      return true;
    }
    return false;
  }

  deleteReview(productId: string, reviewId: string): boolean {
    const data = this.getData();
    const prod = data.products.find((p) => p.id === productId || p.slug === productId);
    if (prod && prod.reviews) {
      const initialLen = prod.reviews.length;
      prod.reviews = prod.reviews.filter((r) => r.id !== reviewId);
      if (prod.reviews.length < initialLen) {
        prod.reviewCount = prod.reviews.length;
        if (prod.reviewCount > 0) {
          prod.rating = Number(
            (prod.reviews.reduce((sum, r) => sum + r.rating, 0) / prod.reviewCount).toFixed(1)
          );
        } else {
          prod.rating = 5.0;
        }
        this.saveToDisk();
        ProductModel.findOneAndUpdate({ id: prod.id }, prod, { upsert: true }).catch(() => {});
        return true;
      }
    }
    return false;
  }

  updateCMS(newCms: Partial<HomepageCMS>): HomepageCMS {
    const data = this.getData();
    data.cms = { ...data.cms, ...newCms };
    this.saveToDisk();

    // MongoDB Sync
    CMSModel.findOneAndUpdate({ key: 'homepage' }, data.cms, { upsert: true }).catch(() => {});

    return data.cms;
  }

  createOrder(order: Order): Order {
    const data = this.getData();
    data.orders.unshift(order);
    this.saveToDisk();

    // MongoDB Sync
    OrderModel.findOneAndUpdate({ id: order.id }, order, { upsert: true }).catch(() => {});

    return order;
  }

  updateOrderStatus(orderId: string, status: Order['orderStatus']): Order | undefined {
    const data = this.getData();
    const ord = data.orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (ord) {
      ord.orderStatus = status;
      this.saveToDisk();

      // MongoDB Sync
      OrderModel.findOneAndUpdate({ id: ord.id }, { orderStatus: status }).catch(() => {});
    }
    return ord;
  }

  syncFullData(fullData: Partial<DatabaseSchema>): DatabaseSchema {
    if (fullData.products && Array.isArray(fullData.products)) {
      this.data.products = fullData.products;
    }
    if (fullData.categories && Array.isArray(fullData.categories)) {
      this.data.categories = fullData.categories;
    }
    if (fullData.cms) {
      this.data.cms = fullData.cms;
    }
    if (fullData.orders && Array.isArray(fullData.orders)) {
      this.data.orders = fullData.orders;
    }
    if (fullData.coupons && Array.isArray(fullData.coupons)) {
      this.data.coupons = fullData.coupons;
    }
    this.saveToDisk();
    return this.data;
  }
}

const globalServerStore = (globalThis as any).__aceServerStore || new ServerDataStore();
if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).__aceServerStore = globalServerStore;
}

export const serverDb = globalServerStore as ServerDataStore;
