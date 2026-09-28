import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Order } from '@/types';

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

async function queryOrders(): Promise<Order[]> {
  try {
    const rows = await prisma.order.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((r) => ({
      id: r.id,
      orderNumber: r.orderNumber,
      createdAt: r.createdAt || new Date().toISOString(),
      items: Array.isArray(r.items) ? (r.items as any) : [],
      subtotal: Number(r.subtotal || 0),
      discount: Number(r.discount || 0),
      shipping: Number(r.shipping || 0),
      total: Number(r.total || 0),
      paymentMethod: r.paymentMethod as any,
      paymentStatus: (r.paymentStatus as any) || 'pending',
      orderStatus: (r.orderStatus as any) || 'Pending',
      customerName: r.customerName,
      customerEmail: r.customerEmail,
      customerMobile: r.customerMobile,
      shippingAddress: (r.shippingAddress as any) || {
        fullName: r.customerName,
        mobile: r.customerMobile,
        email: r.customerEmail,
        province: 'Bagmati',
        district: 'Kathmandu',
        city: 'Kathmandu',
        streetAddress: 'Kathmandu',
      },
      estimatedDelivery: r.estimatedDelivery || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      trackingNumber: r.trackingNumber || undefined,
    }));
  } catch (error) {
    console.error('[queryOrders Error]', error);
    return [];
  }
}

async function queryOrderById(idOrNumber: string): Promise<Order | null> {
  try {
    const r = await prisma.order.findFirst({
      where: { OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }] },
    });
    if (!r) return null;
    return {
      id: r.id,
      orderNumber: r.orderNumber,
      createdAt: r.createdAt || new Date().toISOString(),
      items: Array.isArray(r.items) ? (r.items as any) : [],
      subtotal: Number(r.subtotal || 0),
      discount: Number(r.discount || 0),
      shipping: Number(r.shipping || 0),
      total: Number(r.total || 0),
      paymentMethod: r.paymentMethod as any,
      paymentStatus: (r.paymentStatus as any) || 'pending',
      orderStatus: (r.orderStatus as any) || 'Pending',
      customerName: r.customerName,
      customerEmail: r.customerEmail,
      customerMobile: r.customerMobile,
      shippingAddress: (r.shippingAddress as any) || {
        fullName: r.customerName,
        mobile: r.customerMobile,
        email: r.customerEmail,
        province: 'Bagmati',
        district: 'Kathmandu',
        city: 'Kathmandu',
        streetAddress: 'Kathmandu',
      },
      estimatedDelivery: r.estimatedDelivery || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      trackingNumber: r.trackingNumber || undefined,
    };
  } catch (error) {
    console.error('[queryOrderById Error]', error);
    return null;
  }
}

async function updateOrderStatusInDb(orderId: string, status: Order['orderStatus']): Promise<Order | null> {
  try {
    await prisma.order.updateMany({
      where: { OR: [{ id: orderId }, { orderNumber: orderId }] },
      data: { orderStatus: status },
    });
    return queryOrderById(orderId);
  } catch (error) {
    console.error('[updateOrderStatusInDb Error]', error);
    return null;
  }
}

async function saveOrderToDb(order: Order): Promise<Order> {
  try {
    await prisma.order.deleteMany({
      where: { OR: [{ id: order.id }, { orderNumber: order.orderNumber }] },
    });
    await prisma.order.create({
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt || new Date().toISOString(),
        items: (order.items || []) as any,
        subtotal: order.subtotal,
        discount: order.discount || 0,
        shipping: order.shipping || 0,
        total: order.total,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus || 'pending',
        orderStatus: order.orderStatus || 'Pending',
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerMobile: order.customerMobile,
        shippingAddress: (order.shippingAddress ?? null) as any,
        estimatedDelivery: order.estimatedDelivery || null,
        trackingNumber: order.trackingNumber || null,
      },
    });
  } catch (error) {
    console.error('[saveOrderToDb Error]', error);
    throw error;
  }
  return order;
}

async function deleteOrderFromDb(idOrNumber: string): Promise<boolean> {
  try {
    await prisma.order.deleteMany({
      where: { OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }] },
    });
    return true;
  } catch (error) {
    console.error('[deleteOrderFromDb Error]', error);
    return false;
  }
}

// -------------------------------------------------------------
// Route Handlers (Next.js App Router API)
// -------------------------------------------------------------

/**
 * GET /api/orders
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');

    if (id) {
      const order = await queryOrderById(id);
      if (!order) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404, headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ success: true, order, data: order }, { headers: NO_CACHE_HEADERS });
    }

    let orders = await queryOrders();
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

    const created = await saveOrderToDb(order);
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

    const updated = await updateOrderStatusInDb(orderId, status);
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

    const success = await deleteOrderFromDb(id);
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
