import { NextResponse } from 'next/server';
import { serverDb } from '@/lib/server-db';

// Force dynamic server rendering for API DB sync route
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = serverDb.getData();
    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve database state' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'updateInventory': {
        const { productId, size, newStock } = body;
        serverDb.updateInventory(productId, size, newStock);
        break;
      }
      case 'updateColorStock': {
        const { productId, colorName, newStock } = body;
        serverDb.updateColorStock(productId, colorName, newStock);
        break;
      }
      case 'saveProduct': {
        const { product } = body;
        if (product && product.id) {
          serverDb.saveProduct(product);
        }
        break;
      }
      case 'deleteProduct': {
        const { id } = body;
        if (id) {
          serverDb.deleteProduct(id);
        }
        break;
      }
      case 'saveCategory': {
        const { category } = body;
        if (category) {
          serverDb.saveCategory(category);
        }
        break;
      }
      case 'deleteCategory': {
        const { id } = body;
        if (id) {
          serverDb.deleteCategory(id);
        }
        break;
      }
      case 'deleteCollection': {
        const { id } = body;
        if (id) {
          serverDb.deleteCollection(id);
        }
        break;
      }
      case 'deleteCoupon': {
        const { code } = body;
        if (code) {
          serverDb.deleteCoupon(code);
        }
        break;
      }
      case 'deleteOrder': {
        const { id } = body;
        if (id) {
          serverDb.deleteOrder(id);
        }
        break;
      }
      case 'deleteReview': {
        const { productId, reviewId } = body;
        if (productId && reviewId) {
          serverDb.deleteReview(productId, reviewId);
        }
        break;
      }
      case 'updateCMS': {
        const { cms } = body;
        if (cms) {
          serverDb.updateCMS(cms);
        }
        break;
      }
      case 'createOrder': {
        const { order } = body;
        if (order) {
          serverDb.createOrder(order);
        }
        break;
      }
      case 'updateOrderStatus': {
        const { orderId, status } = body;
        if (orderId && status) {
          serverDb.updateOrderStatus(orderId, status);
        }
        break;
      }
      case 'syncFull': {
        const { data } = body;
        if (data) {
          serverDb.syncFullData(data);
        }
        break;
      }
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const updatedData = serverDb.getData();
    return NextResponse.json(
      { success: true, data: updatedData },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('[API /api/db POST Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process database mutation' },
      { status: 500 }
    );
  }
}
