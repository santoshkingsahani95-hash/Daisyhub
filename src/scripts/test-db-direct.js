const { serverDb } = require('../../src/lib/server-db');

async function testDirectSave() {
  console.log('Testing direct serverDb.saveProduct()...');
  const testProd = {
    id: `prod-direct-${Date.now()}`,
    slug: `test-direct-${Date.now()}`,
    name: `Direct Test Product ${new Date().toLocaleTimeString()}`,
    description: 'Testing direct save',
    category: 'tops',
    collections: [],
    price: 1999,
    rating: 5,
    reviewCount: 0,
    isTrending: false,
    isNewArrival: true,
    isBestSeller: false,
    isSale: false,
    isOutOfStock: false,
    colors: [{ name: 'Black', code: '#111111', images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f'], stock: 10 }],
    sizes: [{ size: 'Free Size', stock: 10 }],
    sku: `SKU-DIRECT-${Date.now()}`,
    reviews: [],
    insideValleyFee: 100,
    outsideValleyFee: 200,
    isFreeDelivery: false,
  };

  try {
    const saved = await serverDb.saveProduct(testProd);
    console.log('✅ SAVED SUCCESSFULLY:', saved.name);

    const fresh = await serverDb.getFreshData(true);
    console.log('TOTAL PRODUCTS IN DB:', fresh.products.length);
  } catch (err) {
    console.error('❌ DIRECT SAVE ERROR:', err);
  }
}

testDirectSave();
