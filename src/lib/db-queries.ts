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
import { prisma } from './prisma';
import { DEFAULT_CATEGORIES, DEFAULT_COLLECTIONS, DEFAULT_CMS } from '@/server/config/defaults';
import { generateDefaultDeliveryRates } from './nepal-locations';
import { sanitizeObjectImages } from './image-upload';

// -------------------------------------------------------------
// Product Queries & Mutations
// -------------------------------------------------------------

function mapProduct(r: any): Product {
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
    insideValleyFee: r.insideValleyFee !== null && r.insideValleyFee !== undefined ? Number(r.insideValleyFee) : undefined,
    outsideValleyFee: r.outsideValleyFee !== null && r.outsideValleyFee !== undefined ? Number(r.outsideValleyFee) : undefined,
    isFreeDelivery: Boolean(r.isFreeDelivery),
    colors: rawColors,
    sizes,
    reviews: Array.isArray(r.reviews) ? (r.reviews as any) : [],
    sku: r.sku || undefined,
    createdAt: r.createdAt ? r.createdAt : undefined,
  };
}

export async function getProducts(options?: { category?: string; search?: string; limit?: number }): Promise<Product[]> {
  try {
    const where: any = {};
    if (options?.category && options.category !== 'all') {
      where.category = options.category;
    }

    const rows = await prisma.product.findMany({ where, orderBy: { createdAt: 'desc' } });
    let products = rows.map(mapProduct);

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (options?.limit && options.limit > 0) {
      products = products.slice(0, options.limit);
    }

    return products;
  } catch (error) {
    console.error('[getProducts Error]', error);
    return [];
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const row = await prisma.product.findFirst({ where: { id } });
    return row ? mapProduct(row) : null;
  } catch (error) {
    console.error('[getProductById Error]', error);
    return null;
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const row = await prisma.product.findFirst({ where: { slug: slug.toLowerCase().trim() } });
    return row ? mapProduct(row) : null;
  } catch (error) {
    console.error('[getProductBySlug Error]', error);
    return null;
  }
}

