import { NextResponse } from 'next/server';
import { productService } from '@/server/services';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

/**
 * GET /api/products/[id]
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    let product = await productService.getProductById(id);
    if (!product) {
      product = await productService.getProductBySlug(id);
    }

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

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
    const body = await request.json();
    const productData = { ...body, id: params.id };

    const saved = await productService.saveProduct(productData);
    return NextResponse.json(
      { success: true, product: saved, data: saved },
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
    const success = await productService.deleteProduct(id);
    return NextResponse.json(
      { success, message: success ? `Product ${id} deleted` : `Failed to delete product ${id}` },
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
