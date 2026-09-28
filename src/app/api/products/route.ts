import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { Product } from '@/types';
import { sanitizeObjectImages } from '@/lib/image-upload';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

// -------------------------------------------------------------
// Direct Database Queries & Mutations (Internal to Route)
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

async function queryProducts(options?: { category?: string; search?: string; limit?: number }): Promise<Product[]> {
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
    console.error('[queryProducts Error]', error);
    return [];
  }
}

async function queryProductById(id: string): Promise<Product | null> {
  try {
    const row = await prisma.product.findFirst({ where: { id } });
    return row ? mapProduct(row) : null;
  } catch (error) {
    console.error('[queryProductById Error]', error);
    return null;
  }
}

async function queryProductBySlug(slug: string): Promise<Product | null> {
  try {
    const row = await prisma.product.findFirst({ where: { slug: slug.toLowerCase().trim() } });
    return row ? mapProduct(row) : null;
  } catch (error) {
    console.error('[queryProductBySlug Error]', error);
    return null;
  }
}

async function saveProductToDb(rawProduct: Product): Promise<Product> {
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
    console.error('[saveProductToDb Error]', error);
    throw error;
  }
  return product;
}

async function deleteProductFromDb(id: string): Promise<boolean> {
  try {
    await prisma.product.deleteMany({ where: { id } });
    await prisma.inventory.deleteMany({ where: { OR: [{ productId: id }, { id: `inv-${id}` }] } });
    await prisma.photoGallery.deleteMany({ where: { productId: id } });
    return true;
  } catch (error) {
    console.error('[deleteProductFromDb Error]', error);
    return false;
  }
}

// -------------------------------------------------------------
// Route Handlers (Next.js App Router API)
// -------------------------------------------------------------

/**
 * GET /api/products
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

    if (id) {
      const product = await queryProductById(id);
      if (!product) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404, headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ success: true, product, data: product }, { headers: NO_CACHE_HEADERS });
    }

    if (slug) {
      const product = await queryProductBySlug(slug);
      if (!product) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404, headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ success: true, product, data: product }, { headers: NO_CACHE_HEADERS });
    }

    const products = await queryProducts({ category, search, limit });

    return NextResponse.json(
      {
        success: true,
        count: products.length,
        products,
        data: { products },
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('[API /api/products GET Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products', message: error?.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * POST /api/products
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const product = body.product || body;

    if (!product || !product.id || !product.name) {
      return NextResponse.json(
        { success: false, error: 'Invalid product payload. id and name are required.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const saved = await saveProductToDb(product);
    const products = await queryProducts();

    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/category/[slug]', 'page');
    revalidatePath('/product/[slug]', 'page');

    return NextResponse.json(
      { success: true, product: saved, products, data: saved },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('[API /api/products POST Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save product', message: error?.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * DELETE /api/products?id=...
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required for deletion' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const success = await deleteProductFromDb(id);

    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/category/[slug]', 'page');

    return NextResponse.json(
      { success, message: success ? `Product ${id} deleted` : `Failed to delete product ${id}` },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('[API /api/products DELETE Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete product', message: error?.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
