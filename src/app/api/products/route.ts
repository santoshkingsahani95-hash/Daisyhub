import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { productService } from '@/server/services';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

/**
 * GET /api/products
 * Query Params:
 * - id: string (optional - return single product by id)
 * - slug: string (optional - return single product by slug)
 * - category: string (optional - filter by category slug)
 * - search: string (optional - filter by name/sku/category)
 * - limit: number (optional)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

    if (id) {
      const product = await productService.getProductById(id);
      if (!product) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404, headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ success: true, product, data: product }, { headers: NO_CACHE_HEADERS });
    }

    if (slug) {
      const product = await productService.getProductBySlug(slug);
      if (!product) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404, headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ success: true, product, data: product }, { headers: NO_CACHE_HEADERS });
    }

    let products = category
      ? await productService.getProductsByCategory(category)
      : await productService.fetchProducts();

    if (search) {
      const searchLower = search.toLowerCase().trim();
      products = products.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(searchLower) ||
          (p.sku || '').toLowerCase().includes(searchLower) ||
          (p.category || '').toLowerCase().includes(searchLower)
      );
    }

    if (limit && limit > 0) {
      products = products.slice(0, limit);
    }

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
 * Create or Update a product
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

    const saved = await productService.saveProduct(product);
    const products = await productService.fetchProducts();

    // Invalidate Next.js page caches immediately so changes are visible everywhere
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

    const success = await productService.deleteProduct(id);

    // Invalidate Next.js page caches immediately
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
