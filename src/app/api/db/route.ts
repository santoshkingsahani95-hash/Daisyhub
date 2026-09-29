import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { CustomerUser, Product, Category, Collection, Order, HomepageCMS, DistrictDeliveryRate } from '@/types';
import { DEFAULT_CATEGORIES, DEFAULT_COLLECTIONS, DEFAULT_CMS } from '@/lib/defaults';
import { generateDefaultDeliveryRates } from '@/lib/nepal-locations';
import { sanitizeObjectImages } from '@/lib/image-upload';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

// -------------------------------------------------------------
// Direct Database Queries & Mutations (Internal)
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
    stockQuantity: r.stockQuantity !== null && r.stockQuantity !== undefined ? Number(r.stockQuantity) : 0,
    totalStock: r.stockQuantity !== null && r.stockQuantity !== undefined ? Number(r.stockQuantity) : 0,
    isFreeDelivery: Boolean(r.isFreeDelivery),
    images: Array.isArray(r.images) && r.images.length > 0
      ? r.images
      : (rawColors.flatMap((c: any) => Array.isArray(c.images) ? c.images : [])),
    colors: rawColors,
    sizes,
    reviews: Array.isArray(r.reviews) ? (r.reviews as any) : [],
    sku: r.sku || undefined,
    createdAt: r.createdAt ? (typeof r.createdAt === 'string' ? r.createdAt : r.createdAt.toISOString()) : new Date().toISOString(),
  };
}

