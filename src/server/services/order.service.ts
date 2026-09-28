import { Order } from '@/types';
import { prisma } from '@/lib/prisma';
import { initializeMySqlTables } from '@/lib/mysql';

interface EntityCache<T> {
  data: T | null;
  fetchedAt: number;
  softTtlMs: number;
  hardTtlMs: number;
}

export class OrderService {
  private cache: EntityCache<Order[]> = {
    data: null,
    fetchedAt: 0,
    softTtlMs: 15000, // 15 seconds soft TTL
    hardTtlMs: 120000, // 2 minutes hard TTL
  };

  private inFlight: Promise<Order[]> | null = null;

  public invalidateCache(): void {
    this.cache.data = null;
    this.cache.fetchedAt = 0;
  }

  public async fetchOrders(): Promise<Order[]> {
    const now = Date.now();
    if (this.cache.data && now - this.cache.fetchedAt < this.cache.softTtlMs) {
      return this.cache.data;
    }

    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = (async () => {
      try {
        await initializeMySqlTables();
        const rows = await prisma.order.findMany({ orderBy: { createdAt: 'desc' } });

        const orders: Order[] = rows.map((r) => ({
          id: r.id,
          orderNumber: r.orderNumber,
          createdAt: r.createdAt || new Date().toISOString(),
          items: Array.isArray(r.items) ? (r.items as any) : [],
          subtotal: Number(r.subtotal || 0),
          discount: Number(r.discount || 0),
          shipping: Number(r.shipping || 0),
          total: Number(r.total || 0),
          paymentMethod: r.paymentMethod as any,
          paymentStatus: r.paymentStatus as any,
          orderStatus: r.orderStatus as any,
          customerName: r.customerName,
          customerEmail: r.customerEmail,
          customerMobile: r.customerMobile,
          shippingAddress: (r.shippingAddress as any) ?? undefined,
          estimatedDelivery: r.estimatedDelivery || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
          trackingNumber: r.trackingNumber || undefined,
        }));

        this.cache = {
          data: orders,
          fetchedAt: Date.now(),
          softTtlMs: 15000,
          hardTtlMs: 120000,
        };
        return orders;
      } catch (err: any) {
        console.error('[OrderService fetchOrders Error]', err?.message || err);
        return this.cache.data || [];
      } finally {
        this.inFlight = null;
      }
    })();

    return this.inFlight;
  }

  public async getOrderById(idOrNumber: string): Promise<Order | undefined> {
    const orders = await this.fetchOrders();
    return orders.find((o) => o.id === idOrNumber || o.orderNumber === idOrNumber);
  }

  public async createOrder(order: Order): Promise<Order> {
    this.invalidateCache();
    try {
      await initializeMySqlTables();
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
      console.log(`[OrderService] Successfully created order ${order.orderNumber}`);
    } catch (err: any) {
      console.error(`[OrderService] Error creating order ${order.orderNumber}:`, err?.message || err);
      throw err;
    }
    return order;
  }

  public async updateOrderStatus(orderId: string, status: Order['orderStatus']): Promise<Order | undefined> {
    this.invalidateCache();
    try {
      await initializeMySqlTables();
      await prisma.order.updateMany({
        where: { OR: [{ id: orderId }, { orderNumber: orderId }] },
        data: { orderStatus: status },
      });
      console.log(`[OrderService] Updated order status for ${orderId} to ${status}`);
      return this.getOrderById(orderId);
    } catch (err: any) {
      console.error(`[OrderService] Error updating order status for ${orderId}:`, err?.message || err);
      return undefined;
    }
  }

  public async deleteOrder(idOrNumber: string): Promise<boolean> {
    this.invalidateCache();
    try {
      await initializeMySqlTables();
      await prisma.order.deleteMany({
        where: { OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }] },
      });
      console.log(`[OrderService] Successfully deleted order ${idOrNumber}`);
      return true;
    } catch (err: any) {
      console.error(`[OrderService] Error deleting order ${idOrNumber}:`, err?.message || err);
      return false;
    }
  }
}

const globalOrderService = (globalThis as any).__orderService || new OrderService();
if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).__orderService = globalOrderService;
}

export const orderService = globalOrderService as OrderService;
