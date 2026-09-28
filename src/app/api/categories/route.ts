import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { categoryService, productService } from '@/server/services';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

/**
 * GET /api/categories
 * Query Params:
 * - slug: string (optional - return single category by slug)
 * - id: string (optional - return single category by id)
 * - includeProducts: boolean (optional - attach products to category)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');
    const includeProducts = searchParams.get('includeProducts') === 'true';

    if (slug) {
      const category = await categoryService.getCategoryBySlug(slug);
      if (!category) {
        return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404, headers: NO_CACHE_HEADERS });
      }
      let products: any[] = [];
      if (includeProducts) {
        products = await productService.getProductsByCategory(slug);
      }
      return NextResponse.json({ success: true, category, products, data: category }, { headers: NO_CACHE_HEADERS });
    }

    if (id) {
      const category = await categoryService.getCategoryById(id);
      if (!category) {
        return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404, headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ success: true, category, data: category }, { headers: NO_CACHE_HEADERS });
    }

    const categories = await categoryService.fetchCategories();
    return NextResponse.json(
      {
        success: true,
        count: categories.length,
        categories,
        data: { categories },
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('[API /api/categories GET Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories', message: error?.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * POST /api/categories
 * Create or Update a category
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const category = body.category || body;

    if (!category || !category.name) {
      return NextResponse.json(
        { success: false, error: 'Invalid category payload. Category name is required.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const categoryToSave = {
      id: category.id || `cat-${Date.now()}`,
      slug: category.slug || category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: category.name.trim(),
      description: category.description || '',
      image: category.image || '',
      subcategories: Array.isArray(category.subcategories) ? category.subcategories : ['General'],
      seo: category.seo || undefined,
    };

    const saved = await categoryService.saveCategory(categoryToSave);
    const categories = await categoryService.fetchCategories();

    // Invalidate Next.js page caches immediately
    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/category/[slug]', 'page');

    return NextResponse.json(
      { success: true, category: saved, categories, data: saved },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('[API /api/categories POST Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save category', message: error?.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * DELETE /api/categories?id=...
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id') || searchParams.get('slug');

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id || body.slug;
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Category ID or Slug is required for deletion' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const success = await categoryService.deleteCategory(id);
    const categories = await categoryService.fetchCategories();

    // Invalidate Next.js page caches immediately
    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/category/[slug]', 'page');

    return NextResponse.json(
      { success, message: success ? `Category ${id} deleted` : `Failed to delete category ${id}`, categories },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('[API /api/categories DELETE Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete category', message: error?.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
