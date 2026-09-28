import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  try {
    // 1. Fetch raw inventory documents from MySQL
    let rawInventory: any[] = await prisma.inventory.findMany({ orderBy: { updatedAt: 'desc' } });

    // 2. Fetch products to sync or join
    const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });

    // If inventory is empty, auto-sync from products in 1 fast bulk operation
    if (rawInventory.length === 0 && products.length > 0) {
      for (const prod of products) {
        const prodColors = Array.isArray(prod.colors) ? (prod.colors as any[]) : [];
        const prodSizes = Array.isArray(prod.sizes) ? (prod.sizes as any[]) : [];

        const totalStock = prodColors.length > 0
          ? prodColors.reduce((sum: number, c: any) => sum + (typeof c.stock === 'number' ? c.stock : 0), 0)
          : prodSizes.reduce((sum: number, s: any) => sum + (s.stock || 0), 0);

        const data = {
          productId: prod.id,
          sku: prod.sku || 'N/A',
          productName: prod.name,
          category: prod.category || 'General',
          totalStock,
          isOutOfStock: totalStock <= 0,
          colors: prodColors as any,
          sizes: prodSizes as any,
          updatedAt: new Date().toISOString(),
        };

        await prisma.inventory.upsert({
          where: { id: `inv-${prod.id}` },
          update: data,
          create: { id: `inv-${prod.id}`, ...data },
        });
      }
      rawInventory = await prisma.inventory.findMany({ orderBy: { updatedAt: 'desc' } });
    }

    const productsMap = new Map<string, any>();
    products.forEach((p) => {
      productsMap.set(p.id, p);
    });

    // Format inventory records
    const formattedInventory = (rawInventory || []).map((item: any) => {
      const productId = item.productId || item.id;
      const matchedProd = productsMap.get(productId) || productsMap.get(item.id);
      const prodColors = Array.isArray(matchedProd?.colors) ? matchedProd.colors : [];
      const prodImages = prodColors[0]?.images || [];
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
        : (prodColors.length > 0 ? prodColors : [
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
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('[API /api/inventory GET Error]', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve inventory records from MySQL',
        details: error?.message || String(error),
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, productId } = body;
    revalidatePath('/', 'layout');

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product ID required' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const prod = await prisma.product.findFirst({ where: { id: productId } });

    switch (action) {
      case 'updateColorStock': {
        const { colorName, newStock } = body;
        const cleanStock = isNaN(Number(newStock)) ? 0 : Math.max(0, Math.min(999, Math.floor(Number(newStock))));

        if (prod) {
          const colors = Array.isArray(prod.colors) ? (prod.colors as any[]) : [];
          const targetColor = colors.find((c: any) => (c.name || '').toLowerCase() === (colorName || '').toLowerCase());
          if (targetColor) {
            targetColor.stock = cleanStock;
          }
          const totalColorStock = colors.reduce((acc: number, c: any) => acc + (typeof c.stock === 'number' ? c.stock : 0), 0);
          await prisma.product.update({
            where: { id: productId },
            data: {
              colors: colors as any,
              isOutOfStock: totalColorStock <= 0,
            },
          });
          await prisma.inventory.updateMany({
            where: { OR: [{ productId }, { id: `inv-${productId}` }] },
            data: {
              colors: colors as any,
              totalStock: totalColorStock,
              isOutOfStock: totalColorStock <= 0,
              updatedAt: new Date().toISOString(),
            },
          });
        }
        break;
      }

      case 'updateSizeStock': {
        const { size, newStock } = body;
        const cleanStock = isNaN(Number(newStock)) ? 0 : Math.max(0, Math.min(999, Math.floor(Number(newStock))));

        if (prod) {
          let sizes = Array.isArray(prod.sizes) ? (prod.sizes as any[]) : [];
          const existingSize = sizes.find((s: any) => s.size === size);
          if (existingSize) {
            existingSize.stock = cleanStock;
          } else {
            sizes = sizes.map((s: any) => ({ ...s, stock: cleanStock }));
          }
          const totalSizeStock = sizes.reduce((sum: number, s: any) => sum + (s.stock || 0), 0);
          await prisma.product.update({
            where: { id: productId },
            data: {
              sizes: sizes as any,
              isOutOfStock: totalSizeStock <= 0,
            },
          });
          await prisma.inventory.updateMany({
            where: { OR: [{ productId }, { id: `inv-${productId}` }] },
            data: {
              sizes: sizes as any,
              totalStock: totalSizeStock,
              isOutOfStock: totalSizeStock <= 0,
              updatedAt: new Date().toISOString(),
            },
          });
        }
        break;
      }

      case 'deleteItem': {
        await prisma.product.deleteMany({ where: { id: productId } });
        await prisma.inventory.deleteMany({ where: { OR: [{ productId }, { id: `inv-${productId}` }] } });
        await prisma.photoGallery.deleteMany({ where: { productId } });
        break;
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid inventory action' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ success: true, message: 'Inventory updated successfully in MySQL' }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('[API /api/inventory POST Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update inventory in MySQL', details: error?.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
