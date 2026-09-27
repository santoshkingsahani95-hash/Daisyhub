const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.cwd(), 'database.sqlite');
console.log(`🔌 Initializing local SQL Database at '${dbPath}'...`);

const db = new sqlite3.Database(dbPath);

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function createAllTables() {
  try {
    console.log(`🚀 Creating all 9 SQL Database tables...`);

    // 1. Products Table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        details TEXT,
        fabric_care TEXT,
        category TEXT NOT NULL,
        subcategory TEXT,
        collections TEXT,
        price REAL NOT NULL,
        sale_price REAL,
        discount_percentage INTEGER,
        rating REAL DEFAULT 4.8,
        review_count INTEGER DEFAULT 0,
        is_trending INTEGER DEFAULT 0,
        is_new_arrival INTEGER DEFAULT 0,
        is_best_seller INTEGER DEFAULT 0,
        is_sale INTEGER DEFAULT 0,
        is_out_of_stock INTEGER DEFAULT 0,
        colors TEXT,
        sizes TEXT,
        sku TEXT NOT NULL,
        reviews TEXT,
        inside_valley_fee REAL DEFAULT 100.00,
        outside_valley_fee REAL DEFAULT 200.00,
        is_free_delivery INTEGER DEFAULT 0,
        seo TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `);
    console.log(`  ✓ Table 'products' created.`);

    // 2. Categories Table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        image TEXT,
        subcategories TEXT,
        seo TEXT,
        created_at TEXT
      );
    `);
    console.log(`  ✓ Table 'categories' created.`);

    // 3. Collections Table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        image TEXT,
        seo TEXT,
        created_at TEXT
      );
    `);
    console.log(`  ✓ Table 'collections' created.`);

    // 4. Orders Table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT NOT NULL UNIQUE,
        created_at TEXT,
        items TEXT NOT NULL,
        subtotal REAL NOT NULL,
        discount REAL DEFAULT 0.00,
        shipping REAL DEFAULT 0.00,
        total REAL NOT NULL,
        payment_method TEXT NOT NULL,
        payment_status TEXT DEFAULT 'pending',
        order_status TEXT DEFAULT 'Pending',
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        customer_mobile TEXT NOT NULL,
        shipping_address TEXT,
        estimated_delivery TEXT,
        tracking_number TEXT,
        updated_at TEXT
      );
    `);
    console.log(`  ✓ Table 'orders' created.`);

    // 5. Coupons Table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS coupons (
        code TEXT PRIMARY KEY,
        discount_type TEXT NOT NULL,
        discount_value REAL NOT NULL,
        min_order_value REAL DEFAULT 0.00,
        max_discount REAL,
        expiry_date TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT
      );
    `);
    console.log(`  ✓ Table 'coupons' created.`);

    // 6. CMS Table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS cms (
        key TEXT PRIMARY KEY,
        announcement_bar TEXT,
        hero TEXT,
        editorial_banner TEXT,
        instagram_images TEXT,
        fonepay_settings TEXT,
        delivery_rates TEXT,
        seo TEXT,
        updated_at TEXT
      );
    `);
    console.log(`  ✓ Table 'cms' created.`);

    // 7. Users Table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        mobile TEXT,
        password TEXT,
        role TEXT DEFAULT 'CUSTOMER',
        registration_date TEXT,
        is_blocked INTEGER DEFAULT 0,
        addresses TEXT,
        created_at TEXT
      );
    `);
    console.log(`  ✓ Table 'users' created.`);

    // 8. Inventory Table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        sku TEXT NOT NULL,
        product_name TEXT NOT NULL,
        category TEXT,
        total_stock INTEGER DEFAULT 0,
        is_out_of_stock INTEGER DEFAULT 0,
        colors TEXT,
        sizes TEXT,
        updated_at TEXT
      );
    `);
    console.log(`  ✓ Table 'inventory' created.`);

    // 9. Delivery Rates Table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS delivery_rates (
        district TEXT PRIMARY KEY,
        province TEXT NOT NULL,
        delivery_fee REAL NOT NULL DEFAULT 180.00,
        enabled INTEGER DEFAULT 1,
        home_delivery_fee REAL,
        branch_delivery_fee REAL,
        home_delivery_enabled INTEGER,
        branch_delivery_enabled INTEGER,
        updated_at TEXT
      );
    `);
    console.log(`  ✓ Table 'delivery_rates' created.`);

    const tables = await allAsync("SELECT name FROM sqlite_master WHERE type='table';");
    console.log(`\n🎉 Local SQL Database Setup Complete! Total Tables Created: ${tables.length}`);
    tables.forEach((t) => console.log(`  - Table: ${t.name}`));

    db.close();
  } catch (err) {
    console.error('❌ SQL Database setup error:', err);
    process.exit(1);
  }
}

createAllTables();
