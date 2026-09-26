import { Product, Category, Collection, Order, Coupon, HomepageCMS, CustomerUser, ProductReview, ColorOption, SEOMetadata, AdminCredentials, DistrictDeliveryRate } from '@/types';
import { seedProducts, initialCategories, initialCollections, initialCMS } from './seed-data';
import { generateDefaultDeliveryRates } from './nepal-locations';

// Helper to push client-side mutations to the server API asynchronously
async function postApiAction(action: string, payload: Record<string, any> = {}) {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
      cache: 'no-store',
    });
  } catch (e) {
    console.warn('[DataStore] Failed to send mutation to server API:', e);
  }
}

// In-memory persistent data store with server API sync & localStorage fallback
class DataStore {
  private products: Product[] = [];
  private categories: Category[] = [];
  private collections: Collection[] = [];
  private cms: HomepageCMS = { ...initialCMS };
  private orders: Order[] = [];
  private coupons: Coupon[] = [];
  private newsletterSubscribers: string[] = [];
  private users: CustomerUser[] = [
    {
      id: 'usr-admin-1',
      name: 'Admin Manager',
      email: 'admin@daisyhub.com',
      mobile: '+977 9800000000',
      role: 'ADMIN',
      registrationDate: '2026-01-01',
    },
  ];

  private isSyncing = false;

