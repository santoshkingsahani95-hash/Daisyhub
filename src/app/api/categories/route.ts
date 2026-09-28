import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { Category } from '@/types';
import { DEFAULT_CATEGORIES } from '@/lib/defaults';
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

async function queryCategories(): Promise<Category[]> {
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
        await saveCategoryToDb(c);
      }
      categories = DEFAULT_CATEGORIES;
    }

    return categories;
  } catch (error) {
    console.error('[queryCategories Error]', error);
    return DEFAULT_CATEGORIES;
  }
}

async function queryCategoryBySlug(slug: string): Promise<Category | null> {
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
    console.error('[queryCategoryBySlug Error]', error);
    return null;
  }
}

async function queryCategoryById(id: string): Promise<Category | null> {
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
    console.error('[queryCategoryById Error]', error);
    return null;
  }
}

async function saveCategoryToDb(rawCategory: Category): Promise<Category> {
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
    console.error('[saveCategoryToDb Error]', error);
  }
  return category;
}

async function deleteCategoryFromDb(idOrSlug: string): Promise<boolean> {
  try {
    await prisma.category.deleteMany({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });
    return true;
  } catch (error) {
    console.error('[deleteCategoryFromDb Error]', error);
    return false;
  }
}

// -------------------------------------------------------------
// Route Handlers (Next.js App Router API)
// -------------------------------------------------------------

/**
 * GET /api/categories
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');

    if (slug) {
      const category = await queryCategoryBySlug(slug);
      if (!category) {
        return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404, headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ success: true, category, data: category }, { headers: NO_CACHE_HEADERS });
    }

    if (id) {
      const category = await queryCategoryById(id);
      if (!category) {
        return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404, headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ success: true, category, data: category }, { headers: NO_CACHE_HEADERS });
    }

    const categories = await queryCategories();
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

    const saved = await saveCategoryToDb(categoryToSave);
    const categories = await queryCategories();

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

    const success = await deleteCategoryFromDb(id);
    const categories = await queryCategories();

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
