import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { Collection } from '@/types';
import { DEFAULT_COLLECTIONS } from '@/lib/defaults';
import { sanitizeObjectImages } from '@/lib/image-upload';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

// -------------------------------------------------------------
// Direct Database Logic (Internal)
// -------------------------------------------------------------

async function queryCollections(): Promise<Collection[]> {
  try {
    const rows = await prisma.collection.findMany();
    let collections: Collection[] = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description || '',
      image: r.image || '',
      seo: (r.seo as any) ?? undefined,
    }));

    if (collections.length === 0 && DEFAULT_COLLECTIONS.length > 0) {
      for (const col of DEFAULT_COLLECTIONS) {
        await saveCollectionToDb(col);
      }
      collections = DEFAULT_COLLECTIONS;
    }
    return collections;
  } catch (error) {
    console.error('[queryCollections Error]', error);
    return DEFAULT_COLLECTIONS;
  }
}

async function queryCollectionBySlug(slug: string): Promise<Collection | null> {
  try {
    const cleanSlug = slug.toLowerCase().trim();
    const row = await prisma.collection.findFirst({ where: { slug: cleanSlug } });
    if (!row) {
      const fallback = DEFAULT_COLLECTIONS.find((c) => c.slug === cleanSlug);
      return fallback || null;
    }
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description || '',
      image: row.image || '',
      seo: (row.seo as any) ?? undefined,
    };
  } catch (error) {
    console.error('[queryCollectionBySlug Error]', error);
    return null;
  }
}

async function saveCollectionToDb(rawCollection: Collection): Promise<Collection> {
  const collection = await sanitizeObjectImages(rawCollection);
  try {
    await prisma.collection.deleteMany({
      where: { OR: [{ id: collection.id }, { slug: collection.slug }] },
    });
    await prisma.collection.create({
      data: {
        id: collection.id,
        slug: collection.slug,
        name: collection.name,
        description: collection.description || '',
        image: collection.image || '',
        seo: (collection.seo ?? null) as any,
      },
    });
  } catch (error) {
    console.error('[saveCollectionToDb Error]', error);
  }
  return collection;
}

async function deleteCollectionFromDb(idOrSlug: string): Promise<boolean> {
  try {
    await prisma.collection.deleteMany({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });
    return true;
  } catch (error) {
    console.error('[deleteCollectionFromDb Error]', error);
    return false;
  }
}

// -------------------------------------------------------------
// Route Handlers (Next.js App Router API)
// -------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (slug) {
      const collection = await queryCollectionBySlug(slug);
      if (!collection) {
        return NextResponse.json({ success: false, error: 'Collection not found' }, { status: 404, headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ success: true, collection, data: collection }, { headers: NO_CACHE_HEADERS });
    }

    const collections = await queryCollections();
    return NextResponse.json({ success: true, count: collections.length, collections, data: { collections } }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('[API /api/collections GET Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch collections', message: error?.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const collection = body.collection || body;

    if (!collection || !collection.name) {
      return NextResponse.json({ success: false, error: 'Collection name is required' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const saved = await saveCollectionToDb({
      id: collection.id || `col-${Date.now()}`,
      slug: collection.slug || collection.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: collection.name.trim(),
      description: collection.description || '',
      image: collection.image || '',
      seo: collection.seo || undefined,
    });

    const collections = await queryCollections();
    revalidatePath('/');
    revalidatePath('/shop');

    return NextResponse.json({ success: true, collection: saved, collections, data: saved }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('[API /api/collections POST Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to save collection', message: error?.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id') || searchParams.get('slug');

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id || body.slug;
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Collection ID or Slug required' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const success = await deleteCollectionFromDb(id);
    const collections = await queryCollections();
    revalidatePath('/');
    revalidatePath('/shop');

    return NextResponse.json({ success, message: success ? `Collection ${id} deleted` : `Failed to delete collection ${id}`, collections }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('[API /api/collections DELETE Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to delete collection', message: error?.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
