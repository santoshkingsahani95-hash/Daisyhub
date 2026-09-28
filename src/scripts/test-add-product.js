const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        process.env[k.trim()] = v.join('=').trim();
      }
    });
  }
} catch (e) {}

const { initializeMySqlTables, executeQuery } = require('../lib/mysql');

async function testAddProduct() {
  console.log('🚀 Initializing database tables...');
  await initializeMySqlTables();

  const testProduct = {
    id: `prod_test_${Date.now()}`,
    slug: `test-product-${Date.now()}`,
    name: 'Test Ace Garment Silk Top',
    description: 'High quality test top',
    category: 'tops',
    price: 2499,
    salePrice: 1999,
    sku: `SKU-${Date.now()}`,
  };

  console.log('🚀 Testing fast product save...');
  const startTime = Date.now();

  try {
    await executeQuery(`DELETE FROM products WHERE id = ? OR slug = ?`, [testProduct.id, testProduct.slug]);
    await executeQuery(
      `INSERT INTO products (id, slug, name, description, category, price, sale_price, sku) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [testProduct.id, testProduct.slug, testProduct.name, testProduct.description, testProduct.category, testProduct.price, testProduct.salePrice, testProduct.sku]
    );

    const fetchRes = await executeQuery(`SELECT * FROM products WHERE id = ?`, [testProduct.id]);
    const duration = Date.now() - startTime;

    console.log(`✅ SUCCESS! Product added and retrieved in ${duration}ms!`);
    console.log('Saved Product Details:', fetchRes[0]);
  } catch (err) {
    console.error('❌ Failed to add test product:', err);
  }
}

testAddProduct();