async function fetchAllData() {
  const [prodRows, catRows, colRows, orderRows, cmsRow] =
    await Promise.all([
      prisma.product.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.category.findMany(),
      prisma.collection.findMany(),
      prisma.order.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.cms.findUnique({ where: { key: 'homepage' } }),
    ]);

  const products: Product[] = prodRows.map(mapProduct);

  let categories: Category[] = catRows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description || '',
    image: r.image || '',
    subcategories: Array.isArray(r.subcategories) ? (r.subcategories as any) : [],
    seo: (r.seo as any) ?? undefined,
  }));
  if (categories.length === 0) categories = DEFAULT_CATEGORIES;

  let collections: Collection[] = colRows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description || '',
    image: r.image || '',
    seo: (r.seo as any) ?? undefined,
  }));
  if (collections.length === 0) collections = DEFAULT_COLLECTIONS;

  let deliveryRates: DistrictDeliveryRate[] =
    Array.isArray(cmsRow?.deliveryRates) && (cmsRow.deliveryRates as any[]).length > 0
      ? (cmsRow.deliveryRates as any)
      : generateDefaultDeliveryRates();

  const orders: Order[] = orderRows.map((r) => ({
    id: r.id,
    orderNumber: r.orderNumber,
    createdAt: r.createdAt ? (typeof r.createdAt === 'string' ? r.createdAt : r.createdAt.toISOString()) : new Date().toISOString(),
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

  const users: CustomerUser[] = [];

  const cms: HomepageCMS = cmsRow
    ? {
        announcementBar: (cmsRow.announcementBar as any) || DEFAULT_CMS.announcementBar,
        hero: (cmsRow.hero as any) || DEFAULT_CMS.hero,
        editorialBanner: (cmsRow.editorialBanner as any) || DEFAULT_CMS.editorialBanner,
        instagramImages: Array.isArray(cmsRow.instagramImages) ? (cmsRow.instagramImages as any) : DEFAULT_CMS.instagramImages,
        fonepaySettings: (cmsRow.fonepaySettings as any) || DEFAULT_CMS.fonepaySettings,
        deliveryRates,
        seo: (cmsRow.seo as any) || DEFAULT_CMS.seo,
      }
    : { ...DEFAULT_CMS, deliveryRates };

  return {
    products,
    categories,
    collections,
    cms,
    orders,
    users,
    version: Date.now(),
  };
}

// -------------------------------------------------------------
// Route Handlers (Next.js App Router API)
// -------------------------------------------------------------

export async function GET() {
  try {
    const data = await fetchAllData();
    return NextResponse.json(
      { success: true, data },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve database state' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;
    revalidatePath('/', 'layout');

    switch (action) {
      case 'saveProduct': {
        const { product } = body;
        if (product && product.id) {
          const sanitized = await sanitizeObjectImages(product);
          await prisma.product.deleteMany({ where: { OR: [{ id: sanitized.id }, { slug: sanitized.slug }] } });
          await prisma.product.create({
            data: {
              id: sanitized.id,
              slug: sanitized.slug,
              name: sanitized.name,
              description: sanitized.description || '',
              details: (sanitized.details || []) as any,
              fabricCare: sanitized.fabricCare || '',
              category: sanitized.category,
              subcategory: sanitized.subcategory || null,
              collections: (sanitized.collections || []) as any,
              price: sanitized.price,
              salePrice: sanitized.salePrice ?? null,
              discountPercentage: sanitized.discountPercentage ?? null,
              rating: sanitized.rating || 4.8,
              reviewCount: sanitized.reviewCount || 0,
              isTrending: !!sanitized.isTrending,
              isNewArrival: !!sanitized.isNewArrival,
              isBestSeller: !!sanitized.isBestSeller,
              isSale: !!sanitized.isSale,
              isOutOfStock: !!sanitized.isOutOfStock,
              stockQuantity: typeof sanitized.stockQuantity === 'number'
                ? sanitized.stockQuantity
                : (sanitized.colors && sanitized.colors.length > 0
                    ? sanitized.colors.reduce((sum: number, c: any) => sum + (typeof c.stock === 'number' ? c.stock : 0), 0)
                    : (sanitized.sizes ? sanitized.sizes.reduce((sum: number, s: any) => sum + (s.stock || 0), 0) : 0)),
              images: (Array.isArray(sanitized.images) && sanitized.images.length > 0
                ? sanitized.images
                : (sanitized.colors && Array.isArray(sanitized.colors)
                    ? sanitized.colors.flatMap((c: any) => Array.isArray(c.images) ? c.images : [])
                    : [])) as any,
              colors: (sanitized.colors || []) as any,
              sizes: (sanitized.sizes || []) as any,
              sku: sanitized.sku,
              reviews: (sanitized.reviews || []) as any,
              isFreeDelivery: !!sanitized.isFreeDelivery,
              seo: (sanitized.seo ?? null) as any,
              createdAt: sanitized.createdAt || new Date().toISOString(),
            },
          });
        }
        break;
      }

      case 'deleteProduct': {
        const { id } = body;
        if (id) {
          await prisma.product.deleteMany({ where: { id } });
        }
        break;
      }

      case 'saveCategory': {
        const { category } = body;
        if (category && category.name) {
          const sanitized = await sanitizeObjectImages(category);
          await prisma.category.deleteMany({ where: { OR: [{ id: sanitized.id }, { slug: sanitized.slug }] } });
          await prisma.category.create({
            data: {
              id: sanitized.id || `cat-${Date.now()}`,
              slug: sanitized.slug,
              name: sanitized.name,
              description: sanitized.description || '',
              image: sanitized.image || '',
              subcategories: (sanitized.subcategories || []) as any,
              seo: (sanitized.seo ?? null) as any,
            },
          });
        }
        break;
      }

      case 'deleteCategory': {
        const { id } = body;
        if (id) {
          await prisma.category.deleteMany({ where: { OR: [{ id }, { slug: id }] } });
        }
        break;
      }

      case 'saveCollection': {
        const { collection } = body;
        if (collection && collection.name) {
          const sanitized = await sanitizeObjectImages(collection);
          await prisma.collection.deleteMany({ where: { OR: [{ id: sanitized.id }, { slug: sanitized.slug }] } });
          await prisma.collection.create({
            data: {
              id: sanitized.id || `col-${Date.now()}`,
              slug: sanitized.slug,
              name: sanitized.name,
              description: sanitized.description || '',
              image: sanitized.image || '',
              seo: (sanitized.seo ?? null) as any,
            },
          });
        }
        break;
      }

      case 'deleteCollection': {
        const { id } = body;
        if (id) {
          await prisma.collection.deleteMany({ where: { OR: [{ id }, { slug: id }] } });
        }
        break;
      }





      case 'deleteOrder': {
        const { id } = body;
        if (id) {
          await prisma.order.deleteMany({ where: { OR: [{ id }, { orderNumber: id }] } });
        }
        break;
      }

      case 'updateCMS': {
        const { cms } = body;
        if (cms) {
          const sanitized = await sanitizeObjectImages(cms);
          await prisma.cms.upsert({
            where: { key: 'homepage' },
            update: {
              announcementBar: (sanitized.announcementBar ?? null) as any,
              hero: (sanitized.hero ?? null) as any,
              editorialBanner: (sanitized.editorialBanner ?? null) as any,
              instagramImages: (sanitized.instagramImages ?? []) as any,
              fonepaySettings: (sanitized.fonepaySettings ?? null) as any,
              deliveryRates: (sanitized.deliveryRates ?? null) as any,
              seo: (sanitized.seo ?? null) as any,
            },
            create: {
              key: 'homepage',
              announcementBar: (sanitized.announcementBar ?? null) as any,
              hero: (sanitized.hero ?? null) as any,
              editorialBanner: (sanitized.editorialBanner ?? null) as any,
              instagramImages: (sanitized.instagramImages ?? []) as any,
              fonepaySettings: (sanitized.fonepaySettings ?? null) as any,
              deliveryRates: (sanitized.deliveryRates ?? null) as any,
              seo: (sanitized.seo ?? null) as any,
            },
          });
        }
        break;
      }

      case 'updateDeliveryRates': {
        const { rates } = body;
        if (rates && Array.isArray(rates)) {
          await prisma.cms.upsert({
            where: { key: 'homepage' },
            update: {
              deliveryRates: rates as any,
            },
            create: {
              key: 'homepage',
              deliveryRates: rates as any,
            },
          });
        }
        break;
      }

      default:
        break;
    }

    const responseData = await fetchAllData();
    return NextResponse.json(
      { success: true, data: responseData },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API /api/db POST Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process database mutation' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
