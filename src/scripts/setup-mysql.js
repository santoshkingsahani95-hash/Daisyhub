const mysql = require('mysql2/promise');

const MYSQL_HOST = process.env.MYSQL_HOST || '103.235.199.20';
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER || 'daisyhub_daisyhubb';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || 'P@ss-W0rd';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'daisyhub_daisyhubb';

async function setupDatabase() {
  console.log(`🔌 Connecting to MySQL server at ${MYSQL_HOST}:${MYSQL_PORT}...`);

  try {
    const connection = await mysql.createConnection({
      host: MYSQL_HOST,
      port: MYSQL_PORT,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      connectTimeout: 10000,
    });

    console.log(`✅ Connected successfully to MySQL database '${MYSQL_DATABASE}'!`);
    console.log(`🚀 Creating all 9 relational database tables...`);

    // 1. Products Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(100) PRIMARY KEY,
        slug VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        details JSON,
        fabric_care TEXT,
        category VARCHAR(100) NOT NULL,
        subcategory VARCHAR(100),
        collections JSON,
        price DECIMAL(10, 2) NOT NULL,
        sale_price DECIMAL(10, 2),
        discount_percentage INT,
        rating DECIMAL(3, 1) DEFAULT 4.8,
        review_count INT DEFAULT 0,
        is_trending TINYINT(1) DEFAULT 0,
        is_new_arrival TINYINT(1) DEFAULT 0,
        is_best_seller TINYINT(1) DEFAULT 0,
        is_sale TINYINT(1) DEFAULT 0,
        is_out_of_stock TINYINT(1) DEFAULT 0,
        colors JSON,
        sizes JSON,
        sku VARCHAR(100) NOT NULL,
        reviews JSON,
        inside_valley_fee DECIMAL(10,2) DEFAULT 100.00,
        outside_valley_fee DECIMAL(10,2) DEFAULT 200.00,
        is_free_delivery TINYINT(1) DEFAULT 0,
        seo JSON,
        created_at VARCHAR(100),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_prod_category (category),
        INDEX idx_prod_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log(`  ✓ Table 'products' created/verified.`);

    // 2. Categories Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(100) PRIMARY KEY,
        slug VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image VARCHAR(500),
        subcategories JSON,
        seo JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_cat_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log(`  ✓ Table 'categories' created/verified.`);

    // 3. Collections Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS collections (
        id VARCHAR(100) PRIMARY KEY,
        slug VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image VARCHAR(500),
        seo JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log(`  ✓ Table 'collections' created/verified.`);

    // 4. Orders Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(100) PRIMARY KEY,
        order_number VARCHAR(100) NOT NULL UNIQUE,
        created_at VARCHAR(100),
        items JSON NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        discount DECIMAL(10, 2) DEFAULT 0.00,
        shipping DECIMAL(10, 2) DEFAULT 0.00,
        total DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_status VARCHAR(50) DEFAULT 'pending',
        order_status VARCHAR(50) DEFAULT 'Pending',
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_mobile VARCHAR(50) NOT NULL,
        shipping_address JSON,
        estimated_delivery VARCHAR(100),
        tracking_number VARCHAR(100),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_order_number (order_number),
        INDEX idx_order_email (customer_email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log(`  ✓ Table 'orders' created/verified.`);

    // 5. Coupons Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS coupons (
        code VARCHAR(50) PRIMARY KEY,
        discount_type VARCHAR(20) NOT NULL,
        discount_value DECIMAL(10, 2) NOT NULL,
        min_order_value DECIMAL(10, 2) DEFAULT 0.00,
        max_discount DECIMAL(10, 2),
        expiry_date VARCHAR(50),
        active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log(`  ✓ Table 'coupons' created/verified.`);

    // 6. CMS Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS cms (
        \`key\` VARCHAR(50) PRIMARY KEY,
        announcement_bar JSON,
        hero JSON,
        editorial_banner JSON,
        instagram_images JSON,
        fonepay_settings JSON,
        delivery_rates JSON,
        seo JSON,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log(`  ✓ Table 'cms' created/verified.`);

    // 7. Users Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        mobile VARCHAR(50),
        password VARCHAR(255),
        role VARCHAR(20) DEFAULT 'CUSTOMER',
        registration_date VARCHAR(100),
        is_blocked TINYINT(1) DEFAULT 0,
        addresses JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log(`  ✓ Table 'users' created/verified.`);

    // 8. Inventory Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS inventory (
        id VARCHAR(100) PRIMARY KEY,
        product_id VARCHAR(100) NOT NULL,
        sku VARCHAR(100) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        total_stock INT DEFAULT 0,
        is_out_of_stock TINYINT(1) DEFAULT 0,
        colors JSON,
        sizes JSON,
        updated_at VARCHAR(100),
        INDEX idx_inv_product_id (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log(`  ✓ Table 'inventory' created/verified.`);

    // 9. Delivery Rates Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS delivery_rates (
        district VARCHAR(100) PRIMARY KEY,
        province VARCHAR(100) NOT NULL,
        delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 180.00,
        enabled TINYINT(1) DEFAULT 1,
        home_delivery_fee DECIMAL(10, 2),
        branch_delivery_fee DECIMAL(10, 2),
        home_delivery_enabled TINYINT(1),
        branch_delivery_enabled TINYINT(1),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log(`  ✓ Table 'delivery_rates' created/verified.`);

    // Verify existing tables
    const [tables] = await connection.execute('SHOW TABLES;');
    console.log(`\n🎉 MySQL Database Setup Complete! Total Tables in '${MYSQL_DATABASE}': ${tables.length}`);
    console.table(tables);

    await connection.end();
  } catch (error) {
    console.error('❌ Failed to set up MySQL database:', error);
    process.exit(1);
  }
}

setupDatabase();
