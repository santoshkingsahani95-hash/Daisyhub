import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { sanitizeObjectImages } from '@/lib/image-upload';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

function mapProduct(r: any) {
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

/**
 * GET /api/products/[id]
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const row = await prisma.product.findFirst({
      where: { OR: [{ id }, { slug: id.toLowerCase().trim() }] },
    });

    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const product = mapProduct(row);
    return NextResponse.json(
      { success: true, product, data: product },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error(`[API /api/products/${params.id} GET Error]`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product', message: error?.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * PUT /api/products/[id]
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const rawBody = await request.json();
    const product = await sanitizeObjectImages({ ...rawBody, id: params.id });

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

    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/category/[slug]', 'page');
    revalidatePath('/product/[slug]', 'page');

    return NextResponse.json(
      { success: true, product, data: product },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error(`[API /api/products/${params.id} PUT Error]`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update product', message: error?.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * DELETE /api/products/[id]
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    await prisma.product.deleteMany({ where: { id } });
    await prisma.inventory.deleteMany({ where: { OR: [{ productId: id }, { id: `inv-${id}` }] } });
    await prisma.photoGallery.deleteMany({ where: { productId: id } });

    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/category/[slug]', 'page');

    return NextResponse.json(
      { success: true, message: `Product ${id} deleted` },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error(`[API /api/products/${params.id} DELETE Error]`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete product', message: error?.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
