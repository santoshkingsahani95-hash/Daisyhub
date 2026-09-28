import { NextResponse } from 'next/server';
import { serverDb } from '@/lib/server-db';
import { initializeMySqlTables } from '@/lib/mysql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/products
 * Query Params:
 * - id: string (optional - return single product)
 * - slug: string (optional - return single product by slug)
 * - category: string (optional - filter by category slug)
 * - search: string (optional - filter by name/sku/category)
 */
export async function GET(request: Request) {
  try {
    await initializeMySqlTables();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    if (id) {
      const product = await serverDb.getProductById(id);
      if (!product) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
      }
      return NextResponse.json(
        { success: true, product },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    if (slug) {
      const product = await serverDb.getProductBySlug(slug);
      if (!product) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
      }
      return NextResponse.json(
        { success: true, product },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    let products = await serverDb.fetchProducts();

    if (category) {
      const catLower = category.toLowerCase().trim();
      products = products.filter((p) => (p.category || '').toLowerCase() === catLower);
    }

    if (search) {
      const searchLower = search.toLowerCase().trim();
      products = products.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(searchLower) ||
          (p.sku || '').toLowerCase().includes(searchLower) ||
          (p.category || '').toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json(
      {
        success: true,
        count: products.length,
        products,
        data: { products },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error('[API /api/products GET Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products', message: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await initializeMySqlTables();
    const body = await request.json();
    const product = body.product || body;

    if (!product || !product.id || !product.name) {
      return NextResponse.json(
        { success: false, error: 'Invalid product payload. id and name are required.' },
        { status: 400 }
      );
    }

    const saved = await serverDb.saveProduct(product);
    const products = await serverDb.fetchProducts();

    return NextResponse.json(
      { success: true, product: saved, products },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error('[API /api/products POST Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save product', message: error?.message },
      { status: 500 }
    );
  }
}