export async function saveProduct(rawProduct: Product): Promise<Product> {
  const product = await sanitizeObjectImages(rawProduct);
  try {
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

    // Sync inventory doc
    const totalStock = product.colors && product.colors.length > 0
      ? product.colors.reduce((sum: number, c: any) => sum + (typeof c.stock === 'number' ? c.stock : 0), 0)
      : (product.sizes ? product.sizes.reduce((sum: number, s: any) => sum + (s.stock || 0), 0) : 0);

    await prisma.inventory.upsert({
      where: { id: `inv-${product.id}` },
      update: {
        totalStock,
        isOutOfStock: totalStock <= 0,
        colors: (product.colors || []) as any,
        sizes: (product.sizes || []) as any,
        updatedAt: new Date().toISOString(),
      },
      create: {
        id: `inv-${product.id}`,
        productId: product.id,
        sku: product.sku || 'N/A',
        productName: product.name,
        category: product.category || 'General',
        totalStock,
        isOutOfStock: totalStock <= 0,
        colors: (product.colors || []) as any,
        sizes: (product.sizes || []) as any,
        updatedAt: new Date().toISOString(),
      },
    });

    // Sync photo gallery
    await prisma.photoGallery.deleteMany({ where: { productId: product.id } });
    if (product.colors && Array.isArray(product.colors) && product.colors.length > 0) {
      let sortOrder = 0;
      const rows: any[] = [];
      for (const c of product.colors) {
        if (c.images && Array.isArray(c.images)) {
          for (let i = 0; i < c.images.length; i++) {
            sortOrder++;
            rows.push({
              id: `gal-${product.id}-${sortOrder}`,
              productId: product.id,
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
  } catch (error) {
    console.error('[saveProduct Error]', error);
    throw error;
  }
  return product;
}

export async function deleteProduct(id: string): Promise<boolean> {
  try {
    await prisma.product.deleteMany({ where: { id } });
    await prisma.inventory.deleteMany({ where: { OR: [{ productId: id }, { id: `inv-${id}` }] } });
    await prisma.photoGallery.deleteMany({ where: { productId: id } });
    return true;
  } catch (error) {
    console.error('[deleteProduct Error]', error);
    return false;
  }
}

export async function updateInventory(productId: string, size: string, newStock: number): Promise<boolean> {
  try {
    const prod = await getProductById(productId);
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

    await saveProduct(prod);
    return true;
  } catch (error) {
    console.error('[updateInventory Error]', error);
    return false;
  }
}

export async function updateColorStock(productId: string, colorName: string, newStock: number): Promise<boolean> {
  try {
    const prod = await getProductById(productId);
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

    await saveProduct(prod);
    return true;
  } catch (error) {
    console.error('[updateColorStock Error]', error);
    return false;
  }
}

export async function deleteReview(productId: string, reviewId: string): Promise<boolean> {
  try {
    const prod = await getProductById(productId);
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
        await saveProduct(prod);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('[deleteReview Error]', error);
    return false;
  }
}

// -------------------------------------------------------------
// Category Queries & Mutations
// -------------------------------------------------------------

export async function getCategories(): Promise<Category[]> {
  try {
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

    if (categories.length === 0 && DEFAULT_CATEGORIES.length > 0) {
      for (const c of DEFAULT_CATEGORIES) {
        await saveCategory(c);
      }
      categories = DEFAULT_CATEGORIES;
    }

    return categories;
  } catch (error) {
    console.error('[getCategories Error]', error);
    return DEFAULT_CATEGORIES;
  }
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const cleanSlug = slug.toLowerCase().trim();
    const row = await prisma.category.findFirst({ where: { slug: cleanSlug } });
    if (!row) {
      const fallback = DEFAULT_CATEGORIES.find((c) => c.slug === cleanSlug);
      return fallback || null;
    }
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description || '',
      image: row.image || '',
      subcategories: Array.isArray(row.subcategories) ? (row.subcategories as any) : [],
      seo: (row.seo as any) ?? undefined,
    };
  } catch (error) {
    console.error('[getCategoryBySlug Error]', error);
    return null;
  }
}

export async function getCategoryById(id: string): Promise<Category | null> {
  try {
    const row = await prisma.category.findFirst({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description || '',
      image: row.image || '',
      subcategories: Array.isArray(row.subcategories) ? (row.subcategories as any) : [],
      seo: (row.seo as any) ?? undefined,
    };
  } catch (error) {
    console.error('[getCategoryById Error]', error);
    return null;
  }
}

export async function saveCategory(rawCategory: Category): Promise<Category> {
  const category = await sanitizeObjectImages(rawCategory);
  try {
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
  } catch (error) {
    console.error('[saveCategory Error]', error);
  }
  return category;
}

export async function deleteCategory(idOrSlug: string): Promise<boolean> {
  try {
    await prisma.category.deleteMany({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });
    return true;
  } catch (error) {
    console.error('[deleteCategory Error]', error);
    return false;
  }
}

// -------------------------------------------------------------
// CMS & Delivery Rates Queries & Mutations
// -------------------------------------------------------------

export async function getDeliveryRates(): Promise<DistrictDeliveryRate[]> {
  try {
    const rows = await prisma.deliveryRate.findMany();
    let rates: DistrictDeliveryRate[] = rows.map((r) => ({
      province: r.province,
      district: r.district,
      deliveryFee: Number(r.deliveryFee),
      enabled: Boolean(r.enabled),
      homeDeliveryFee: r.homeDeliveryFee !== null && r.homeDeliveryFee !== undefined ? Number(r.homeDeliveryFee) : undefined,
      branchDeliveryFee: r.branchDeliveryFee !== null && r.branchDeliveryFee !== undefined ? Number(r.branchDeliveryFee) : undefined,
      homeDeliveryEnabled: r.homeDeliveryEnabled !== null && r.homeDeliveryEnabled !== undefined ? Boolean(r.homeDeliveryEnabled) : undefined,
      branchDeliveryEnabled: r.branchDeliveryEnabled !== null && r.branchDeliveryEnabled !== undefined ? Boolean(r.branchDeliveryEnabled) : undefined,
    }));

    if (rates.length === 0) {
      rates = generateDefaultDeliveryRates();
      await updateDeliveryRates(rates);
    }
    return rates;
  } catch (error) {
    console.error('[getDeliveryRates Error]', error);
    return generateDefaultDeliveryRates();
  }
}

export async function updateDeliveryRates(rates: DistrictDeliveryRate[]): Promise<DistrictDeliveryRate[]> {
  try {
    await prisma.$transaction(
      rates.map((r) => {
        const data = {
          province: r.province,
          deliveryFee: r.deliveryFee,
          enabled: !!r.enabled,
          homeDeliveryFee: r.homeDeliveryFee ?? r.deliveryFee,
          branchDeliveryFee: r.branchDeliveryFee ?? r.deliveryFee,
          homeDeliveryEnabled: !!r.homeDeliveryEnabled,
          branchDeliveryEnabled: !!r.branchDeliveryEnabled,
        };
        return prisma.deliveryRate.upsert({
          where: { district: r.district },
          update: data,
          create: { district: r.district, ...data },
        });
      })
    );
  } catch (error) {
    console.error('[updateDeliveryRates Error]', error);
  }
  return rates;
}

export async function getCMS(): Promise<HomepageCMS> {
  try {
    const [row, rates] = await Promise.all([
      prisma.cms.findUnique({ where: { key: 'homepage' } }),
      getDeliveryRates(),
    ]);

    if (!row) {
      return { ...DEFAULT_CMS, deliveryRates: rates };
    }

    return {
      announcementBar: (row.announcementBar as any) || DEFAULT_CMS.announcementBar,
      hero: (row.hero as any) || DEFAULT_CMS.hero,
      editorialBanner: (row.editorialBanner as any) || DEFAULT_CMS.editorialBanner,
      instagramImages: Array.isArray(row.instagramImages) ? (row.instagramImages as any) : DEFAULT_CMS.instagramImages,
      fonepaySettings: (row.fonepaySettings as any) || DEFAULT_CMS.fonepaySettings,
      deliveryRates: rates,
      seo: (row.seo as any) || DEFAULT_CMS.seo,
    };
  } catch (error) {
    console.error('[getCMS Error]', error);
    return DEFAULT_CMS;
  }
}

export async function updateCMS(rawCms: Partial<HomepageCMS>): Promise<HomepageCMS> {
  const newCms = await sanitizeObjectImages(rawCms);
  try {
    if (newCms.deliveryRates && Array.isArray(newCms.deliveryRates)) {
      await updateDeliveryRates(newCms.deliveryRates);
    }
    const existing = await getCMS();
    const updated: HomepageCMS = {
      ...existing,
      ...newCms,
      announcementBar: newCms.announcementBar ? { ...existing.announcementBar, ...newCms.announcementBar } : existing.announcementBar,
      hero: newCms.hero ? { ...existing.hero, ...newCms.hero } : existing.hero,
      editorialBanner: newCms.editorialBanner ? { ...existing.editorialBanner, ...newCms.editorialBanner } : existing.editorialBanner,
      fonepaySettings: newCms.fonepaySettings ? { ...existing.fonepaySettings, ...newCms.fonepaySettings } : existing.fonepaySettings,
      seo: newCms.seo ? { ...existing.seo, ...newCms.seo } : existing.seo,
      deliveryRates: newCms.deliveryRates ? newCms.deliveryRates : existing.deliveryRates,
    };

    const data = {
      announcementBar: (updated.announcementBar ?? null) as any,
      hero: (updated.hero ?? null) as any,
      editorialBanner: (updated.editorialBanner ?? null) as any,
      instagramImages: (updated.instagramImages ?? []) as any,
      fonepaySettings: (updated.fonepaySettings ?? null) as any,
      deliveryRates: (updated.deliveryRates ?? []) as any,
      seo: (updated.seo ?? null) as any,
    };

    await prisma.cms.upsert({
      where: { key: 'homepage' },
      update: data,
      create: { key: 'homepage', ...data },
    });
    return updated;
  } catch (error) {
    console.error('[updateCMS Error]', error);
    return { ...DEFAULT_CMS, ...newCms };
  }
}

// -------------------------------------------------------------
// Orders Queries & Mutations
// -------------------------------------------------------------

export async function getOrders(): Promise<Order[]> {
  try {
    const rows = await prisma.order.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((r) => ({
      id: r.id,
      orderNumber: r.orderNumber,
      createdAt: r.createdAt || new Date().toISOString(),
      items: Array.isArray(r.items) ? (r.items as any) : [],
      subtotal: Number(r.subtotal || 0),
      discount: Number(r.discount || 0),
      shipping: Number(r.shipping || 0),
      total: Number(r.total || 0),
      paymentMethod: r.paymentMethod as any,
      paymentStatus: (r.paymentStatus as any) || 'pending',
      orderStatus: (r.orderStatus as any) || 'Pending',
      customerName: r.customerName,
      customerEmail: r.customerEmail,
      customerMobile: r.customerMobile,
      shippingAddress: (r.shippingAddress as any) || {
        fullName: r.customerName,
        mobile: r.customerMobile,
        email: r.customerEmail,
        province: 'Bagmati',
        district: 'Kathmandu',
        city: 'Kathmandu',
        streetAddress: 'Kathmandu',
      },
      estimatedDelivery: r.estimatedDelivery || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      trackingNumber: r.trackingNumber || undefined,
    }));
  } catch (error) {
    console.error('[getOrders Error]', error);
    return [];
  }
}

export async function getOrderById(idOrNumber: string): Promise<Order | null> {
  try {
    const r = await prisma.order.findFirst({
      where: { OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }] },
    });
    if (!r) return null;
    return {
      id: r.id,
      orderNumber: r.orderNumber,
      createdAt: r.createdAt || new Date().toISOString(),
      items: Array.isArray(r.items) ? (r.items as any) : [],
      subtotal: Number(r.subtotal || 0),
      discount: Number(r.discount || 0),
      shipping: Number(r.shipping || 0),
      total: Number(r.total || 0),
      paymentMethod: r.paymentMethod as any,
      paymentStatus: (r.paymentStatus as any) || 'pending',
      orderStatus: (r.orderStatus as any) || 'Pending',
      customerName: r.customerName,
      customerEmail: r.customerEmail,
      customerMobile: r.customerMobile,
      shippingAddress: (r.shippingAddress as any) || {
        fullName: r.customerName,
        mobile: r.customerMobile,
        email: r.customerEmail,
        province: 'Bagmati',
        district: 'Kathmandu',
        city: 'Kathmandu',
        streetAddress: 'Kathmandu',
      },
      estimatedDelivery: r.estimatedDelivery || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      trackingNumber: r.trackingNumber || undefined,
    };
  } catch (error) {
    console.error('[getOrderById Error]', error);
    return null;
  }
}

export async function updateOrderStatus(orderId: string, status: Order['orderStatus']): Promise<Order | null> {
  try {
    await prisma.order.updateMany({
      where: { OR: [{ id: orderId }, { orderNumber: orderId }] },
      data: { orderStatus: status },
    });
    return getOrderById(orderId);
  } catch (error) {
    console.error('[updateOrderStatus Error]', error);
    return null;
  }
}

export async function saveOrder(order: Order): Promise<Order> {
  try {
    await prisma.order.deleteMany({
      where: { OR: [{ id: order.id }, { orderNumber: order.orderNumber }] },
    });
    await prisma.order.create({
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt || new Date().toISOString(),
        items: (order.items || []) as any,
        subtotal: order.subtotal,
        discount: order.discount || 0,
        shipping: order.shipping || 0,
        total: order.total,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus || 'pending',
        orderStatus: order.orderStatus || 'Pending',
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerMobile: order.customerMobile,
        shippingAddress: (order.shippingAddress ?? null) as any,
        estimatedDelivery: order.estimatedDelivery || null,
        trackingNumber: order.trackingNumber || null,
      },
    });
  } catch (error) {
    console.error('[saveOrder Error]', error);
    throw error;
  }
  return order;
}

export async function deleteOrder(idOrNumber: string): Promise<boolean> {
  try {
    await prisma.order.deleteMany({
      where: { OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }] },
    });
    return true;
  } catch (error) {
    console.error('[deleteOrder Error]', error);
    return false;
  }
}