  constructor() {
    this.loadFromLocalStorage();
    if (typeof window !== 'undefined') {
      // Perform immediate sync with server API
      this.syncWithServer();

      // Poll server every 2 seconds for real-time multi-device database sync
      setInterval(() => {
        if (!document.hidden) {
          this.syncWithServer();
        }
      }, 2000);

      // Also sync when tab regains focus or becomes visible
      window.addEventListener('focus', () => this.syncWithServer());
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) this.syncWithServer();
      });
    }
  }

  public async syncWithServer() {
    if (typeof window === 'undefined' || this.isSyncing) return;
    try {
      this.isSyncing = true;
      const res = await fetch('/api/db', { cache: 'no-store' });
      if (!res.ok) return;
      const result = await res.json();
      if (result.success && result.data) {
        const sData = result.data;
        let changed = false;

        if (sData.products && Array.isArray(sData.products)) {
          const newProdsStr = JSON.stringify(sData.products);
          if (JSON.stringify(this.products) !== newProdsStr) {
            this.products = sData.products;
            localStorage.setItem('ace_db_products', newProdsStr);
            changed = true;
          }
        }

        if (sData.categories && Array.isArray(sData.categories)) {
          const newCatsStr = JSON.stringify(sData.categories);
          if (JSON.stringify(this.categories) !== newCatsStr) {
            this.categories = sData.categories;
            localStorage.setItem('ace_db_categories', newCatsStr);
            changed = true;
          }
        }

        if (sData.collections && Array.isArray(sData.collections)) {
          const newColsStr = JSON.stringify(sData.collections);
          if (JSON.stringify(this.collections) !== newColsStr) {
            this.collections = sData.collections;
            localStorage.setItem('ace_db_collections', newColsStr);
            changed = true;
          }
        }

        if (sData.cms) {
          const newCmsStr = JSON.stringify(sData.cms);
          if (JSON.stringify(this.cms) !== newCmsStr) {
            this.cms = sData.cms;
            localStorage.setItem('ace_db_cms', newCmsStr);
            changed = true;
          }
        }

        if (sData.orders && Array.isArray(sData.orders)) {
          const newOrdsStr = JSON.stringify(sData.orders);
          if (JSON.stringify(this.orders) !== newOrdsStr) {
            this.orders = sData.orders;
            localStorage.setItem('ace_db_orders', newOrdsStr);
            changed = true;
          }
        }

        if (sData.coupons && Array.isArray(sData.coupons)) {
          const newCoupStr = JSON.stringify(sData.coupons);
          if (JSON.stringify(this.coupons) !== newCoupStr) {
            this.coupons = sData.coupons;
            localStorage.setItem('ace_db_coupons', newCoupStr);
            changed = true;
          }
        }

        if (sData.users && Array.isArray(sData.users)) {
          const newUsersStr = JSON.stringify(sData.users);
          if (JSON.stringify(this.users) !== newUsersStr) {
            this.users = sData.users;
            localStorage.setItem('ace_db_users', newUsersStr);
            changed = true;
          }
        }

        if (changed) {
          window.dispatchEvent(new CustomEvent('ace-db-updated', { detail: { key: 'all' } }));
        }
      }
    } catch (e) {
      // Ignore network failures gracefully
    } finally {
      this.isSyncing = false;
    }
  }

  private loadFromLocalStorage() {
    if (typeof window === 'undefined') return;
    try {
      const storedCms = localStorage.getItem('ace_db_cms') || sessionStorage.getItem('ace_db_cms');
      if (storedCms) this.cms = JSON.parse(storedCms);

      const storedProds = localStorage.getItem('ace_db_products') || sessionStorage.getItem('ace_db_products');
      if (storedProds) this.products = JSON.parse(storedProds);

      const storedCats = localStorage.getItem('ace_db_categories') || sessionStorage.getItem('ace_db_categories');
      if (storedCats) this.categories = JSON.parse(storedCats);

      const storedCols = localStorage.getItem('ace_db_collections') || sessionStorage.getItem('ace_db_collections');
      if (storedCols) this.collections = JSON.parse(storedCols);

      const storedOrders = localStorage.getItem('ace_db_orders') || sessionStorage.getItem('ace_db_orders');
      if (storedOrders) this.orders = JSON.parse(storedOrders);

      const storedCoupons = localStorage.getItem('ace_db_coupons') || sessionStorage.getItem('ace_db_coupons');
      if (storedCoupons) this.coupons = JSON.parse(storedCoupons);

      const storedUsers = localStorage.getItem('ace_db_users') || sessionStorage.getItem('ace_db_users');
      if (storedUsers) this.users = JSON.parse(storedUsers);
    } catch (e) {
      console.error('Failed to load from storage:', e);
    }
  }

  private saveAndBroadcast(key: string, data: any) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('ace-db-updated', { detail: { key } }));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  // Products
  getProducts(): Product[] {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ace_db_products') || sessionStorage.getItem('ace_db_products');
      if (stored) {
        try {
          const parsed: Product[] = JSON.parse(stored);
          this.products = parsed.map((p) => ({
            ...p,
            createdAt: p.createdAt || new Date().toISOString(),
          }));
        } catch (e) {}
      }
    }
    return this.products;
  }

  getProductBySlug(slug: string): Product | undefined {
    return this.getProducts().find((p) => p.slug === slug || p.id === slug);
  }

  getProductsByCategory(categorySlug: string): Product[] {
    const prods = this.getProducts();
    if (categorySlug === 'new-arrivals') {
      return prods.filter((p) => p.isNewArrival || p.collections?.includes('new-arrivals'));
    }
    if (categorySlug === 'sale') {
      return prods.filter((p) => p.isSale || p.salePrice !== undefined);
    }
    if (categorySlug === 'trending') {
      return prods.filter((p) => p.isTrending);
    }
    if (categorySlug === 'best-sellers') {
      return prods.filter((p) => p.isBestSeller);
    }
    return prods.filter((p) => p.category.toLowerCase() === categorySlug.toLowerCase());
  }

  saveProduct(product: Product): Product {
    const prods = this.getProducts();
    const existingIndex = prods.findIndex((p) => p.id === product.id);
    if (existingIndex >= 0) {
      prods[existingIndex] = product;
    } else {
      prods.unshift(product);
    }
    this.products = prods;
    this.saveAndBroadcast('ace_db_products', this.products);
    postApiAction('saveProduct', { product });
    return product;
  }

  deleteProduct(id: string): boolean {
    const prods = this.getProducts();
    const initialLen = prods.length;
    this.products = prods.filter((p) => p.id !== id);
    this.saveAndBroadcast('ace_db_products', this.products);
    postApiAction('deleteProduct', { id });
    return this.products.length < initialLen;
  }

  updateInventory(productId: string, size: string, newStock: number): boolean {
    const prods = this.getProducts();
    const prod = prods.find((p) => p.id === productId);
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

    this.products = prods;
    this.saveAndBroadcast('ace_db_products', this.products);
    postApiAction('updateInventory', { productId, size, newStock: cleanStock });
    return true;
  }

  updateColorStock(productId: string, colorName: string, newStock: number): boolean {
    const prods = this.getProducts();
    const prod = prods.find((p) => p.id === productId);
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

    this.products = prods;
    this.saveAndBroadcast('ace_db_products', this.products);
    postApiAction('updateColorStock', { productId, colorName, newStock: cleanStock });
    return true;
  }

  addReview(productId: string, review: ProductReview): boolean {
    const prods = this.getProducts();
    const prod = prods.find((p) => p.id === productId);
    if (!prod) return false;
    if (!prod.reviews) prod.reviews = [];
    prod.reviews.unshift(review);
    prod.reviewCount = prod.reviews.length;
    const totalRating = prod.reviews.reduce((acc, r) => acc + r.rating, 0);
    prod.rating = Number((totalRating / prod.reviewCount).toFixed(1));
    this.products = prods;
    this.saveAndBroadcast('ace_db_products', this.products);
    postApiAction('saveProduct', { product: prod });
    return true;
  }

  // Categories & Collections
  getCategories(): Category[] {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ace_db_categories') || sessionStorage.getItem('ace_db_categories');
      if (stored) {
        try {
          this.categories = JSON.parse(stored);
        } catch (e) {}
      }
    }
    return this.categories;
  }

  addCategory(category: Category): Category {
    const cats = this.getCategories();
    const existingIndex = cats.findIndex((c) => c.id === category.id || c.slug === category.slug);
    if (existingIndex >= 0) {
      cats[existingIndex] = category;
    } else {
      cats.push(category);
    }
    this.categories = cats;
    this.saveAndBroadcast('ace_db_categories', this.categories);
    postApiAction('saveCategory', { category });
    return category;
  }

  deleteCategory(id: string): boolean {
    const cats = this.getCategories();
    const initialLen = cats.length;
    this.categories = cats.filter((c) => c.id !== id && c.slug !== id);
    this.saveAndBroadcast('ace_db_categories', this.categories);
    postApiAction('deleteCategory', { id });
    return this.categories.length < initialLen;
  }

  updateCategory(id: string, updatedFields: Partial<Category>): Category | undefined {
    const cats = this.getCategories();
    const cat = cats.find((c) => c.id === id || c.slug === id);
    if (cat) {
      if (updatedFields.name) cat.name = updatedFields.name;
      if (updatedFields.description) cat.description = updatedFields.description;
      if (updatedFields.image) cat.image = updatedFields.image;
      if (updatedFields.subcategories) cat.subcategories = updatedFields.subcategories;
      this.categories = cats;
      this.saveAndBroadcast('ace_db_categories', this.categories);
      postApiAction('saveCategory', { category: cat });
    }
    return cat;
  }

  updateProductPhoto(productId: string, newPhotoUrl: string): boolean {
    const prods = this.getProducts();
    const prod = prods.find((p) => p.id === productId);
    if (!prod) return false;
    if (prod.colors.length === 0) {
      prod.colors = [{ name: 'Default', code: '#111111', images: [newPhotoUrl, newPhotoUrl] }];
    } else {
      prod.colors[0].images = [newPhotoUrl, newPhotoUrl];
    }
    this.products = prods;
    this.saveAndBroadcast('ace_db_products', this.products);
    postApiAction('saveProduct', { product: prod });
    return true;
  }

  updateProductColors(productId: string, colors: ColorOption[]): boolean {
    const prods = this.getProducts();
    const prod = prods.find((p) => p.id === productId);
    if (!prod) return false;
    prod.colors = colors;
    this.products = prods;
    this.saveAndBroadcast('ace_db_products', this.products);
    postApiAction('saveProduct', { product: prod });
    return true;
  }

  getCollections(): Collection[] {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ace_db_collections') || sessionStorage.getItem('ace_db_collections');
      if (stored) {
        try {
          this.collections = JSON.parse(stored);
        } catch (e) {}
      }
    }
    return this.collections;
  }

  saveCollection(collection: Collection): Collection {
    const cols = this.getCollections();
    const existingIndex = cols.findIndex((c) => c.id === collection.id || c.slug === collection.slug);
    if (existingIndex >= 0) {
      cols[existingIndex] = collection;
    } else {
      cols.push(collection);
    }
    this.collections = cols;
    this.saveAndBroadcast('ace_db_collections', this.collections);
    postApiAction('saveCollection', { collection });
    return collection;
  }

  deleteCollection(id: string): boolean {
    const cols = this.getCollections();
    const initialLen = cols.length;
    this.collections = cols.filter((c) => c.id !== id && c.slug !== id);
    this.saveAndBroadcast('ace_db_collections', this.collections);
    postApiAction('deleteCollection', { id });
    return this.collections.length < initialLen;
  }

  toggleProductFlag(productId: string, flag: 'isTrending' | 'isNewArrival' | 'isBestSeller' | 'isSale', value: boolean): boolean {
    const prods = this.getProducts();
    const prod = prods.find((p) => p.id === productId);
    if (!prod) return false;
    prod[flag] = value;
    if (flag === 'isSale' && !value) {
      delete prod.salePrice;
      delete prod.discountPercentage;
    }
    this.products = prods;
    this.saveAndBroadcast('ace_db_products', this.products);
    postApiAction('saveProduct', { product: prod });
    return true;
  }

  // CMS
  getCMS(): HomepageCMS {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ace_db_cms') || sessionStorage.getItem('ace_db_cms');
      if (stored) {
        try {
          this.cms = JSON.parse(stored);
        } catch (e) {}
      }
      const storedFonepay = localStorage.getItem('ace_db_fonepay_settings') || sessionStorage.getItem('ace_db_fonepay_settings');
      if (storedFonepay) {
        try {
          this.cms.fonepaySettings = JSON.parse(storedFonepay);
        } catch (e) {}
      }
    }
    if (!this.cms.deliveryRates || this.cms.deliveryRates.length === 0) {
      this.cms.deliveryRates = generateDefaultDeliveryRates();
    }
    return this.cms;
  }

  updateCMS(newCms: Partial<HomepageCMS>): HomepageCMS {
    const current = this.getCMS();
    this.cms = { ...current, ...newCms };
    if (newCms.fonepaySettings) {
      try {
        localStorage.setItem('ace_db_fonepay_settings', JSON.stringify(newCms.fonepaySettings));
      } catch (e) {}
    }
    this.saveAndBroadcast('ace_db_cms', this.cms);
    postApiAction('updateCMS', { cms: this.cms });
    return this.cms;
  }

  getDeliveryRates(): DistrictDeliveryRate[] {
    const cms = this.getCMS();
    if (cms.deliveryRates && cms.deliveryRates.length > 0) {
      return cms.deliveryRates;
    }
    const defaults = generateDefaultDeliveryRates();
    this.updateCMS({ deliveryRates: defaults });
    return defaults;
  }

  updateDeliveryRates(rates: DistrictDeliveryRate[]): DistrictDeliveryRate[] {
    this.updateCMS({ deliveryRates: rates });
    return rates;
  }

  // Orders
  getOrders(): Order[] {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ace_db_orders') || sessionStorage.getItem('ace_db_orders');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            this.orders = parsed;
          }
        } catch (e) {}
      }
    }
    return this.orders;
  }

  getOrderById(id: string): Order | undefined {
    if (!id) return undefined;
    const cleanId = decodeURIComponent(id).trim().toLowerCase();
    const all = this.getOrders();
    return all.find(
      (o) =>
        o.id.toLowerCase() === cleanId ||
        o.orderNumber.toLowerCase() === cleanId ||
        o.id.toLowerCase().includes(cleanId) ||
        o.orderNumber.toLowerCase().includes(cleanId)
    );
  }

  getOrdersByEmail(email: string): Order[] {
    if (!email || !email.trim()) return [];
    const clean = email.trim().toLowerCase();
    return this.getOrders().filter((o) => {
      const custEmail = o.customerEmail ? o.customerEmail.trim().toLowerCase() : '';
      const shipEmail = o.shippingAddress?.email ? o.shippingAddress.email.trim().toLowerCase() : '';
      return custEmail === clean || shipEmail === clean;
    });
  }

  createOrder(order: Order): Order {
    const ords = this.getOrders();
    ords.unshift(order);
    this.orders = ords;
    this.saveAndBroadcast('ace_db_orders', this.orders);
    postApiAction('createOrder', { order });

    if (typeof window !== 'undefined') {
      try {
        const webhookUrl = localStorage.getItem('ace_google_sheet_webhook');
        if (webhookUrl && webhookUrl.startsWith('http')) {
          fetch(webhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderNumber: order.orderNumber,
              createdAt: new Date(order.createdAt).toLocaleString(),
              customerName: order.customerName,
              customerMobile: order.customerMobile,
              customerEmail: order.customerEmail,
              address: `${order.shippingAddress?.streetAddress || ''}, ${order.shippingAddress?.city || ''}`,
              items: order.items.map((i) => `${i.productName} (${i.size}, ${i.colorName}) x${i.quantity}`).join(' | '),
              total: order.total,
              paymentMethod: order.paymentMethod,
            }),
          }).catch(() => {});
        }
      } catch (e) {}
    }

    return order;
  }

  updateOrderStatus(orderId: string, status: Order['orderStatus']): Order | undefined {
    const ords = this.getOrders();
    const ord = ords.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (ord) {
      ord.orderStatus = status;
      this.orders = ords;
      this.saveAndBroadcast('ace_db_orders', this.orders);
      postApiAction('updateOrderStatus', { orderId, status });
    }
    return ord;
  }

  deleteOrder(id: string): boolean {
    const ords = this.getOrders();
    const initialLen = ords.length;
    this.orders = ords.filter((o) => o.id !== id && o.orderNumber !== id);
    this.saveAndBroadcast('ace_db_orders', this.orders);
    postApiAction('deleteOrder', { id });
    return this.orders.length < initialLen;
  }

  // Coupons
  getCoupons(): Coupon[] {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ace_db_coupons') || sessionStorage.getItem('ace_db_coupons');
      if (stored) {
        try {
          this.coupons = JSON.parse(stored);
        } catch (e) {}
      }
    }
    return this.coupons;
  }

  validateCoupon(code: string, subtotal: number): { valid: boolean; discountAmount: number; message: string } {
    const coupons = this.getCoupons();
    const cleanCode = code.trim().toUpperCase();
    const coupon = coupons.find((c) => c.code.trim().toUpperCase() === cleanCode && c.active);

    if (!coupon) {
      return { valid: false, discountAmount: 0, message: 'Invalid or inactive coupon code.' };
    }

    if (coupon.expiryDate) {
      const expiry = new Date(coupon.expiryDate);
      expiry.setHours(23, 59, 59, 999);
      if (new Date() > expiry) {
        return { valid: false, discountAmount: 0, message: `Coupon '${coupon.code}' expired on ${coupon.expiryDate}.` };
      }
    }

    if (subtotal < coupon.minOrderValue) {
      return {
        valid: false,
        discountAmount: 0,
        message: `Minimum order value of NPR ${coupon.minOrderValue.toLocaleString()} required for this coupon.`,
      };
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.discountValue;
    }

    return {
      valid: true,
      discountAmount: Math.round(discount),
      message: `Coupon applied successfully! Saved NPR ${Math.round(discount).toLocaleString()}`,
    };
  }

  addCoupon(coupon: Coupon): Coupon {
    const coupons = this.getCoupons();
    const cleanCode = coupon.code.trim().toUpperCase();
    const existingIdx = coupons.findIndex((c) => c.code.trim().toUpperCase() === cleanCode);
    const cleanCoupon: Coupon = { ...coupon, code: cleanCode };

    if (existingIdx >= 0) {
      coupons[existingIdx] = cleanCoupon;
    } else {
      coupons.push(cleanCoupon);
    }

    this.coupons = coupons;
    this.saveAndBroadcast('ace_db_coupons', this.coupons);
    postApiAction('saveCoupon', { coupon: cleanCoupon });
    return cleanCoupon;
  }

  deleteCoupon(code: string): boolean {
    const coupons = this.getCoupons();
    const cleanCode = code.trim().toUpperCase();
    const filtered = coupons.filter((c) => c.code.trim().toUpperCase() !== cleanCode);
    if (filtered.length !== coupons.length) {
      this.coupons = filtered;
      this.saveAndBroadcast('ace_db_coupons', this.coupons);
      postApiAction('deleteCoupon', { code: cleanCode });
      return true;
    }
    return false;
  }

  toggleCouponStatus(code: string): Coupon | undefined {
    const coupons = this.getCoupons();
    const cleanCode = code.trim().toUpperCase();
    const found = coupons.find((c) => c.code.trim().toUpperCase() === cleanCode);
    if (found) {
      found.active = !found.active;
      this.coupons = coupons;
      this.saveAndBroadcast('ace_db_coupons', this.coupons);
      postApiAction('saveCoupon', { coupon: found });
    }
    return found;
  }

  // Newsletter
  addNewsletterSubscriber(email: string): { success: boolean; message: string } {
    const cleanEmail = email.trim().toLowerCase();
    if (this.newsletterSubscribers.includes(cleanEmail)) {
      return { success: true, message: 'You are already subscribed to the ACE Club!' };
    }
    this.newsletterSubscribers.push(cleanEmail);
    return { success: true, message: 'Welcome to the ACE Club! Check your inbox for exclusive updates.' };
  }

  getNewsletterSubscribers(): string[] {
    return this.newsletterSubscribers;
  }

  // Users
  getUsers(): CustomerUser[] {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ace_db_users') || sessionStorage.getItem('ace_db_users');
      if (stored) {
        try {
          this.users = JSON.parse(stored);
        } catch (e) {}
      }
    }
    return this.users;
  }

  saveUser(user: CustomerUser): CustomerUser {
    const usersList = this.getUsers();
    const existingIdx = usersList.findIndex((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (existingIdx >= 0) {
      usersList[existingIdx] = { ...usersList[existingIdx], ...user };
    } else {
      usersList.push(user);
    }
    this.users = usersList;
    this.saveAndBroadcast('ace_db_users', this.users);
    postApiAction('saveUser', { user });
    return user;
  }

  deleteUser(id: string): boolean {
    const usersList = this.getUsers();
    const initialLen = usersList.length;
    this.users = usersList.filter((u) => u.id !== id && u.email.toLowerCase() !== id.toLowerCase());
    this.saveAndBroadcast('ace_db_users', this.users);
    postApiAction('deleteUser', { id });
    return this.users.length < initialLen;
  }

  findUserByEmail(email: string): CustomerUser | undefined {
    if (!email) return undefined;
    const clean = email.trim().toLowerCase();
    return this.getUsers().find((u) => u.email.trim().toLowerCase() === clean);
  }

  // Admin Credentials Management
  getAdminCredentials(): AdminCredentials {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('daisyhub_admin_credentials');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
    }
    return {
      username: process.env.NEXT_PUBLIC_ADMIN_USERNAME || 'admin',
      password: process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123',
    };
  }

  updateAdminCredentials(username: string, password: string): { success: boolean; message: string } {
    if (!username.trim() || !password.trim()) {
      return { success: false, message: 'Username and Password cannot be empty.' };
    }
    const creds: AdminCredentials = {
      username: username.trim(),
      password: password.trim(),
      lastUpdated: new Date().toISOString(),
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('daisyhub_admin_credentials', JSON.stringify(creds));
      window.dispatchEvent(new Event('ace-db-updated'));
    }
    return { success: true, message: 'Admin Credentials updated successfully!' };
  }

  // SEO Settings Management
  getGlobalSEO(): SEOMetadata {
    const cms = this.getCMS();
    return cms.seo || {
      metaTitle: "DaisyHubb – Women's Clothing & Ladies Fashion Online in Nepal",
      metaDescription: "Shop trendy women's clothing online in Nepal at DaisyHubb. Discover stylish ladies wear, dresses, tops, kurtis and more at affordable prices.",
      keywords: "women's clothing Nepal, ladies clothing Nepal, women's fashion Nepal, ladies fashion Nepal, women's clothes online Nepal, ladies clothes online Nepal, women's wear Nepal, ladies wear Nepal, women's dresses Nepal, women's tops Nepal, women's kurtis Nepal, buy women's clothes online Nepal",
      canonicalUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://daisyhubb.com',
      ogImage: '',
      h1: "Women's Clothing & Fashion Online in Nepal",
    };
  }

  updateGlobalSEO(seoData: SEOMetadata): void {
    this.updateCMS({ seo: seoData });
  }

  updateCategorySEO(categorySlug: string, seoData: SEOMetadata): void {
    const cats = this.getCategories();
    const cat = cats.find((c) => c.slug === categorySlug);
    if (cat) {
      cat.seo = { ...cat.seo, ...seoData };
      this.categories = cats;
      this.saveAndBroadcast('ace_db_categories', this.categories);
      postApiAction('saveCategory', { category: cat });
    }
  }

  updateProductSEO(productSlug: string, seoData: SEOMetadata): void {
    const prods = this.getProducts();
    const prod = prods.find((p) => p.slug === productSlug);
    if (prod) {
      prod.seo = { ...prod.seo, ...seoData };
      this.saveProduct(prod);
    }
  }
}

// Global Singleton to ensure state persistence across requests in memory
const globalStore = (globalThis as any).__aceDataStore || new DataStore();
if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).__aceDataStore = globalStore;
}

export const db = globalStore as DataStore;
