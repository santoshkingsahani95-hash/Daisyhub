import { NextResponse } from 'next/server';
import { executeQuery, initializeMySqlTables, parseJSON } from '@/lib/mysql';
import { serverDb } from '@/lib/server-db';
import { cachePrewarmer } from '@/lib/cache-prewarmer';

// Force dynamic server rendering for inventory API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await initializeMySqlTables();

    // 1. Fetch raw inventory documents from MySQL
    let rawInventory: any[] = await executeQuery('SELECT * FROM inventory ORDER BY updated_at DESC');

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

          await executeQuery(
            `INSERT INTO inventory (id, product_id, sku, product_name, category, total_stock, is_out_of_stock, colors, sizes, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               sku=VALUES(sku), product_name=VALUES(product_name), category=VALUES(category),
               total_stock=VALUES(total_stock), is_out_of_stock=VALUES(is_out_of_stock),
               colors=VALUES(colors), sizes=VALUES(sizes), updated_at=VALUES(updated_at);`,
            [
              `inv-${prod.id}`,
              prod.id,
              prod.sku || 'N/A',
              prod.name,
              prod.category || 'General',
              totalStock,
              totalStock <= 0 ? 1 : 0,
              JSON.stringify(prod.colors || []),
              JSON.stringify(prod.sizes || []),
              new Date().toISOString(),
            ]
          );
        }
        // Re-fetch raw inventory after sync
        rawInventory = await executeQuery('SELECT * FROM inventory ORDER BY updated_at DESC');
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
          product_id: prod.id,
          sku: prod.sku || 'N/A',
          product_name: prod.name,
          category: prod.category || 'General',
          total_stock: totalStock,
          is_out_of_stock: totalStock <= 0 ? 1 : 0,
          colors: JSON.stringify(prod.colors || []),
          sizes: JSON.stringify(prod.sizes || []),
          updated_at: prod.createdAt || new Date().toISOString()
        };
      });
    }

    // 4. Safely map and serialize MySQL inventory records
    const formattedInventory = (rawInventory || []).map((item: any) => {
      const productId = item.product_id || item.id;
      const matchedProd = productsMap.get(productId) || productsMap.get(item.id);
      const prodImages = matchedProd?.colors?.[0]?.images || [];
      const defaultImg = prodImages[0] || '';

      const itemColors = parseJSON(item.colors, []);
      const itemSizes = parseJSON(item.sizes, []);

      const colors = Array.isArray(itemColors) && itemColors.length > 0
        ? itemColors.map((c: any) => ({
            name: c.name || 'Default',
            code: c.code || '#111111',
            stock: typeof c.stock === 'number' ? c.stock : 0,
            images: Array.isArray(c.images) && c.images.length > 0 ? c.images : (prodImages.length > 0 ? prodImages : [])
          }))
        : (matchedProd?.colors || [
            { name: 'Default', code: '#111111', stock: Number(item.total_stock || 0), images: prodImages }
          ]);

      const sizes = Array.isArray(itemSizes) && itemSizes.length > 0
        ? itemSizes.map((s: any) => ({
            size: s.size || 'Free Size',
            stock: typeof s.stock === 'number' ? s.stock : 0,
            sku: s.sku || item.sku || 'N/A'
          }))
        : [{ size: 'Free Size', stock: Number(item.total_stock || 0), sku: item.sku || 'N/A' }];

      const computedTotalStock = colors.reduce((acc: number, c: any) => acc + (typeof c.stock === 'number' ? c.stock : 0), 0);
      const totalStock = typeof item.total_stock === 'number' && item.total_stock > 0 ? item.total_stock : computedTotalStock;

      return {
        _id: item.id,
        id: item.id || `inv-${productId}`,
        productId,
        productName: item.product_name || item.name || matchedProd?.name || 'Unnamed Product',
        sku: item.sku || matchedProd?.sku || 'N/A',
        category: item.category || matchedProd?.category || 'General',
        totalStock,
        isOutOfStock: totalStock <= 0,
        colors,
        sizes,
        displayImage: colors[0]?.images?.[0] || defaultImg,
        createdAt: item.updated_at || new Date().toISOString(),
        updatedAt: item.updated_at || new Date().toISOString()
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
    await initializeMySqlTables();
    const body = await request.json();
    const { action } = body;
    serverDb.invalidateCache('products');
    cachePrewarmer.triggerWarmupDebounced();

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
