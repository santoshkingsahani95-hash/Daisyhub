import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { InventoryModel, ProductModel } from '@/models';

// Force dynamic server rendering for inventory API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const conn = await connectToDatabase();
    const dbName = conn?.connection?.db?.databaseName || 'ace-garment';
    const collectionName = 'inventory';

    console.log('[Inventory API] Connecting to database:', dbName);
    console.log('[Inventory API] Using collection:', collectionName);

    // 1. Fetch all raw inventory documents from MongoDB Atlas
    let rawInventory = await InventoryModel.find({}).sort({ updatedAt: -1, createdAt: -1 }).lean();

    // Fallback directly to native driver if Mongoose model returns empty
    if ((!rawInventory || rawInventory.length === 0) && conn && conn.connection && conn.connection.db) {
      rawInventory = await conn.connection.db.collection(collectionName).find({}).toArray();
    }

    const docCount = rawInventory ? rawInventory.length : 0;
    console.log('[Inventory API] Inventory count:', docCount);

    if (docCount > 0) {
      const sample = rawInventory[0];
      console.log('[Inventory API] Inventory sample product:', sample?.productName || sample?.name, '| SKU:', sample?.sku);
    }

    // 2. If inventory is empty, auto-sync from products collection to populate inventory
    if (docCount === 0 && conn && conn.connection && conn.connection.db) {
      console.log('[Inventory API] Inventory collection empty. Checking products collection for auto-sync...');
      const products = await ProductModel.find({}).lean();
      if (products && products.length > 0) {
        for (const prod of products) {
          const totalStock = prod.colors && prod.colors.length > 0
            ? prod.colors.reduce((sum: number, c: any) => sum + (typeof c.stock === 'number' ? c.stock : 0), 0)
            : (prod.sizes ? prod.sizes.reduce((sum: number, s: any) => sum + (s.stock || 0), 0) : 0);

          const invDoc = {
            id: `inv-${prod.id}`,
            productId: prod.id,
            sku: prod.sku,
            productName: prod.name,
            category: prod.category,
            totalStock,
            isOutOfStock: totalStock <= 0,
            colors: prod.colors || [],
            sizes: prod.sizes || [],
            createdAt: prod.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await InventoryModel.findOneAndUpdate({ productId: prod.id }, invDoc, { upsert: true, new: true });
        }
        rawInventory = await InventoryModel.find({}).sort({ updatedAt: -1, createdAt: -1 }).lean();
      }
    }

    // 3. Fetch products to enrich inventory with product image thumbnails if color images are missing
    const productsMap = new Map<string, any>();
    try {
      const allProds = await ProductModel.find({}).lean();
      (allProds || []).forEach((p: any) => {
        if (p.id) productsMap.set(p.id, p);
      });
    } catch (e) {
      console.warn('[Inventory API] Warning fetching products map for images:', e);
    }

    // 4. Safely map and serialize MongoDB documents (converting ObjectId to String)
    const formattedInventory = (rawInventory || []).map((item: any) => {
      const matchedProd = productsMap.get(item.productId) || productsMap.get(item.id);
      const prodImages = matchedProd?.colors?.[0]?.images || [];
      const defaultImg = prodImages[0] || '';

      const colors = Array.isArray(item.colors) && item.colors.length > 0
        ? item.colors.map((c: any) => ({
            _id: c._id ? c._id.toString() : undefined,
            name: c.name || 'Default',
            code: c.code || '#111111',
            stock: typeof c.stock === 'number' ? c.stock : 0,
            images: Array.isArray(c.images) && c.images.length > 0 ? c.images : (prodImages.length > 0 ? prodImages : [])
          }))
        : (matchedProd?.colors || [
            { name: 'Default', code: '#111111', stock: item.totalStock || 0, images: prodImages }
          ]);

      const sizes = Array.isArray(item.sizes) && item.sizes.length > 0
        ? item.sizes.map((s: any) => ({
            _id: s._id ? s._id.toString() : undefined,
            size: s.size || 'Free Size',
            stock: typeof s.stock === 'number' ? s.stock : 0,
            sku: s.sku || item.sku || 'N/A'
          }))
        : [{ size: 'Free Size', stock: item.totalStock || 0, sku: item.sku || 'N/A' }];

      const computedTotalStock = colors.reduce((acc: number, c: any) => acc + (typeof c.stock === 'number' ? c.stock : 0), 0);
      const totalStock = typeof item.totalStock === 'number' && item.totalStock > 0 ? item.totalStock : computedTotalStock;

      return {
        _id: item._id ? item._id.toString() : item.id,
        id: item.id || `inv-${item.productId || Date.now()}`,
        productId: item.productId || item.id,
        productName: item.productName || item.name || matchedProd?.name || 'Unnamed Product',
        sku: item.sku || matchedProd?.sku || 'N/A',
        category: item.category || matchedProd?.category || 'General',
        totalStock,
        isOutOfStock: totalStock <= 0,
        colors,
        sizes,
        displayImage: colors[0]?.images?.[0] || defaultImg,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString()
      };
    });

    return NextResponse.json(
      {
        success: true,
        database: dbName,
        collection: collectionName,
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
        error: 'Failed to retrieve inventory records from MongoDB Atlas',
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const conn = await connectToDatabase();
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'updateColorStock': {
        const { productId, colorName, newStock } = body;
        const cleanStock = isNaN(Number(newStock)) ? 0 : Math.max(0, Math.min(999, Math.floor(Number(newStock))));

        // Update InventoryModel
        const invDoc = await InventoryModel.findOne({ $or: [{ productId }, { id: productId }] });
        if (invDoc) {
          if (invDoc.colors && invDoc.colors.length > 0) {
            const targetColor = invDoc.colors.find((c: any) => c.name.toLowerCase() === colorName.toLowerCase());
            if (targetColor) {
              targetColor.stock = cleanStock;
            }
          }
          const totalColorStock = invDoc.colors.reduce((sum: number, c: any) => sum + (typeof c.stock === 'number' ? c.stock : 0), 0);
          invDoc.totalStock = totalColorStock;
          invDoc.isOutOfStock = totalColorStock <= 0;
          invDoc.sizes = [{ size: 'Free Size', stock: totalColorStock, sku: invDoc.sku }];
          invDoc.updatedAt = new Date().toISOString();
          await invDoc.save();

          if (conn && conn.connection && conn.connection.db) {
            await conn.connection.db.collection('inventory').updateOne(
              { $or: [{ productId }, { id: productId }] },
              { $set: { colors: invDoc.colors, totalStock: totalColorStock, isOutOfStock: totalColorStock <= 0, sizes: invDoc.sizes, updatedAt: invDoc.updatedAt } }
            );
          }
        }

        // Also update ProductModel to keep products and inventory in sync
        const prodDoc = await ProductModel.findOne({ id: productId });
        if (prodDoc) {
          if (prodDoc.colors && prodDoc.colors.length > 0) {
            const targetColor = prodDoc.colors.find((c: any) => c.name.toLowerCase() === colorName.toLowerCase());
            if (targetColor) {
              targetColor.stock = cleanStock;
            }
          }
          const totalColorStock = prodDoc.colors.reduce((sum: number, c: any) => sum + (typeof c.stock === 'number' ? c.stock : 0), 0);
          prodDoc.sizes = [{ size: 'Free Size', stock: totalColorStock, sku: prodDoc.sku }];
          prodDoc.isOutOfStock = totalColorStock <= 0;
          await prodDoc.save();

          if (conn && conn.connection && conn.connection.db) {
            await conn.connection.db.collection('products').updateOne(
              { id: productId },
              { $set: { colors: prodDoc.colors, sizes: prodDoc.sizes, isOutOfStock: prodDoc.isOutOfStock } }
            );
          }
        }
        break;
      }

      case 'updateSizeStock': {
        const { productId, size, newStock } = body;
        const cleanStock = isNaN(Number(newStock)) ? 0 : Math.max(0, Math.min(999, Math.floor(Number(newStock))));

        const invDoc = await InventoryModel.findOne({ $or: [{ productId }, { id: productId }] });
        if (invDoc) {
          if (invDoc.sizes && invDoc.sizes.length > 0) {
            const existingSize = invDoc.sizes.find((s: any) => s.size === size);
            if (existingSize) {
              existingSize.stock = cleanStock;
            }
          }
          const totalStock = invDoc.sizes.reduce((sum: number, s: any) => sum + (typeof s.stock === 'number' ? s.stock : 0), 0);
          invDoc.totalStock = totalStock;
          invDoc.isOutOfStock = totalStock <= 0;
          invDoc.updatedAt = new Date().toISOString();
          await invDoc.save();
        }
        break;
      }

      case 'deleteItem': {
        const { productId } = body;
        if (productId) {
          await InventoryModel.deleteOne({ $or: [{ productId }, { id: productId }] });
          await ProductModel.deleteOne({ id: productId });
          if (conn && conn.connection && conn.connection.db) {
            await conn.connection.db.collection('inventory').deleteOne({ $or: [{ productId }, { id: productId }] });
            await conn.connection.db.collection('products').deleteOne({ id: productId });
          }
        }
        break;
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid inventory action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Inventory updated successfully' });
  } catch (error: any) {
    console.error('[API /api/inventory POST Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update inventory in MongoDB Atlas', details: error?.message },
      { status: 500 }
    );
  }
}
