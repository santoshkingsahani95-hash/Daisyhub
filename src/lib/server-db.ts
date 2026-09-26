import { Product, Category, Collection, Order, Coupon, HomepageCMS, CustomerUser } from '@/types';
import { initialCMS } from './seed-data';
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
  public async getFreshData(): Promise<DatabaseSchema> {
    try {
      await connectToDatabase();
      const [dbProds, dbCats, dbCols, cmsDoc, dbOrds, dbCoups, dbUsers] = await Promise.all([
        ProductModel.find().lean(),
        CategoryModel.find().lean(),
        CollectionModel.find().lean(),
        CMSModel.findOne({ key: 'homepage' }).lean(),
        OrderModel.find().sort({ createdAt: -1 }).lean(),
        CouponModel.find().lean(),
        UserModel.find().lean(),
      ]);

      const products = dbProds.map((p: any) => {
        const { _id, __v, ...rest } = p;
        return rest as Product;
      });

      const categories = dbCats.map((c: any) => {
        const { _id, __v, ...rest } = c;
        return rest as Category;
      });

      const collections = dbCols.map((c: any) => {
        const { _id, __v, ...rest } = c;
        return rest as Collection;
      });

      let cms: HomepageCMS = { ...initialCMS };
      if (cmsDoc) {
        const { _id, __v, key, ...rest } = cmsDoc as any;
        cms = { ...cms, ...rest };
      }

      const orders = dbOrds.map((o: any) => {
        const { _id, __v, ...rest } = o;
        return rest as Order;
      });

      const coupons = dbCoups.map((cp: any) => {
        const { _id, __v, ...rest } = cp;
        return rest as Coupon;
      });

      const users: CustomerUser[] = (dbUsers && dbUsers.length > 0)
        ? dbUsers.map((u: any) => {
            const { _id, __v, ...rest } = u;
            return rest as CustomerUser;
          })
        : [
            {
              id: 'usr-admin-1',
              name: 'Admin Manager',
              email: 'admin@daisyhub.com',
              mobile: '+977 9800000000',
              role: 'ADMIN',
              registrationDate: '2026-01-01',
            },
          ];

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
    } catch (err) {
      console.error('[ServerDataStore getFreshData Error]', err);
      return {
        products: [],
        categories: [],
        collections: [],
        cms: { ...initialCMS },
        orders: [],
        coupons: [],
        users: [],
        version: Date.now(),
      };
    }
  }

  async getProducts(): Promise<Product[]> {
    const data = await this.getFreshData();
    return data.products;
  }

  async saveProduct(product: Product): Promise<Product> {
    try {
      await connectToDatabase();
      await ProductModel.findOneAndUpdate({ id: product.id }, product, { upsert: true, new: true });
      console.log(`[MongoDB Atlas] Successfully saved product '${product.name}' (${product.id})`);
    } catch (err) {
      console.error(`[MongoDB Atlas Error] Saving product ${product.id}:`, err);
    }
    return product;
  }

  async deleteProduct(id: string): Promise<boolean> {
    try {
      await connectToDatabase();
      const res = await ProductModel.deleteOne({ id });
      console.log(`[MongoDB Atlas] Successfully deleted product ${id}`);
      return res.deletedCount ? res.deletedCount > 0 : false;
    } catch (err) {
      console.error(`[MongoDB Atlas Error] Deleting product ${id}:`, err);
      return false;
    }
  }

  async updateInventory(productId: string, size: string, newStock: number): Promise<boolean> {
    try {
      await connectToDatabase();
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

      if (prod.colors) {
        prod.colors.forEach((c: any) => (c.stock = cleanStock));
      }

      const totalSizeStock = prod.sizes.reduce((sum: number, s: any) => sum + (s.stock || 0), 0);
      prod.isOutOfStock = totalSizeStock <= 0;

      await ProductModel.findOneAndUpdate({ id: productId }, prod, { upsert: true });
      console.log(`[MongoDB Atlas] Updated inventory for product ${productId} size '${size}' to ${cleanStock}`);
      return true;
    } catch (err) {
      console.error(`[MongoDB Atlas Error] Updating inventory for ${productId}:`, err);
      return false;
    }
  }

  async updateColorStock(productId: string, colorName: string, newStock: number): Promise<boolean> {
    try {
      await connectToDatabase();
      const prodDoc = await ProductModel.findOne({ id: productId });
      if (!prodDoc) return false;

      const prod = prodDoc.toObject();
      const cleanStock = isNaN(Number(newStock)) ? 0 : Math.max(0, Math.min(999, Math.floor(Number(newStock))));

      const targetColor = prod.colors ? prod.colors.find((c: any) => c.name.toLowerCase() === colorName.toLowerCase()) : null;
      if (targetColor) {
        targetColor.stock = cleanStock;
      } else if (prod.colors && prod.colors.length > 0) {
        prod.colors[0].stock = cleanStock;
      }

      const totalColorStock = prod.colors ? prod.colors.reduce((acc: number, c: any) => acc + (c.stock !== undefined ? c.stock : 0), 0) : 0;
      prod.sizes = [{ size: 'Free Size', stock: totalColorStock }];
      prod.isOutOfStock = totalColorStock <= 0;

      await ProductModel.findOneAndUpdate({ id: productId }, prod, { upsert: true });
      console.log(`[MongoDB Atlas] Updated color stock for product ${productId} color '${colorName}' to ${cleanStock}`);
      return true;
    } catch (err) {
      console.error(`[MongoDB Atlas Error] Updating color stock for ${productId}:`, err);
      return false;
    }
  }

  async saveCategory(category: Category): Promise<Category> {
    try {
      await connectToDatabase();
      await CategoryModel.findOneAndUpdate({ id: category.id }, category, { upsert: true, new: true });
      console.log(`[MongoDB Atlas] Successfully saved category '${category.name}' (${category.id})`);
    } catch (err) {
      console.error(`[MongoDB Atlas Error] Saving category '${category.name}':`, err);
    }
    return category;
  }

  async deleteCategory(id: string): Promise<boolean> {
    try {
      await connectToDatabase();
      const res = await CategoryModel.deleteOne({ $or: [{ id }, { slug: id }] });
      console.log(`[MongoDB Atlas] Successfully deleted category ${id}`);
      return res.deletedCount ? res.deletedCount > 0 : false;
    } catch (err) {
      console.error(`[MongoDB Atlas Error] Deleting category ${id}:`, err);
      return false;
    }
  }

  async saveCollection(collection: Collection): Promise<Collection> {
    try {
      await connectToDatabase();
      await CollectionModel.findOneAndUpdate({ id: collection.id }, collection, { upsert: true, new: true });
      console.log(`[MongoDB Atlas] Successfully saved collection '${collection.name}' (${collection.id})`);
    } catch (err) {
      console.error(`[MongoDB Atlas Error] Saving collection '${collection.name}':`, err);
    }
    return collection;
  }

  async deleteCollection(id: string): Promise<boolean> {
    try {
      await connectToDatabase();
      const res = await CollectionModel.deleteOne({ $or: [{ id }, { slug: id }] });
      console.log(`[MongoDB Atlas] Successfully deleted collection ${id}`);
      return res.deletedCount ? res.deletedCount > 0 : false;
    } catch (err) {
      console.error(`[MongoDB Atlas Error] Deleting collection ${id}:`, err);
      return false;
    }
  }

  async saveCoupon(coupon: Coupon): Promise<Coupon> {
    const cleanCode = coupon.code.trim().toUpperCase();
    const cleanCoupon = { ...coupon, code: cleanCode };
    try {
      await connectToDatabase();
      await CouponModel.findOneAndUpdate({ code: cleanCode }, cleanCoupon, { upsert: true, new: true });
      console.log(`[MongoDB Atlas] Successfully saved coupon ${cleanCode}`);
    } catch (err) {
      console.error(`[MongoDB Atlas Error] Saving coupon ${cleanCode}:`, err);
    }
    return cleanCoupon;
  }

  async deleteCoupon(code: string): Promise<boolean> {
    const cleanCode = code.trim().toUpperCase();
    try {
      await connectToDatabase();
      const res = await CouponModel.deleteOne({ code: cleanCode });
      console.log(`[MongoDB Atlas] Successfully deleted coupon ${cleanCode}`);
      return res.deletedCount ? res.deletedCount > 0 : false;
    } catch (err) {
      console.error(`[MongoDB Atlas Error] Deleting coupon ${cleanCode}:`, err);
      return false;
    }
  }

  async saveUser(user: CustomerUser): Promise<CustomerUser> {
    try {
      await connectToDatabase();
      await UserModel.findOneAndUpdate({ id: user.id }, user, { upsert: true, new: true });
      console.log(`[MongoDB Atlas] Successfully saved user ${user.email}`);
    } catch (err) {
      console.error(`[MongoDB Atlas Error] Saving user ${user.email}:`, err);
    }
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      await connectToDatabase();
      const res = await UserModel.deleteOne({ $or: [{ id }, { email: id }] });
      console.log(`[MongoDB Atlas] Successfully deleted user ${id}`);
      return res.deletedCount ? res.deletedCount > 0 : false;
    } catch (err) {
      console.error(`[MongoDB Atlas Error] Deleting user ${id}:`, err);
      return false;
    }
  }

  async deleteOrder(id: string): Promise<boolean> {
    try {
      await connectToDatabase();
      const res = await OrderModel.deleteOne({ $or: [{ id }, { orderNumber: id }] });
      console.log(`[MongoDB Atlas] Successfully deleted order ${id}`);
      return res.deletedCount ? res.deletedCount > 0 : false;
    } catch (err) {
      console.error(`[MongoDB Atlas Error] Deleting order ${id}:`, err);
      return false;
    }
  }

  async deleteReview(productId: string, reviewId: string): Promise<boolean> {
    try {
      await connectToDatabase();
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
          console.log(`[MongoDB Atlas] Deleted review ${reviewId} from product ${prod.id}`);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error(`[MongoDB Atlas Error] Deleting review ${reviewId}:`, err);
      return false;
    }
  }

  async updateCMS(newCms: Partial<HomepageCMS>): Promise<HomepageCMS> {
    try {
      await connectToDatabase();
      const existingCMSDoc = await CMSModel.findOne({ key: 'homepage' }).lean();
      let currentCMS = { ...initialCMS };
      if (existingCMSDoc) {
        const { _id, __v, key, ...rest } = existingCMSDoc as any;
        currentCMS = { ...currentCMS, ...rest };
      }
      const updated = { ...currentCMS, ...newCms };
      await CMSModel.findOneAndUpdate({ key: 'homepage' }, updated, { upsert: true, new: true });
      console.log(`[MongoDB Atlas] Successfully updated CMS`);
      return updated;
    } catch (err) {
      console.error('[MongoDB Atlas Error] Updating CMS:', err);
      return { ...initialCMS, ...newCms };
    }
  }

  async createOrder(order: Order): Promise<Order> {
    try {
      await connectToDatabase();
      await OrderModel.findOneAndUpdate({ id: order.id }, order, { upsert: true, new: true });
      console.log(`[MongoDB Atlas] Successfully created order ${order.orderNumber}`);
    } catch (err) {
      console.error(`[MongoDB Atlas Error] Creating order ${order.orderNumber}:`, err);
    }
    return order;
  }

  async updateOrderStatus(orderId: string, status: Order['orderStatus']): Promise<Order | undefined> {
    try {
      await connectToDatabase();
      const ordDoc = await OrderModel.findOne({ $or: [{ id: orderId }, { orderNumber: orderId }] });
      if (ordDoc) {
        ordDoc.orderStatus = status;
        await ordDoc.save();
        console.log(`[MongoDB Atlas] Updated order status for ${ordDoc.orderNumber} to ${status}`);
        const { _id, __v, ...rest } = ordDoc.toObject();
        return rest as Order;
      }
    } catch (err) {
      console.error(`[MongoDB Atlas Error] Updating order status for ${orderId}:`, err);
    }
    return undefined;
  }

  async syncFullData(fullData: Partial<DatabaseSchema>): Promise<DatabaseSchema> {
    try {
      await connectToDatabase();
      if (fullData.products && Array.isArray(fullData.products)) {
        for (const p of fullData.products) {
          await ProductModel.findOneAndUpdate({ id: p.id }, p, { upsert: true });
        }
      }
      if (fullData.categories && Array.isArray(fullData.categories)) {
        for (const c of fullData.categories) {
          await CategoryModel.findOneAndUpdate({ id: c.id }, c, { upsert: true });
        }
      }
      if (fullData.collections && Array.isArray(fullData.collections)) {
        for (const col of fullData.collections) {
          await CollectionModel.findOneAndUpdate({ id: col.id }, col, { upsert: true });
        }
      }
      if (fullData.cms) {
        await CMSModel.findOneAndUpdate({ key: 'homepage' }, fullData.cms, { upsert: true });
      }
      if (fullData.orders && Array.isArray(fullData.orders)) {
        for (const o of fullData.orders) {
          await OrderModel.findOneAndUpdate({ id: o.id }, o, { upsert: true });
        }
      }
      if (fullData.coupons && Array.isArray(fullData.coupons)) {
        for (const cp of fullData.coupons) {
          await CouponModel.findOneAndUpdate({ code: cp.code }, cp, { upsert: true });
        }
      }
      if (fullData.users && Array.isArray(fullData.users)) {
        for (const u of fullData.users) {
          await UserModel.findOneAndUpdate({ id: u.id }, u, { upsert: true });
        }
      }
    } catch (err) {
      console.error('[MongoDB Atlas Error] Syncing full data:', err);
    }
    return this.getFreshData();
  }
}

const globalServerStore = (globalThis as any).__aceServerStore || new ServerDataStore();
if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).__aceServerStore = globalServerStore;
}

export const serverDb = globalServerStore as ServerDataStore;
