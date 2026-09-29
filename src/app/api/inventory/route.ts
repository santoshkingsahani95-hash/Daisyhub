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
    // Read products directly from MySQL (inventory is tracked directly on Product)
    const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });

    // Format products into inventory view records
    const formattedInventory = products.map((prod: any) => {
      const prodColors = Array.isArray(prod.colors) ? (prod.colors as any[]) : [];
      const prodSizes = Array.isArray(prod.sizes) ? (prod.sizes as any[]) : [];
      const prodImages = prodColors[0]?.images || [];
      const defaultImg = prodImages[0] || '';

      const colors = prodColors.length > 0
        ? prodColors.map((c: any) => ({
            name: c.name || 'Default',
            code: c.code || '#111111',
            stock: typeof c.stock === 'number' ? c.stock : 0,
            images: Array.isArray(c.images) && c.images.length > 0 ? c.images : (prodImages.length > 0 ? prodImages : [])
          }))
        : [
            { name: 'Default', code: '#111111', stock: Number(prod.stockQuantity || 0), images: prodImages }
          ];

      const sizes = prodSizes.length > 0
        ? prodSizes.map((s: any) => ({
            size: s.size || 'Free Size',
            stock: typeof s.stock === 'number' ? s.stock : 0,
            sku: s.sku || prod.sku || 'N/A'
          }))
        : [{ size: 'Free Size', stock: Number(prod.stockQuantity || 0), sku: prod.sku || 'N/A' }];

      const computedStock = colors.reduce((acc: number, c: any) => acc + (typeof c.stock === 'number' ? c.stock : 0), 0);
      const totalStock = typeof prod.stockQuantity === 'number' ? prod.stockQuantity : computedStock;

      return {
        _id: prod.id,
        id: `inv-${prod.id}`,
        productId: prod.id,
        productName: prod.name || 'Unnamed Product',
        sku: prod.sku || 'N/A',
        category: prod.category || 'General',
        totalStock,
        stockQuantity: totalStock,
        isOutOfStock: totalStock <= 0,
        colors,
        sizes,
        displayImage: colors[0]?.images?.[0] || defaultImg,
        createdAt: prod.createdAt || new Date().toISOString(),
        updatedAt: prod.updatedAt ? new Date(prod.updatedAt).toISOString() : new Date().toISOString()
      };
    });

    return NextResponse.json(
      {
        success: true,
        database: 'MySQL',
        table: 'products',
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
        error: 'Failed to retrieve inventory records from MySQL products table',
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
              stockQuantity: totalColorStock,
              isOutOfStock: totalColorStock <= 0,
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
              stockQuantity: totalSizeStock,
              isOutOfStock: totalSizeStock <= 0,
            },
          });
        }
        break;
      }

      case 'deleteItem': {
        await prisma.product.deleteMany({ where: { id: productId } });
        break;
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid inventory action' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ success: true, message: 'Stock updated directly on Product in MySQL' }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('[API /api/inventory POST Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update stock in MySQL', details: error?.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