// -------------------------------------------------------------
// Collections Queries & Mutations
// -------------------------------------------------------------

export async function getCollections(): Promise<Collection[]> {
  try {
    const rows = await prisma.collection.findMany();
    let collections: Collection[] = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description || '',
      image: r.image || '',
      seo: (r.seo as any) ?? undefined,
    }));

    if (collections.length === 0 && DEFAULT_COLLECTIONS.length > 0) {
      for (const col of DEFAULT_COLLECTIONS) {
        await saveCollection(col);
      }
      collections = DEFAULT_COLLECTIONS;
    }
    return collections;
  } catch (error) {
    console.error('[getCollections Error]', error);
    return DEFAULT_COLLECTIONS;
  }
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  try {
    const cleanSlug = slug.toLowerCase().trim();
    const row = await prisma.collection.findFirst({ where: { slug: cleanSlug } });
    if (!row) {
      const fallback = DEFAULT_COLLECTIONS.find((c) => c.slug === cleanSlug);
      return fallback || null;
    }
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description || '',
      image: row.image || '',
      seo: (row.seo as any) ?? undefined,
    };
  } catch (error) {
    console.error('[getCollectionBySlug Error]', error);
    return null;
  }
}

export async function saveCollection(rawCollection: Collection): Promise<Collection> {
  const collection = await sanitizeObjectImages(rawCollection);
  try {
    await prisma.collection.deleteMany({
      where: { OR: [{ id: collection.id }, { slug: collection.slug }] },
    });
    await prisma.collection.create({
      data: {
        id: collection.id,
        slug: collection.slug,
        name: collection.name,
        description: collection.description || '',
        image: collection.image || '',
        seo: (collection.seo ?? null) as any,
      },
    });
  } catch (error) {
    console.error('[saveCollection Error]', error);
  }
  return collection;
}

