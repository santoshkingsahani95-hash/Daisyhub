import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { serverDb } from '@/lib/server-db';

// Force dynamic server rendering for inventory API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {

    // 1. Fetch raw inventory documents from MySQL
    let rawInventory: any[] = await prisma.inventory.findMany({ orderBy: { updatedAt: 'desc' } });

    let docCount = rawInventory ? rawInventory.length : 0;

    // 2. If inventory is empty, auto-sync from products in 1 fast bulk operation
    if (docCount === 0) {
      console.log('[Inventory API] MySQL inventory table empty. Auto-syncing from products...');
      const products = await serverDb.getProducts();
      if (products && products.length > 0) {
        for (const prod of products) {
          const totalStock = prod.colors && prod.colors.length > 0
            ? prod.colors.reduce((sum: number, c: any) => sum + (typeof c.stock === 'number' ? c.stock : 0), 0)
            : (prod.sizes ? prod.sizes.reduce((sum: number, s: any) => sum + (s.stock || 0), 0) : 0);

          const data = {
            productId: prod.id,
            sku: prod.sku || 'N/A',
            productName: prod.name,
            category: prod.category || 'General',
            totalStock,
            isOutOfStock: totalStock <= 0,
            colors: (prod.colors || []) as any,
            sizes: (prod.sizes || []) as any,
            updatedAt: new Date().toISOString(),
          };

          await prisma.inventory.upsert({
            where: { id: `inv-${prod.id}` },
            update: data,
            create: { id: `inv-${prod.id}`, ...data },
          });
        }
        // Re-fetch raw inventory after sync
        rawInventory = await prisma.inventory.findMany({ orderBy: { updatedAt: 'desc' } });
      }
    }

    // 3. Retrieve fast cached product map via serverDb
    const freshData = await serverDb.getFreshData();
    const productsMap = new Map<string, any>();
    (freshData.products || []).forEach((p: any) => {
      if (p.id) productsMap.set(p.id, p);
    });

    // If rawInventory is still empty, synthesize inventory items directly from freshData.products!
    if ((!rawInventory || rawInventory.length === 0) && freshData.products && freshData.products.length > 0) {
      rawInventory = freshData.products.map((prod: any) => {
        const totalStock = prod.colors && prod.colors.length > 0
          ? prod.colors.reduce((sum: number, c: any) => sum + (typeof c.stock === 'number' ? c.stock : 0), 0)
          : (prod.sizes ? prod.sizes.reduce((sum: number, s: any) => sum + (s.stock || 0), 0) : 0);
        return {
          id: `inv-${prod.id}`,
          productId: prod.id,
          sku: prod.sku || 'N/A',
          productName: prod.name,
          category: prod.category || 'General',
          totalStock,
          isOutOfStock: totalStock <= 0,
          colors: prod.colors || [],
          sizes: prod.sizes || [],
          updatedAt: prod.createdAt || new Date().toISOString()
        };
      });
    }

    // 4. Safely map and serialize inventory records
    const formattedInventory = (rawInventory || []).map((item: any) => {
      const productId = item.productId || item.id;
      const matchedProd = productsMap.get(productId) || productsMap.get(item.id);
      const prodImages = matchedProd?.colors?.[0]?.images || [];
      const defaultImg = prodImages[0] || '';

      const itemColors = Array.isArray(item.colors) ? item.colors : [];
      const itemSizes = Array.isArray(item.sizes) ? item.sizes : [];

      const colors = itemColors.length > 0
        ? itemColors.map((c: any) => ({
            name: c.name || 'Default',
            code: c.code || '#111111',
            stock: typeof c.stock === 'number' ? c.stock : 0,
            images: Array.isArray(c.images) && c.images.length > 0 ? c.images : (prodImages.length > 0 ? prodImages : [])
          }))
        : (matchedProd?.colors || [
            { name: 'Default', code: '#111111', stock: Number(item.totalStock || 0), images: prodImages }
          ]);

      const sizes = itemSizes.length > 0
        ? itemSizes.map((s: any) => ({
            size: s.size || 'Free Size',
            stock: typeof s.stock === 'number' ? s.stock : 0,
            sku: s.sku || item.sku || 'N/A'
          }))
        : [{ size: 'Free Size', stock: Number(item.totalStock || 0), sku: item.sku || 'N/A' }];

      const computedTotalStock = colors.reduce((acc: number, c: any) => acc + (typeof c.stock === 'number' ? c.stock : 0), 0);
      const totalStock = typeof item.totalStock === 'number' && item.totalStock > 0 ? item.totalStock : computedTotalStock;

      return {
        _id: item.id,
        id: item.id || `inv-${productId}`,
        productId,
        productName: item.productName || matchedProd?.name || 'Unnamed Product',
        sku: item.sku || matchedProd?.sku || 'N/A',
        category: item.category || matchedProd?.category || 'General',
        totalStock,
        isOutOfStock: totalStock <= 0,
        colors,
        sizes,
        displayImage: colors[0]?.images?.[0] || defaultImg,
        createdAt: item.updatedAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString()
      };
    });

    return NextResponse.json(
      {
        success: true,
        database: 'MySQL',
        table: 'inventory',
        count: formattedInventory.length,
        data: formattedInventory,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error('[API /api/inventory GET Error]', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve inventory records from MySQL',
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;
    serverDb.invalidateCache('products');
    revalidatePath('/', 'layout');

    switch (action) {
      case 'updateColorStock': {
        const { productId, colorName, newStock } = body;
        await serverDb.updateColorStock(productId, colorName, newStock);
        break;
      }

      case 'updateSizeStock': {
        const { productId, size, newStock } = body;
        await serverDb.updateInventory(productId, size, newStock);
        break;
      }

      case 'deleteItem': {
        const { productId } = body;
        if (productId) {
          await serverDb.deleteProduct(productId);
        }
        break;
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid inventory action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Inventory updated successfully in MySQL' });
  } catch (error: any) {
    console.error('[API /api/inventory POST Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update inventory in MySQL', details: error?.message },
      { status: 500 }
    );
  }
}
