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

async function fetchAllData() {
  const [prodRows, catRows, colRows, rateRows, orderRows, cmsRow] =
    await Promise.all([
      prisma.product.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.category.findMany(),
      prisma.collection.findMany(),
      prisma.deliveryRate.findMany(),
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

  let deliveryRates: DistrictDeliveryRate[] = rateRows.map((r) => ({
    province: r.province,
    district: r.district,
    deliveryFee: Number(r.deliveryFee),
    enabled: Boolean(r.enabled),
    homeDeliveryFee: r.homeDeliveryFee !== null && r.homeDeliveryFee !== undefined ? Number(r.homeDeliveryFee) : undefined,
    branchDeliveryFee: r.branchDeliveryFee !== null && r.branchDeliveryFee !== undefined ? Number(r.branchDeliveryFee) : undefined,
    homeDeliveryEnabled: r.homeDeliveryEnabled !== null && r.homeDeliveryEnabled !== undefined ? Boolean(r.homeDeliveryEnabled) : undefined,
    branchDeliveryEnabled: r.branchDeliveryEnabled !== null && r.branchDeliveryEnabled !== undefined ? Boolean(r.branchDeliveryEnabled) : undefined,
  }));
  if (deliveryRates.length === 0) deliveryRates = generateDefaultDeliveryRates();

  const orders: Order[] = orderRows.map((r) => ({
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
              colors: (sanitized.colors || []) as any,
              sizes: (sanitized.sizes || []) as any,
              sku: sanitized.sku,
              reviews: (sanitized.reviews || []) as any,
              insideValleyFee: sanitized.insideValleyFee || 100,
              outsideValleyFee: sanitized.outsideValleyFee || 200,
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
          await prisma.inventory.deleteMany({ where: { OR: [{ productId: id }, { id: `inv-${id}` }] } });
          await prisma.photoGallery.deleteMany({ where: { productId: id } });
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
              seo: (sanitized.seo ?? null) as any,
            },
            create: {
              key: 'homepage',
              announcementBar: (sanitized.announcementBar ?? null) as any,
              hero: (sanitized.hero ?? null) as any,
              editorialBanner: (sanitized.editorialBanner ?? null) as any,
              instagramImages: (sanitized.instagramImages ?? []) as any,
              fonepaySettings: (sanitized.fonepaySettings ?? null) as any,
              seo: (sanitized.seo ?? null) as any,
            },
          });
        }
        break;
      }

      case 'updateDeliveryRates': {
        const { rates } = body;
        if (rates && Array.isArray(rates)) {
          await prisma.$transaction(
            rates.map((r: any) =>
              prisma.deliveryRate.upsert({
                where: { district: r.district },
                update: {
                  province: r.province,
                  deliveryFee: r.deliveryFee,
                  enabled: !!r.enabled,
                  homeDeliveryFee: r.homeDeliveryFee ?? r.deliveryFee,
                  branchDeliveryFee: r.branchDeliveryFee ?? r.deliveryFee,
                  homeDeliveryEnabled: !!r.homeDeliveryEnabled,
                  branchDeliveryEnabled: !!r.branchDeliveryEnabled,
                },
                create: {
                  district: r.district,
                  province: r.province,
                  deliveryFee: r.deliveryFee,
                  enabled: !!r.enabled,
                  homeDeliveryFee: r.homeDeliveryFee ?? r.deliveryFee,
                  branchDeliveryFee: r.branchDeliveryFee ?? r.deliveryFee,
                  homeDeliveryEnabled: !!r.homeDeliveryEnabled,
                  branchDeliveryEnabled: !!r.branchDeliveryEnabled,
                },
              })
            )
          );
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