export async function deleteCollection(idOrSlug: string): Promise<boolean> {
  try {
    await prisma.collection.deleteMany({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });
    return true;
  } catch (error) {
    console.error('[deleteCollection Error]', error);
    return false;
  }
}

// -------------------------------------------------------------
// Coupons Queries & Mutations
// -------------------------------------------------------------

export async function getCoupons(): Promise<Coupon[]> {
  try {
    const rows = await prisma.coupon.findMany();
    return rows.map((r) => ({
      code: r.code,
      discountType: r.discountType as any,
      discountValue: Number(r.discountValue),
      minOrderValue: Number(r.minOrderValue || 0),
      maxDiscount: r.maxDiscount ? Number(r.maxDiscount) : undefined,
      expiryDate: r.expiryDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      active: Boolean(r.active),
    }));
  } catch (error) {
    console.error('[getCoupons Error]', error);
    return [];
  }
}

export async function getCouponByCode(code: string): Promise<Coupon | null> {
  try {
    const cleanCode = code.trim().toUpperCase();
    const r = await prisma.coupon.findUnique({ where: { code: cleanCode } });
    if (!r) return null;
    return {
      code: r.code,
      discountType: r.discountType as any,
      discountValue: Number(r.discountValue),
      minOrderValue: Number(r.minOrderValue || 0),
      maxDiscount: r.maxDiscount ? Number(r.maxDiscount) : undefined,
      expiryDate: r.expiryDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      active: Boolean(r.active),
    };
  } catch (error) {
    console.error('[getCouponByCode Error]', error);
    return null;
  }
}

