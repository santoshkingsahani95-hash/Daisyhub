import { NextResponse } from 'next/server';
import { orderService } from '@/server/services';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

/**
 * GET /api/orders
 * Query Params:
 * - id: string (optional - return single order)
 * - email: string (optional - filter by customer email)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');

    if (id) {
      const order = await orderService.getOrderById(id);
      if (!order) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404, headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ success: true, order, data: order }, { headers: NO_CACHE_HEADERS });
    }

    let orders = await orderService.fetchOrders();
    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      orders = orders.filter((o) => (o.customerEmail || '').toLowerCase() === cleanEmail);
    }

    return NextResponse.json(
      { success: true, count: orders.length, orders, data: { orders } },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('[API /api/orders GET Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders', message: error?.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * POST /api/orders
 * Create new order
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const order = body.order || body;

    if (!order || !order.customerName || !order.customerMobile) {
      return NextResponse.json(
        { success: false, error: 'Invalid order payload. Customer details required.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const created = await orderService.createOrder(order);
    return NextResponse.json(
      { success: true, order: created, data: created },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('[API /api/orders POST Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order', message: error?.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * PATCH /api/orders
 * Update order status
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, error: 'orderId and status are required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const updated = await orderService.updateOrderStatus(orderId, status);
    return NextResponse.json(
      { success: !!updated, order: updated, data: updated },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('[API /api/orders PATCH Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order', message: error?.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * DELETE /api/orders?id=...
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const success = await orderService.deleteOrder(id);
    return NextResponse.json(
      { success, message: success ? `Order ${id} deleted` : `Failed to delete order ${id}` },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('[API /api/orders DELETE Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete order', message: error?.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
