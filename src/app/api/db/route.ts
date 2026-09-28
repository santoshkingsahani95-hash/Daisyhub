import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  getFreshData,
  syncFullData,
  updateInventory,
  updateColorStock,
  saveProduct,
  deleteProduct,
  getProducts,
  saveCategory,
  deleteCategory,
  getCategories,
  saveCollection,
  deleteCollection,
  getCollections,
  saveCoupon,
  deleteCoupon,
  saveUser,
  deleteUser,
  saveOrder,
  deleteOrder,
  deleteReview,
  updateCMS,
  getCMS,
  updateDeliveryRates,
  updateOrderStatus,
} from '@/lib/db-queries';

// Force dynamic server rendering for API DB sync route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  try {
    const data = await getFreshData();
    return NextResponse.json(
      { success: true, data },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve database state' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;
    revalidatePath('/', 'layout');

    switch (action) {
      case 'updateInventory': {
        const { productId, size, newStock } = body;
        await updateInventory(productId, size, newStock);
        break;
      }
      case 'updateColorStock': {
        const { productId, colorName, newStock } = body;
        await updateColorStock(productId, colorName, newStock);
        break;
      }
      case 'saveProduct': {
        const { product } = body;
        if (product && product.id) {
          await saveProduct(product);
        }
        break;
      }
      case 'deleteProduct': {
        const { id } = body;
        if (id) {
          await deleteProduct(id);
        }
        break;
      }
      case 'saveCategory': {
        const { category } = body;
        if (category) {
          await saveCategory(category);
        }
        break;
      }
      case 'deleteCategory': {
        const { id } = body;
        if (id) {
          await deleteCategory(id);
        }
        break;
      }
      case 'saveCollection': {
        const { collection } = body;
        if (collection) {
          await saveCollection(collection);
        }
        break;
      }
      case 'deleteCollection': {
        const { id } = body;
        if (id) {
          await deleteCollection(id);
        }
        break;
      }
      case 'saveCoupon': {
        const { coupon } = body;
        if (coupon) {
          await saveCoupon(coupon);
        }
        break;
      }
      case 'deleteCoupon': {
        const { code } = body;
        if (code) {
          await deleteCoupon(code);
        }
        break;
      }
      case 'saveUser': {
        const { user } = body;
        if (user) {
          await saveUser(user);
        }
        break;
      }
      case 'deleteUser': {
        const { id } = body;
        if (id) {
          await deleteUser(id);
        }
        break;
      }
      case 'deleteOrder': {
        const { id } = body;
        if (id) {
          await deleteOrder(id);
        }
        break;
      }
      case 'deleteReview': {
        const { productId, reviewId } = body;
        if (productId && reviewId) {
          await deleteReview(productId, reviewId);
        }
        break;
      }
      case 'updateCMS': {
        const { cms } = body;
        if (cms) {
          await updateCMS(cms);
        }
        break;
      }
      case 'updateDeliveryRates': {
        const { rates } = body;
        if (rates && Array.isArray(rates)) {
          await updateDeliveryRates(rates);
        }
        break;
      }
      case 'createOrder': {
        const { order } = body;
        if (order) {
          await saveOrder(order);
        }
        break;
      }
      case 'updateOrderStatus': {
        const { orderId, status } = body;
        if (orderId && status) {
          await updateOrderStatus(orderId, status);
        }
        break;
      }
      case 'syncFull': {
        const { data } = body;
        if (data) {
          await syncFullData(data);
        }
        break;
      }
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    let responseData: any = null;
    if (['saveProduct', 'deleteProduct'].includes(action)) {
      responseData = { products: await getProducts() };
    } else if (['saveCategory', 'deleteCategory'].includes(action)) {
      responseData = { categories: await getCategories() };
    } else if (['saveCollection', 'deleteCollection'].includes(action)) {
      responseData = { collections: await getCollections() };
    } else if (action === 'updateCMS') {
      responseData = { cms: await getCMS() };
    } else {
      responseData = await getFreshData();
    }

    return NextResponse.json(
      { success: true, data: responseData },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API /api/db POST Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process database mutation' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

