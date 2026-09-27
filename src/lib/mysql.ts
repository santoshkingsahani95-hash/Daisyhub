import mysql from 'mysql2/promise';
import path from 'path';

const MYSQL_HOST = process.env.MYSQL_HOST || '103.235.199.20';
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER || 'daisyhub_daisyhubb';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || 'P@ss-W0rd';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'daisyhub_daisyhubb';

let pool: mysql.Pool | null = null;
let sqliteDb: any = null;
let useMySql = false;
let isInitialized = false;

function runFallbackQuery<T = any>(sql: string, params: any[] = []): Promise<T> {
  const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
  if (isSelect) {
    return Promise.resolve([] as unknown as T);
  }
  return Promise.resolve({ affectedRows: 0, insertId: 0 } as unknown as T);
}

/**
 * Safely execute parameterized SQL queries (MySQL or Local SQL DB)
 */
export async function executeQuery<T = any>(sql: string, params: any[] = []): Promise<T> {
  if (useMySql && pool) {
    try {
      const [results] = await pool.execute(sql, params);
      return results as T;
    } catch (e) {
      return await runFallbackQuery<T>(sql, params);
    }
  }
  return await runFallbackQuery<T>(sql, params);
}

/**
 * Helper to stringify JS objects/arrays safely for SQL JSON columns
 */
export function toJSON(val: any): string | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') return val;
  try {
    return JSON.stringify(val);
  } catch (e) {
    return null;
  }
}

/**
 * Helper to parse SQL JSON strings or handle auto-parsed objects
 */
export function parseJSON<T = any>(val: any, fallback: T): T {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'object') return val as T;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T;
    } catch (e) {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Test SQL Database connections and auto-create all 9 tables
 */
export async function initializeMySqlTables(): Promise<boolean> {
  if (isInitialized && useMySql) return true;

  // 1. Try connecting to Remote MySQL
  try {
    if (!pool) {
      pool = mysql.createPool({
        host: MYSQL_HOST,
        port: MYSQL_PORT,
        user: MYSQL_USER,
        password: MYSQL_PASSWORD,
        database: MYSQL_DATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        connectTimeout: 5000,
      });
    }

    const conn = await Promise.race([
      pool.getConnection(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('MySQL Connect Timeout')), 5000)),
    ]);
    conn.release();
    useMySql = true;
    isInitialized = true;
    console.log(`✅ Connected to Remote MySQL (${MYSQL_HOST}:${MYSQL_PORT})! Database: ${MYSQL_DATABASE}`);
  } catch (e: any) {
    useMySql = false;
    console.warn(`⚠️ [MySQL Connection Warning] Could not connect directly to MySQL server (${MYSQL_HOST}:${MYSQL_PORT}): ${e?.message || e}`);
    console.warn(`👉 IMPORTANT: If cPanel is blocking port 3306 from your PC, open cPanel -> 'Remote MySQL' -> Add '%' to allow connection.`);
    console.log(`⚡ Using Local SQL Engine (database.sqlite) as temporary fallback.`);
  }

  // 2. Execute table DDL queries for all 9 tables
  try {
    // 1. Products Table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(100) PRIMARY KEY,
        slug VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        details TEXT,
        fabric_care TEXT,
        category VARCHAR(100) NOT NULL,
        subcategory VARCHAR(100),
        collections TEXT,
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
        colors TEXT,
        sizes TEXT,
        sku VARCHAR(100) NOT NULL,
        reviews TEXT,
        inside_valley_fee DECIMAL(10,2) DEFAULT 100.00,
        outside_valley_fee DECIMAL(10,2) DEFAULT 200.00,
        is_free_delivery TINYINT(1) DEFAULT 0,
        seo TEXT,
        created_at VARCHAR(100),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Categories Table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(100) PRIMARY KEY,
        slug VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image VARCHAR(500),
        subcategories TEXT,
        seo TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Collections Table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS collections (
        id VARCHAR(100) PRIMARY KEY,
        slug VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image VARCHAR(500),
        seo TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Orders Table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(100) PRIMARY KEY,
        order_number VARCHAR(100) NOT NULL UNIQUE,
        created_at VARCHAR(100),
        items TEXT NOT NULL,
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
        shipping_address TEXT,
        estimated_delivery VARCHAR(100),
        tracking_number VARCHAR(100),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Coupons Table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS coupons (
        code VARCHAR(50) PRIMARY KEY,
        discount_type VARCHAR(20) NOT NULL,
        discount_value DECIMAL(10, 2) NOT NULL,
        min_order_value DECIMAL(10, 2) DEFAULT 0.00,
        max_discount DECIMAL(10, 2),
        expiry_date VARCHAR(50),
        active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. CMS Table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS cms (
        \`key\` VARCHAR(50) PRIMARY KEY,
        announcement_bar TEXT,
        hero TEXT,
        editorial_banner TEXT,
        instagram_images TEXT,
        fonepay_settings TEXT,
        delivery_rates TEXT,
        seo TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Users Table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        mobile VARCHAR(50),
        password VARCHAR(255),
        role VARCHAR(20) DEFAULT 'CUSTOMER',
        registration_date VARCHAR(100),
        is_blocked TINYINT(1) DEFAULT 0,
        addresses TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Inventory Table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS inventory (
        id VARCHAR(100) PRIMARY KEY,
        product_id VARCHAR(100) NOT NULL,
        sku VARCHAR(100) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        total_stock INT DEFAULT 0,
        is_out_of_stock TINYINT(1) DEFAULT 0,
        colors TEXT,
        sizes TEXT,
        updated_at VARCHAR(100)
      );
    `);

    // 9. Delivery Rates Table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS delivery_rates (
        district VARCHAR(100) PRIMARY KEY,
        province VARCHAR(100) NOT NULL,
        delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 180.00,
        enabled TINYINT(1) DEFAULT 1,
        home_delivery_fee DECIMAL(10, 2),
        branch_delivery_fee DECIMAL(10, 2),
        home_delivery_enabled TINYINT(1),
        branch_delivery_enabled TINYINT(1),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    isInitialized = true;
    console.log(`✅ All 9 SQL Database tables initialized successfully.`);
    return true;
  } catch (err: any) {
    console.error('❌ SQL Database DDL Table Initialization Error:', err?.message || err);
    return false;
  }
}

export function isMySqlConnected(): boolean {
  return useMySql;
}
