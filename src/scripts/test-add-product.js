const http = require('http');

const testProduct = {
  id: `prod-test-${Date.now()}`,
  slug: `test-product-${Date.now()}`,
  name: `Test Garment ${new Date().toLocaleTimeString()}`,
  description: 'Test product creation verification',
  details: ['100% Organic Cotton', 'Premium Quality'],
  fabricCare: 'Hand wash cold',
  category: 'tops',
  collections: ['new-arrivals'],
  price: 1500,
  salePrice: 1200,
  discountPercentage: 20,
  rating: 5.0,
  reviewCount: 1,
  isTrending: true,
  isNewArrival: true,
  isBestSeller: false,
  isSale: true,
  isOutOfStock: false,
  colors: [
    {
      name: 'Black',
      code: '#111111',
      images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000'],
      sizes: [{ size: 'Free Size', stock: 25 }],
    },
  ],
  sizes: [{ size: 'Free Size', stock: 25 }],
  sku: `SKU-${Date.now()}`,
  reviews: [],
  insideValleyFee: 100,
  outsideValleyFee: 200,
  isFreeDelivery: false,
};

const postData = JSON.stringify({
  action: 'saveProduct',
  product: testProduct,
});

const req = http.request(
  'http://localhost:3000/api/db',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  },
  (res) => {
    let body = '';
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => {
      console.log('STATUS:', res.statusCode);
      try {
        const parsed = JSON.parse(body);
        console.log('API RESPONSE SUCCESS:', parsed.success);
        console.log('TOTAL PRODUCTS AFTER ADD:', parsed.data?.products?.length || 0);
        const added = parsed.data?.products?.find((p) => p.id === testProduct.id);
        if (added) {
          console.log('✅ TEST PRODUCT SUCCESSFULLY CREATED AND RETURNED:', added.name);
        } else {
          console.log('⚠️ Product not found in returned list');
        }
      } catch (e) {
        console.error('Response parse error:', body);
      }
    });
  }
);

req.on('error', (err) => {
  console.error('HTTP Request Error (Is localhost:3000 running?):', err.message);
});

req.write(postData);
req.end();
