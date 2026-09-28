import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  getCategoryBySlug,
  getCategoryById,
  saveCategory,
  deleteCategory,
  getProducts,
} from '@/lib/db-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

/**
 * GET /api/categories/[slug]
 */
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    const category = (await getCategoryBySlug(slug)) || (await getCategoryById(slug));

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeProducts = searchParams.get('includeProducts') === 'true';

    let products: any[] = [];
    if (includeProducts) {
      products = await getProducts({ category: category.slug });
    }

    return NextResponse.json(
      { success: true, category, products, data: category },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error(`[API /api/categories/${params.slug} GET Error]`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch category', message: error?.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * PUT /api/categories/[slug]
 */
export async function PUT(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json();
    const existing = (await getCategoryBySlug(params.slug)) || (await getCategoryById(params.slug));

    const categoryData = {
      id: existing ? existing.id : `cat-${Date.now()}`,
      slug: params.slug,
      ...body,
    };

    const saved = await saveCategory(categoryData);
    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/category/[slug]', 'page');

    return NextResponse.json(
      { success: true, category: saved, data: saved },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error(`[API /api/categories/${params.slug} PUT Error]`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update category', message: error?.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * DELETE /api/categories/[slug]
 */
export async function DELETE(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const success = await deleteCategory(params.slug);
    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/category/[slug]', 'page');

    return NextResponse.json(
      { success, message: success ? `Category ${params.slug} deleted` : `Failed to delete category ${params.slug}` },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error(`[API /api/categories/${params.slug} DELETE Error]`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete category', message: error?.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