export async function saveCoupon(coupon: Coupon): Promise<Coupon> {
  const cleanCode = coupon.code.trim().toUpperCase();
  const cleanCoupon = { ...coupon, code: cleanCode };
  try {
    const data = {
      discountType: cleanCoupon.discountType,
      discountValue: cleanCoupon.discountValue,
      minOrderValue: cleanCoupon.minOrderValue || 0,
      maxDiscount: cleanCoupon.maxDiscount ?? null,
      expiryDate: cleanCoupon.expiryDate || null,
      active: !!cleanCoupon.active,
    };
    await prisma.coupon.upsert({
      where: { code: cleanCode },
      update: data,
      create: { code: cleanCode, ...data },
    });
  } catch (error) {
    console.error('[saveCoupon Error]', error);
  }
  return cleanCoupon;
}

export async function deleteCoupon(code: string): Promise<boolean> {
  try {
    const cleanCode = code.trim().toUpperCase();
    await prisma.coupon.deleteMany({ where: { code: cleanCode } });
    return true;
  } catch (error) {
    console.error('[deleteCoupon Error]', error);
    return false;
  }
}

// -------------------------------------------------------------
// Users Queries & Mutations
// -------------------------------------------------------------

export async function getUsers(): Promise<CustomerUser[]> {
  try {
    const rows = await prisma.user.findMany({ orderBy: { registrationDate: 'desc' } });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      mobile: r.mobile || undefined,
      role: (r.role as any) || 'CUSTOMER',
      registrationDate: r.registrationDate || new Date().toISOString(),
      isBlocked: Boolean(r.isBlocked),
      addresses: Array.isArray(r.addresses) ? (r.addresses as any) : [],
    }));
  } catch (error) {
    console.error('[getUsers Error]', error);
    return [];
  }
}

