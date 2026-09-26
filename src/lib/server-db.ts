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
    products: [],
    categories: [],
    collections: [],
    cms: { ...initialCMS },
    orders: [],
    coupons: [],
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

  constructor() {
    this.loadFromDisk();
    this.initMongoDB();
  }

  public async initMongoDB() {
    await this.getFreshData();
  }

  public async getFreshData(): Promise<DatabaseSchema> {
    if (!this.isLoaded) this.loadFromDisk();
    try {
      const dbConn = await connectToDatabase();
      if (dbConn) {
        const [dbProds, dbCats, dbCols, cmsDoc, dbOrds, dbCoups, dbUsers] = await Promise.all([
          ProductModel.find().lean(),
          CategoryModel.find().lean(),
          CollectionModel.find().lean(),
          CMSModel.findOne({ key: 'homepage' }).lean(),
          OrderModel.find().lean(),
          CouponModel.find().lean(),
          UserModel.find().lean(),
        ]);

        this.data.products = dbProds.map((p: any) => {
          const { _id, __v, ...rest } = p;
          return rest as Product;
        });

        this.data.categories = dbCats.map((c: any) => {
          const { _id, __v, ...rest } = c;
          return rest as Category;
        });

        this.data.collections = dbCols.map((c: any) => {
          const { _id, __v, ...rest } = c;
          return rest as Collection;
        });

        if (cmsDoc) {
          const { _id, __v, key, ...rest } = cmsDoc as any;
          this.data.cms = { ...this.data.cms, ...rest };
        }

        this.data.orders = dbOrds.map((o: any) => {
          const { _id, __v, ...rest } = o;
          return rest as Order;
        });

        this.data.coupons = dbCoups.map((cp: any) => {
          const { _id, __v, ...rest } = cp;
          return rest as Coupon;
        });

        if (dbUsers && dbUsers.length > 0) {
          this.data.users = dbUsers.map((u: any) => {
            const { _id, __v, ...rest } = u;
            return rest as CustomerUser;
          });
        }

        this.saveToDisk();
      }
    } catch (err) {
      console.error('[ServerDataStore getFreshData Error]', err);
    }
    return this.data;
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

  async saveProduct(product: Product): Promise<Product> {
    const data = this.getData();
    const existingIdx = data.products.findIndex((p) => p.id === product.id);
    if (existingIdx >= 0) {
      data.products[existingIdx] = product;
    } else {
      data.products.unshift(product);
    }
    this.saveToDisk();

    try {
      await connectToDatabase();
      await ProductModel.findOneAndUpdate({ id: product.id }, product, { upsert: true, new: true });
      console.log(`[MongoDB] Successfully saved product '${product.name}' (${product.id}) to MongoDB Atlas`);
    } catch (err) {
      console.error(`[MongoDB] Error saving product ${product.id}:`, err);
    }

    return product;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const data = this.getData();
    const initialLen = data.products.length;
    data.products = data.products.filter((p) => p.id !== id);
    this.saveToDisk();

    try {
      await connectToDatabase();
      await ProductModel.deleteOne({ id });
      console.log(`[MongoDB] Successfully deleted product ${id} from MongoDB Atlas`);
    } catch (err) {
      console.error(`[MongoDB] Error deleting product ${id}:`, err);
    }

    return data.products.length < initialLen;
  }

  async updateInventory(productId: string, size: string, newStock: number): Promise<boolean> {
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

    try {
      await connectToDatabase();
      await ProductModel.findOneAndUpdate({ id: productId }, prod, { upsert: true });
    } catch (err) {
      console.error(`[MongoDB] Error updating inventory for ${productId}:`, err);
    }

    return true;
  }

  async updateColorStock(productId: string, colorName: string, newStock: number): Promise<boolean> {
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

    try {
      await connectToDatabase();
      await ProductModel.findOneAndUpdate({ id: productId }, prod, { upsert: true });
    } catch (err) {
      console.error(`[MongoDB] Error updating color stock for ${productId}:`, err);
    }

    return true;
  }

  async saveCategory(category: Category): Promise<Category> {
    const data = this.getData();
    const existingIndex = data.categories.findIndex((c) => c.id === category.id || c.slug === category.slug);
    if (existingIndex >= 0) {
      data.categories[existingIndex] = category;
    } else {
      data.categories.push(category);
    }
    this.saveToDisk();

    try {
      await connectToDatabase();
      await CategoryModel.findOneAndUpdate({ id: category.id }, category, { upsert: true, new: true });
      console.log(`[MongoDB] Successfully saved category '${category.name}' (${category.id}) to MongoDB Atlas!`);
    } catch (err) {
      console.error(`[MongoDB] Error saving category '${category.name}':`, err);
    }

    return category;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const data = this.getData();
    const initialLen = data.categories.length;
    data.categories = data.categories.filter((c) => c.id !== id && c.slug !== id);
    this.saveToDisk();

    try {
      await connectToDatabase();
      await CategoryModel.deleteOne({ $or: [{ id }, { slug: id }] });
      console.log(`[MongoDB] Successfully deleted category ${id} from MongoDB Atlas!`);
    } catch (err) {
      console.error(`[MongoDB] Error deleting category ${id}:`, err);
    }

    return data.categories.length < initialLen;
  }

  async saveCollection(collection: Collection): Promise<Collection> {
    const data = this.getData();
    const existingIndex = data.collections.findIndex((c) => c.id === collection.id || c.slug === collection.slug);
    if (existingIndex >= 0) {
      data.collections[existingIndex] = collection;
    } else {
      data.collections.push(collection);
    }
    this.saveToDisk();

    try {
      await connectToDatabase();
      await CollectionModel.findOneAndUpdate({ id: collection.id }, collection, { upsert: true, new: true });
      console.log(`[MongoDB] Successfully saved collection '${collection.name}' (${collection.id}) to MongoDB Atlas!`);
    } catch (err) {
      console.error(`[MongoDB] Error saving collection '${collection.name}':`, err);
    }

    return collection;
  }

  async deleteCollection(id: string): Promise<boolean> {
    const data = this.getData();
    const initialLen = data.collections.length;
    data.collections = data.collections.filter((c) => c.id !== id && c.slug !== id);
    this.saveToDisk();

    try {
      await connectToDatabase();
      await CollectionModel.deleteOne({ $or: [{ id }, { slug: id }] });
      console.log(`[MongoDB] Successfully deleted collection ${id} from MongoDB Atlas!`);
    } catch (err) {
      console.error(`[MongoDB] Error deleting collection ${id}:`, err);
    }

    return data.collections.length < initialLen;
  }

  async saveCoupon(coupon: Coupon): Promise<Coupon> {
    const data = this.getData();
    const cleanCode = coupon.code.trim().toUpperCase();
    const cleanCoupon = { ...coupon, code: cleanCode };
    const existingIndex = data.coupons.findIndex((c) => c.code.trim().toUpperCase() === cleanCode);
    if (existingIndex >= 0) {
      data.coupons[existingIndex] = cleanCoupon;
    } else {
      data.coupons.push(cleanCoupon);
    }
    this.saveToDisk();

    try {
      await connectToDatabase();
      await CouponModel.findOneAndUpdate({ code: cleanCode }, cleanCoupon, { upsert: true, new: true });
      console.log(`[MongoDB] Successfully saved coupon ${cleanCode} to MongoDB Atlas!`);
    } catch (err) {
      console.error(`[MongoDB] Error saving coupon ${cleanCode}:`, err);
    }

    return cleanCoupon;
  }

  async deleteCoupon(code: string): Promise<boolean> {
    const data = this.getData();
    const cleanCode = code.trim().toUpperCase();
    const initialLen = data.coupons.length;
    data.coupons = data.coupons.filter((c) => c.code.trim().toUpperCase() !== cleanCode);
    this.saveToDisk();

    try {
      await connectToDatabase();
      await CouponModel.deleteOne({ code: cleanCode });
      console.log(`[MongoDB] Successfully deleted coupon ${cleanCode} from MongoDB Atlas!`);
    } catch (err) {
      console.error(`[MongoDB] Error deleting coupon ${cleanCode}:`, err);
    }

    return data.coupons.length < initialLen;
  }

  async saveUser(user: CustomerUser): Promise<CustomerUser> {
    const data = this.getData();
    const existingIndex = data.users.findIndex((u) => u.id === user.id || u.email === user.email);
    if (existingIndex >= 0) {
      data.users[existingIndex] = user;
    } else {
      data.users.push(user);
    }
    this.saveToDisk();

    try {
      await connectToDatabase();
      await UserModel.findOneAndUpdate({ id: user.id }, user, { upsert: true, new: true });
      console.log(`[MongoDB] Successfully saved user ${user.email} to MongoDB Atlas!`);
    } catch (err) {
      console.error(`[MongoDB] Error saving user ${user.email}:`, err);
    }

    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const data = this.getData();
    const initialLen = data.users.length;
    data.users = data.users.filter((u) => u.id !== id && u.email !== id);
    this.saveToDisk();

    try {
      await connectToDatabase();
      await UserModel.deleteOne({ $or: [{ id }, { email: id }] });
      console.log(`[MongoDB] Successfully deleted user ${id} from MongoDB Atlas!`);
    } catch (err) {
      console.error(`[MongoDB] Error deleting user ${id}:`, err);
    }

    return data.users.length < initialLen;
  }

  async deleteOrder(id: string): Promise<boolean> {
    const data = this.getData();
    const initialLen = data.orders.length;
    data.orders = data.orders.filter((o) => o.id !== id && o.orderNumber !== id);
    this.saveToDisk();

    try {
      await connectToDatabase();
      await OrderModel.deleteOne({ $or: [{ id }, { orderNumber: id }] });
      console.log(`[MongoDB] Successfully deleted order ${id} from MongoDB Atlas!`);
    } catch (err) {
      console.error(`[MongoDB] Error deleting order ${id}:`, err);
    }

    return data.orders.length < initialLen;
  }

  async deleteReview(productId: string, reviewId: string): Promise<boolean> {
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

        try {
          await connectToDatabase();
          await ProductModel.findOneAndUpdate({ id: prod.id }, prod, { upsert: true });
        } catch (err) {
          console.error(`[MongoDB] Error deleting review ${reviewId}:`, err);
        }

        return true;
      }
    }
    return false;
  }

  async updateCMS(newCms: Partial<HomepageCMS>): Promise<HomepageCMS> {
    const data = this.getData();
    data.cms = { ...data.cms, ...newCms };
    this.saveToDisk();

    try {
      await connectToDatabase();
      await CMSModel.findOneAndUpdate({ key: 'homepage' }, data.cms, { upsert: true, new: true });
      console.log(`[MongoDB] Successfully updated CMS in MongoDB Atlas!`);
    } catch (err) {
      console.error('[MongoDB] Error updating CMS:', err);
    }

    return data.cms;
  }

  async createOrder(order: Order): Promise<Order> {
    const data = this.getData();
    data.orders.unshift(order);
    this.saveToDisk();

    try {
      await connectToDatabase();
      await OrderModel.findOneAndUpdate({ id: order.id }, order, { upsert: true, new: true });
      console.log(`[MongoDB] Successfully created order ${order.orderNumber} in MongoDB Atlas!`);
    } catch (err) {
      console.error(`[MongoDB] Error creating order ${order.orderNumber}:`, err);
    }

    return order;
  }

  async updateOrderStatus(orderId: string, status: Order['orderStatus']): Promise<Order | undefined> {
    const data = this.getData();
    const ord = data.orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (ord) {
      ord.orderStatus = status;
      this.saveToDisk();

      try {
        await connectToDatabase();
        await OrderModel.findOneAndUpdate({ id: ord.id }, { orderStatus: status });
        console.log(`[MongoDB] Successfully updated order status for ${ord.orderNumber} to ${status}`);
      } catch (err) {
        console.error(`[MongoDB] Error updating order status for ${ord.orderNumber}:`, err);
      }
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
    if (fullData.collections && Array.isArray(fullData.collections)) {
      this.data.collections = fullData.collections;
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
    if (fullData.users && Array.isArray(fullData.users)) {
      this.data.users = fullData.users;
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
