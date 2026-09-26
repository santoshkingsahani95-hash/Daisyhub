import { Product, Category, Collection, Order, Coupon, HomepageCMS, CustomerUser, DistrictDeliveryRate } from '@/types';
import { initialCMS } from './seed-data';
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
      const conn = await connectToDatabase();
      let [dbProds, dbCats, dbCols, cmsDoc, dbOrds, dbCoups, dbUsers, dbRates] = await Promise.all([
        ProductModel.find().lean(),
        CategoryModel.find().lean(),
        CollectionModel.find().lean(),
        CMSModel.findOne({ key: 'homepage' }).lean(),
        OrderModel.find().sort({ createdAt: -1 }).lean(),
        CouponModel.find().lean(),
        UserModel.find().lean(),
        DeliveryRateModel.find().lean(),
      ]);

      if ((!dbCats || dbCats.length === 0) && conn && conn.db) {
        dbCats = await conn.db.collection('categories').find({}).toArray();
      }
      if ((!dbProds || dbProds.length === 0) && conn && conn.db) {
        dbProds = await conn.db.collection('products').find({}).toArray();
      }
      if ((!dbCols || dbCols.length === 0) && conn && conn.db) {
        dbCols = await conn.db.collection('collections').find({}).toArray();
      }
      if ((!dbRates || dbRates.length === 0) && conn && conn.db) {
        dbRates = await conn.db.collection('delivery_rates').find({}).toArray();
      }

      // If delivery_rates collection in MongoDB Atlas is empty, initialize all 77 Nepal districts
      if (!dbRates || dbRates.length === 0) {
        const defaultRates = generateDefaultDeliveryRates();
        for (const rate of defaultRates) {
          await DeliveryRateModel.findOneAndUpdate({ district: rate.district }, rate, { upsert: true });
          if (conn && conn.db) {
            await conn.db.collection('delivery_rates').updateOne({ district: rate.district }, { $set: rate }, { upsert: true });
          }
        }
        dbRates = await DeliveryRateModel.find().lean();
      }

      if (!cmsDoc) {
        await CMSModel.findOneAndUpdate({ key: 'homepage' }, initialCMS, { upsert: true });
        if (conn && conn.db) {
          await conn.db.collection('cms').updateOne(
            { key: 'homepage' },
            { $set: initialCMS },
            { upsert: true }
          );
        }
        cmsDoc = await CMSModel.findOne({ key: 'homepage' }).lean();
      }

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

      const deliveryRates: DistrictDeliveryRate[] = dbRates.map((r: any) => {
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
          deliveryRates: deliveryRates && deliveryRates.length > 0 ? deliveryRates : generateDefaultDeliveryRates(),
        };
      } else {
        cms.deliveryRates = deliveryRates;
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
    } catch (err: any) {
      console.error('[ServerDataStore getFreshData Error]', err?.message || err);
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
          if (conn && conn.db) await conn.db.collection('categories').updateOne({ id: c.id }, { $set: c }, { upsert: true });
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
    return this.getFreshData();
  }
}

const globalServerStore = (globalThis as any).__aceServerStore || new ServerDataStore();
if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).__aceServerStore = globalServerStore;
}

export const serverDb = globalServerStore as ServerDataStore;
