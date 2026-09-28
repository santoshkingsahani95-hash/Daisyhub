import { NextResponse } from 'next/server';
import { collectionService } from '@/server/services';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (slug) {
      const collection = await collectionService.getCollectionBySlug(slug);
      if (!collection) {
        return NextResponse.json({ success: false, error: 'Collection not found' }, { status: 404, headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ success: true, collection, data: collection }, { headers: NO_CACHE_HEADERS });
    }

    const collections = await collectionService.fetchCollections();
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

    const saved = await collectionService.saveCollection({
      id: collection.id || `col-${Date.now()}`,
      slug: collection.slug || collection.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: collection.name.trim(),
      description: collection.description || '',
      image: collection.image || '',
      seo: collection.seo || undefined,
    });

    const collections = await collectionService.fetchCollections();
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

    const success = await collectionService.deleteCollection(id);
    return NextResponse.json({ success, message: success ? `Collection ${id} deleted` : `Failed to delete collection ${id}` }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('[API /api/collections DELETE Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to delete collection', message: error?.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
