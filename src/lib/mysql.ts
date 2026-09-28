import mysql from 'mysql2/promise';
import { neon } from '@neondatabase/serverless';
import path from 'path';
import fs from 'fs';

const NEON_DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const MYSQL_HOST = process.env.MYSQL_HOST || 'phillips.mysecurecloudserver.com';
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER || 'daisyhub_app_user';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '$wyDinSV*$5fZv_r';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'daisyhub_daisyhubb';

let pool: mysql.Pool | null = null;
let neonSql: any = null;
let useNeon = false;
let useMySql = false;
let isInitialized = false;
let initPromise: Promise<boolean> | null = null;

if (NEON_DB_URL) {
  try {
    neonSql = neon(NEON_DB_URL);
    useNeon = true;
  } catch (e) {
    console.warn('[Neon Config Warning]', e);
  }
}

const DB_FILE = path.join(process.cwd(), 'database_store.json');

function loadLocalStore(): Record<string, any[]> {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.warn('[Local Store Load Error]', e);
  }
  return {};
}

function saveLocalStore(store: Record<string, any[]>) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Local Store Save Error]', e);
  }
}

const localStore: Record<string, any[]> = loadLocalStore();

function runFallbackQuery<T = any>(sql: string, params: any[] = []): Promise<T> {
  const cleanSql = sql.trim();
  const upperSql = cleanSql.toUpperCase();

  // 1. CREATE TABLE
  if (upperSql.startsWith('CREATE TABLE')) {
    const match = cleanSql.match(/CREATE TABLE (?:IF NOT EXISTS )?`?([a-zA-Z0-9_]+)`?/i);
    if (match && match[1]) {
      const tableName = match[1].toLowerCase();
      if (!localStore[tableName]) {
        localStore[tableName] = [];
        saveLocalStore(localStore);
      }
    }
    return Promise.resolve({ affectedRows: 0, insertId: 0 } as unknown as T);
  }

  // 2. SELECT
  if (upperSql.startsWith('SELECT')) {
    const fromMatch = cleanSql.match(/FROM `?([a-zA-Z0-9_]+)`?/i);
    if (fromMatch && fromMatch[1]) {
      const tableName = fromMatch[1].toLowerCase();
      let rows = localStore[tableName] || [];

      if (cleanSql.includes('`key` = ?') || cleanSql.includes('key = ?') || cleanSql.includes('key =')) {
        const keyVal = params[0];
        rows = rows.filter((r) => r.key === keyVal);
      }
      return Promise.resolve(rows as unknown as T);
    }
    return Promise.resolve([] as unknown as T);
  }

  // 3. INSERT INTO
  if (upperSql.startsWith('INSERT INTO')) {
    const tableMatch = cleanSql.match(/INSERT INTO `?([a-zA-Z0-9_]+)`?\s*\(([\s\S]+?)\)\s*VALUES/i);
    if (tableMatch) {
      const tableName = tableMatch[1].toLowerCase();
      const cols = tableMatch[2].split(',').map((c) => c.trim().replace(/[`"'\s]/g, ''));
      
      const row: Record<string, any> = {};
      cols.forEach((col, idx) => {
        row[col] = params[idx] !== undefined ? params[idx] : null;
      });

      if (!localStore[tableName]) {
        localStore[tableName] = [];
      }

      const tableData = localStore[tableName];
      const pkField = cols.includes('id') ? 'id' : (cols.includes('code') ? 'code' : (cols.includes('district') ? 'district' : 'key'));
      const pkValue = row[pkField];

      const existingIdx = pkValue ? tableData.findIndex((r) => r[pkField] === pkValue) : -1;
      if (existingIdx >= 0) {
        tableData[existingIdx] = { ...tableData[existingIdx], ...row };
      } else {
        tableData.unshift(row);
      }

      saveLocalStore(localStore);
      return Promise.resolve({ affectedRows: 1, insertId: 1 } as unknown as T);
    }
  }

  // 4. DELETE FROM
  if (upperSql.startsWith('DELETE FROM')) {
    const tableMatch = cleanSql.match(/DELETE FROM `?([a-zA-Z0-9_]+)`?/i);
    if (tableMatch) {
      const tableName = tableMatch[1].toLowerCase();
      if (localStore[tableName]) {
        const pkVal = params[0];
        const secondPkVal = params[1];
        localStore[tableName] = localStore[tableName].filter(
          (r) => r.id !== pkVal && r.code !== pkVal && r.product_id !== pkVal && r.id !== secondPkVal && r.product_id !== secondPkVal
        );
        saveLocalStore(localStore);
      }
      return Promise.resolve({ affectedRows: 1, insertId: 0 } as unknown as T);
    }
  }

  return Promise.resolve({ affectedRows: 0, insertId: 0 } as unknown as T);
}

/**
 * Safely execute parameterized SQL queries across Neon Postgres, MySQL, or Local SQL Engine
 */
export async function executeQuery<T = any>(sql: string, params: any[] = []): Promise<T> {
  // 1. Neon Serverless Postgres Execution
  if (useNeon && neonSql) {
    try {
      const cleanSql = sql.replace(/`([a-zA-Z0-9_]+)`/g, '"$1"');
      let paramIndex = 1;
      const pgSql = cleanSql.replace(/\?/g, () => `$${paramIndex++}`);
      
      const result = typeof neonSql.query === 'function' 
        ? await neonSql.query(pgSql, params)
        : await neonSql(pgSql, params);
      const rows = result && typeof result === 'object' && 'rows' in result ? result.rows : result;
      return rows as T;
    } catch (e: any) {
      return await runFallbackQuery<T>(sql, params);
    }
  }

  // 2. MySQL Pool Execution
  if (useMySql && pool) {
    try {
      const [results] = await pool.execute(sql, params);
      return results as T;
    } catch (e) {
      return await runFallbackQuery<T>(sql, params);
    }
  }

  // 3. Local Engine Fallback
  return await runFallbackQuery<T>(sql, params);
}

export function toJSON(val: any): string | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') return val;
  try {
    return JSON.stringify(val);
  } catch (e) {
    return null;
  }
}

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
 * Test SQL Database connections and auto-create all tables
 */
export async function initializeMySqlTables(): Promise<boolean> {
  if (isInitialized) return useNeon || useMySql;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // 1. Test Neon Postgres Connection first if DATABASE_URL is present
    if (useNeon && neonSql) {
      try {
        await neonSql`SELECT 1;`;
        console.log(`✅ Connected to Neon Serverless Postgres Database!`);
        isInitialized = true;
      } catch (e: any) {
        console.warn(`⚠️ [Neon Connect Warning] ${e?.message || e}`);
        useNeon = false;
      }
    }

    // 2. Try Remote MySQL if Neon is not active
    if (!useNeon) {
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
            connectTimeout: 1000,
          });
        }

        const conn = await Promise.race([
          pool.getConnection(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('MySQL Connect Timeout')), 1000)),
        ]);
        conn.release();
        useMySql = true;
        console.log(`✅ Connected to Remote MySQL (${MYSQL_HOST}:${MYSQL_PORT})! Database: ${MYSQL_DATABASE}`);
      } catch (e: any) {
        useMySql = false;
        console.warn(`⚠️ [MySQL Connection Warning] Could not connect directly to MySQL server (${MYSQL_HOST}:${MYSQL_PORT}): ${e?.message || e}`);
      }
    }

    isInitialized = true;

    // 3. Execute table DDL queries for all tables
    try {
      // Products Table
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
          is_trending TINYINT DEFAULT 0,
          is_new_arrival TINYINT DEFAULT 0,
          is_best_seller TINYINT DEFAULT 0,
          is_sale TINYINT DEFAULT 0,
          is_out_of_stock TINYINT DEFAULT 0,
          colors TEXT,
          sizes TEXT,
          sku VARCHAR(100) NOT NULL,
          reviews TEXT,
          inside_valley_fee DECIMAL(10,2) DEFAULT 100.00,
          outside_valley_fee DECIMAL(10,2) DEFAULT 200.00,
          is_free_delivery TINYINT DEFAULT 0,
          seo TEXT,
          created_at VARCHAR(100)
        );
      `);

      // Categories Table
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS categories (
          id VARCHAR(100) PRIMARY KEY,
          slug VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          image TEXT,
          subcategories TEXT,
          seo TEXT
        );
      `);

      // Collections Table
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS collections (
          id VARCHAR(100) PRIMARY KEY,
          slug VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          image TEXT,
          seo TEXT
        );
      `);

      // Orders Table
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
          tracking_number VARCHAR(100)
        );
      `);

      // Coupons Table
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS coupons (
          code VARCHAR(50) PRIMARY KEY,
          discount_type VARCHAR(20) NOT NULL,
          discount_value DECIMAL(10, 2) NOT NULL,
          min_order_value DECIMAL(10, 2) DEFAULT 0.00,
          max_discount DECIMAL(10, 2),
          expiry_date VARCHAR(50),
          active TINYINT DEFAULT 1
        );
      `);

      // CMS Table
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS cms (
          key VARCHAR(50) PRIMARY KEY,
          announcement_bar TEXT,
          hero TEXT,
          editorial_banner TEXT,
          instagram_images TEXT,
          fonepay_settings TEXT,
          delivery_rates TEXT,
          seo TEXT
        );
      `);

      // Users Table
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          mobile VARCHAR(50),
          password VARCHAR(255),
          role VARCHAR(20) DEFAULT 'CUSTOMER',
          registration_date VARCHAR(100),
          is_blocked TINYINT DEFAULT 0,
          addresses TEXT
        );
      `);

      // Inventory Table
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS inventory (
          id VARCHAR(100) PRIMARY KEY,
          product_id VARCHAR(100) NOT NULL,
          sku VARCHAR(100) NOT NULL,
          product_name VARCHAR(255) NOT NULL,
          category VARCHAR(100),
          total_stock INT DEFAULT 0,
          is_out_of_stock TINYINT DEFAULT 0,
          colors TEXT,
          sizes TEXT,
          updated_at VARCHAR(100)
        );
      `);

      // Images Table (BLOB Storage for Vercel Host compatibility)
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS images (
          id VARCHAR(100) PRIMARY KEY,
          mime_type VARCHAR(100) NOT NULL DEFAULT 'image/jpeg',
          data TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log(`✅ All database tables initialized successfully.`);
      return true;
    } catch (err: any) {
      console.error('❌ SQL Table Initialization Error:', err?.message || err);
      return false;
    }
  })();

  return initPromise;
}

export function isMySqlConnected(): boolean {
  return useNeon || useMySql;
}

/**
 * Saves a Buffer image into Neon Postgres, MySQL, or local store
 */
export async function saveImageBlobToDb(buffer: Buffer, mimeType: string = 'image/jpeg'): Promise<string> {
  await initializeMySqlTables();
  const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const base64Str = `data:${mimeType};base64,${buffer.toString('base64')}`;

  // 1. Save to Neon Serverless Postgres
  if (useNeon && neonSql) {
    try {
      await executeQuery(
        `INSERT INTO images (id, mime_type, data) VALUES (?, ?, ?)`,
        [imageId, mimeType, base64Str]
      );
      return `/api/images/${imageId}`;
    } catch (err) {
      console.error('[Neon Image Save Error]', err);
    }
  }

  // 2. Save to MySQL
  if (useMySql && pool) {
    try {
      await pool.execute(
        `INSERT INTO images (id, mime_type, data) VALUES (?, ?, ?)`,
        [imageId, mimeType, buffer]
      );
      return `/api/images/${imageId}`;
    } catch (err) {
      console.error('[MySQL Image Save Error]', err);
    }
  }

  // 3. Fallback to local store
  if (!localStore['images']) localStore['images'] = [];
  localStore['images'].unshift({ id: imageId, mime_type: mimeType, data: base64Str });
  saveLocalStore(localStore);

  return `/api/images/${imageId}`;
}

/**
 * Retrieves an image Buffer from Neon Postgres, MySQL, or local store
 */
export async function getImageBlobFromDb(imageId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  await initializeMySqlTables();

  // 1. Fetch from Neon Serverless Postgres
  if (useNeon && neonSql) {
    try {
      const rows: any[] = await executeQuery(`SELECT mime_type, data FROM images WHERE id = ? LIMIT 1`, [imageId]);
      if (rows && rows.length > 0) {
        const row = rows[0];
        const dataStr = row.data;
        if (dataStr && typeof dataStr === 'string' && dataStr.startsWith('data:')) {
          const matches = dataStr.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
          if (matches) {
            return {
              buffer: Buffer.from(matches[2], 'base64'),
              mimeType: matches[1] || row.mime_type || 'image/jpeg',
            };
          }
        }
      }
    } catch (err) {
      console.error('[Neon Image Read Error]', err);
    }
  }

  // 2. Fetch from MySQL
  if (useMySql && pool) {
    try {
      const [rows] = await pool.execute<any[]>(
        `SELECT mime_type, data FROM images WHERE id = ? LIMIT 1`,
        [imageId]
      );
      if (rows && rows.length > 0) {
        const row = rows[0];
        const buffer = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data);
        return { buffer, mimeType: row.mime_type || 'image/jpeg' };
      }
    } catch (err) {
      console.error('[MySQL Image Read Error]', err);
    }
  }

  // 3. Local Store Fetch
  const localList = localStore['images'] || [];
  const found = localList.find((item) => item.id === imageId);
  if (found && found.data) {
    if (typeof found.data === 'string' && found.data.startsWith('data:')) {
      const matches = found.data.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (matches) {
        return {
          buffer: Buffer.from(matches[2], 'base64'),
          mimeType: matches[1] || found.mime_type || 'image/jpeg',
        };
      }
    } else if (Buffer.isBuffer(found.data)) {
      return { buffer: found.data, mimeType: found.mime_type || 'image/jpeg' };
    }
  }

  return null;
}