export async function saveUser(user: CustomerUser): Promise<CustomerUser> {
  try {
    const data = {
      name: user.name,
      email: user.email,
      mobile: user.mobile || null,
      password: (user as any).password || null,
      role: user.role || 'CUSTOMER',
      registrationDate: user.registrationDate || new Date().toISOString(),
      isBlocked: !!user.isBlocked,
      addresses: (user.addresses || []) as any,
    };
    await prisma.user.upsert({
      where: { id: user.id },
      update: data,
      create: { id: user.id, ...data },
    });
  } catch (error) {
    console.error('[saveUser Error]', error);
  }
  return user;
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await prisma.user.deleteMany({
      where: { OR: [{ id }, { email: id }] },
    });
    return true;
  } catch (error) {
    console.error('[deleteUser Error]', error);
    return false;
  }
}

// -------------------------------------------------------------
// Aggregate Operations
// -------------------------------------------------------------

export async function getFreshData() {
  const [products, categories, collections, deliveryRates, orders, coupons, users] =
    await Promise.all([
      getProducts(),
      getCategories(),
      getCollections(),
      getDeliveryRates(),
      getOrders(),
      getCoupons(),
      getUsers(),
    ]);

  const cms = await getCMS();

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

export async function syncFullData(fullData: any) {
  if (fullData.products && Array.isArray(fullData.products)) {
    for (const p of fullData.products) await saveProduct(p);
  }
  if (fullData.categories && Array.isArray(fullData.categories)) {
    for (const c of fullData.categories) await saveCategory(c);
  }
  if (fullData.collections && Array.isArray(fullData.collections)) {
    for (const col of fullData.collections) await saveCollection(col);
  }
  if (fullData.cms) {
    await updateCMS(fullData.cms);
  }
  if (fullData.orders && Array.isArray(fullData.orders)) {
    for (const o of fullData.orders) await saveOrder(o);
  }
  if (fullData.coupons && Array.isArray(fullData.coupons)) {
    for (const cp of fullData.coupons) await saveCoupon(cp);
  }
  if (fullData.users && Array.isArray(fullData.users)) {
    for (const u of fullData.users) await saveUser(u);
  }
  return getFreshData();
}
