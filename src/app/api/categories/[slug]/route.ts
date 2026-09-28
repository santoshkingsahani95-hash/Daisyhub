import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { DEFAULT_CATEGORIES } from '@/lib/defaults';
import { sanitizeObjectImages } from '@/lib/image-upload';

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
    const slug = params.slug.toLowerCase().trim();
    let row = await prisma.category.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
    });

    let category: any = null;
    if (row) {
      category = {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description || '',
        image: row.image || '',
        subcategories: Array.isArray(row.subcategories) ? (row.subcategories as any) : [],
        seo: (row.seo as any) ?? undefined,
      };
    } else {
      category = DEFAULT_CATEGORIES.find((c) => c.slug === slug || c.id === slug) || null;
    }

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, category, data: category },
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
    const slug = params.slug.toLowerCase().trim();

    const existing = await prisma.category.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
    });

    const categoryData = await sanitizeObjectImages({
      id: existing ? existing.id : `cat-${Date.now()}`,
      slug,
      ...body,
    });

    await prisma.category.deleteMany({
      where: { OR: [{ id: categoryData.id }, { slug: categoryData.slug }] },
    });

    await prisma.category.create({
      data: {
        id: categoryData.id,
        slug: categoryData.slug,
        name: categoryData.name,
        description: categoryData.description || '',
        image: categoryData.image || '',
        subcategories: (categoryData.subcategories || []) as any,
        seo: (categoryData.seo ?? null) as any,
      },
    });

    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/category/[slug]', 'page');

    return NextResponse.json(
      { success: true, category: categoryData, data: categoryData },
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
    const slug = params.slug.toLowerCase().trim();
    await prisma.category.deleteMany({
      where: { OR: [{ id: slug }, { slug }] },
    });

    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/category/[slug]', 'page');

    return NextResponse.json(
      { success: true, message: `Category ${params.slug} deleted` },
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
