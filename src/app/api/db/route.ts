import { NextResponse } from 'next/server';
import { serverDb } from '@/lib/server-db';
import { connectToDatabase } from '@/lib/mongodb';

// Force dynamic server rendering for API DB sync route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await connectToDatabase();
    const data = await serverDb.getFreshData();
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
    await connectToDatabase();
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'updateInventory': {
        const { productId, size, newStock } = body;
        await serverDb.updateInventory(productId, size, newStock);
        break;
      }
      case 'updateColorStock': {
        const { productId, colorName, newStock } = body;
        await serverDb.updateColorStock(productId, colorName, newStock);
        break;
      }
      case 'saveProduct': {
        const { product } = body;
        if (product && product.id) {
          await serverDb.saveProduct(product);
        }
        break;
      }
      case 'deleteProduct': {
        const { id } = body;
        if (id) {
          await serverDb.deleteProduct(id);
        }
        break;
      }
      case 'saveCategory': {
        const { category } = body;
        if (category) {
          await serverDb.saveCategory(category);
        }
        break;
      }
      case 'deleteCategory': {
        const { id } = body;
        if (id) {
          await serverDb.deleteCategory(id);
        }
        break;
      }
      case 'saveCollection': {
        const { collection } = body;
        if (collection) {
          await serverDb.saveCollection(collection);
        }
        break;
      }
      case 'deleteCollection': {
        const { id } = body;
        if (id) {
          await serverDb.deleteCollection(id);
        }
        break;
      }
      case 'saveCoupon': {
        const { coupon } = body;
        if (coupon) {
          await serverDb.saveCoupon(coupon);
        }
        break;
      }
      case 'deleteCoupon': {
        const { code } = body;
        if (code) {
          await serverDb.deleteCoupon(code);
        }
        break;
      }
      case 'saveUser': {
        const { user } = body;
        if (user) {
          await serverDb.saveUser(user);
        }
        break;
      }
      case 'deleteUser': {
        const { id } = body;
        if (id) {
          await serverDb.deleteUser(id);
        }
        break;
      }
      case 'deleteOrder': {
        const { id } = body;
        if (id) {
          await serverDb.deleteOrder(id);
        }
        break;
      }
      case 'deleteReview': {
        const { productId, reviewId } = body;
        if (productId && reviewId) {
          await serverDb.deleteReview(productId, reviewId);
        }
        break;
      }
      case 'updateCMS': {
        const { cms } = body;
        if (cms) {
          await serverDb.updateCMS(cms);
        }
        break;
      }
      case 'createOrder': {
        const { order } = body;
        if (order) {
          await serverDb.createOrder(order);
        }
        break;
      }
      case 'updateOrderStatus': {
        const { orderId, status } = body;
        if (orderId && status) {
          await serverDb.updateOrderStatus(orderId, status);
        }
        break;
      }
      case 'syncFull': {
        const { data } = body;
        if (data) {
          await serverDb.syncFullData(data);
        }
        break;
      }
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const updatedData = await serverDb.getFreshData();
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
