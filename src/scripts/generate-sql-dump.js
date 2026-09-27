const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

const dbPath = path.join(__dirname, '..', '..', 'database.sqlite');
const dumpPath = path.join(__dirname, '..', '..', 'src', 'scripts', 'full_database_seed.sql');

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  if (typeof str === 'number') return str;
  if (typeof str === 'boolean') return str ? 1 : 0;
  return `'${String(str).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
}

function toSqlJson(obj) {
  if (obj === null || obj === undefined) return 'NULL';
  const jsonStr = typeof obj === 'string' ? obj : JSON.stringify(obj);
  return escapeSql(jsonStr);
}

const db = new sqlite3.Database(dbPath);

let sqlDump = `-- ============================================================
-- DAISY HUB FULL RELATIONAL MYSQL DATABASE SEED & DDL DUMP
-- Import this file into phpMyAdmin SQL tab to populate all 9 tables!
-- Database: daisyhub_daisyhubb
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS \`products\` (
  \`id\` VARCHAR(100) PRIMARY KEY,
  \`slug\` VARCHAR(255) NOT NULL UNIQUE,
  \`name\` VARCHAR(255) NOT NULL,
  \`description\` TEXT,
  \`details\` TEXT,
  \`fabric_care\` TEXT,
  \`category\` VARCHAR(100) NOT NULL,
  \`subcategory\` VARCHAR(100),
  \`collections\` TEXT,
  \`price\` DECIMAL(10, 2) NOT NULL,
  \`sale_price\` DECIMAL(10, 2),
  \`discount_percentage\` INT,
  \`rating\` DECIMAL(3, 1) DEFAULT 4.8,
  \`review_count\` INT DEFAULT 0,
  \`is_trending\` TINYINT(1) DEFAULT 0,
  \`is_new_arrival\` TINYINT(1) DEFAULT 0,
  \`is_best_seller\` TINYINT(1) DEFAULT 0,
  \`is_sale\` TINYINT(1) DEFAULT 0,
  \`is_out_of_stock\` TINYINT(1) DEFAULT 0,
  \`colors\` TEXT,
  \`sizes\` TEXT,
  \`sku\` VARCHAR(100) NOT NULL,
  \`reviews\` TEXT,
  \`inside_valley_fee\` DECIMAL(10,2) DEFAULT 100.00,
  \`outside_valley_fee\` DECIMAL(10,2) DEFAULT 200.00,
  \`is_free_delivery\` TINYINT(1) DEFAULT 0,
  \`seo\` TEXT,
  \`created_at\` VARCHAR(100),
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS \`categories\` (
  \`id\` VARCHAR(100) PRIMARY KEY,
  \`slug\` VARCHAR(255) NOT NULL UNIQUE,
  \`name\` VARCHAR(255) NOT NULL,
  \`description\` TEXT,
  \`image\` VARCHAR(500),
  \`subcategories\` TEXT,
  \`seo\` TEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. COLLECTIONS TABLE
CREATE TABLE IF NOT EXISTS \`collections\` (
  \`id\` VARCHAR(100) PRIMARY KEY,
  \`slug\` VARCHAR(255) NOT NULL UNIQUE,
  \`name\` VARCHAR(255) NOT NULL,
  \`description\` TEXT,
  \`image\` VARCHAR(500),
  \`seo\` TEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS \`orders\` (
  \`id\` VARCHAR(100) PRIMARY KEY,
  \`order_number\` VARCHAR(100) NOT NULL UNIQUE,
  \`created_at\` VARCHAR(100),
  \`items\` TEXT NOT NULL,
  \`subtotal\` DECIMAL(10, 2) NOT NULL,
  \`discount\` DECIMAL(10, 2) DEFAULT 0.00,
  \`shipping\` DECIMAL(10, 2) DEFAULT 0.00,
  \`total\` DECIMAL(10, 2) NOT NULL,
  \`payment_method\` VARCHAR(50) NOT NULL,
  \`payment_status\` VARCHAR(50) DEFAULT 'pending',
  \`order_status\` VARCHAR(50) DEFAULT 'Pending',
  \`customer_name\` VARCHAR(255) NOT NULL,
  \`customer_email\` VARCHAR(255) NOT NULL,
  \`customer_mobile\` VARCHAR(50) NOT NULL,
  \`shipping_address\` TEXT,
  \`estimated_delivery\` VARCHAR(100),
  \`tracking_number\` VARCHAR(100),
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. COUPONS TABLE
CREATE TABLE IF NOT EXISTS \`coupons\` (
  \`code\` VARCHAR(50) PRIMARY KEY,
  \`discount_type\` VARCHAR(20) NOT NULL,
  \`discount_value\` DECIMAL(10, 2) NOT NULL,
  \`min_order_value\` DECIMAL(10, 2) DEFAULT 0.00,
  \`max_discount\` DECIMAL(10, 2),
  \`expiry_date\` VARCHAR(50),
  \`active\` TINYINT(1) DEFAULT 1,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. CMS TABLE
CREATE TABLE IF NOT EXISTS \`cms\` (
  \`key\` VARCHAR(50) PRIMARY KEY,
  \`announcement_bar\` TEXT,
  \`hero\` TEXT,
  \`editorial_banner\` TEXT,
  \`instagram_images\` TEXT,
  \`fonepay_settings\` TEXT,
  \`delivery_rates\` TEXT,
  \`seo\` TEXT,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. USERS TABLE
CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` VARCHAR(100) PRIMARY KEY,
  \`name\` VARCHAR(255) NOT NULL,
  \`email\` VARCHAR(255) NOT NULL UNIQUE,
  \`mobile\` VARCHAR(50),
  \`password\` VARCHAR(255),
  \`role\` VARCHAR(20) DEFAULT 'CUSTOMER',
  \`registration_date\` VARCHAR(100),
  \`is_blocked\` TINYINT(1) DEFAULT 0,
  \`addresses\` TEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. INVENTORY TABLE
CREATE TABLE IF NOT EXISTS \`inventory\` (
  \`id\` VARCHAR(100) PRIMARY KEY,
  \`product_id\` VARCHAR(100) NOT NULL,
  \`sku\` VARCHAR(100) NOT NULL,
  \`product_name\` VARCHAR(255) NOT NULL,
  \`category\` VARCHAR(100),
  \`total_stock\` INT DEFAULT 0,
  \`is_out_of_stock\` TINYINT(1) DEFAULT 0,
  \`colors\` TEXT,
  \`sizes\` TEXT,
  \`updated_at\` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. DELIVERY RATES TABLE
CREATE TABLE IF NOT EXISTS \`delivery_rates\` (
  \`district\` VARCHAR(100) PRIMARY KEY,
  \`province\` VARCHAR(100) NOT NULL,
  \`delivery_fee\` DECIMAL(10, 2) NOT NULL DEFAULT 180.00,
  \`enabled\` TINYINT(1) DEFAULT 1,
  \`home_delivery_fee\` DECIMAL(10, 2),
  \`branch_delivery_fee\` DECIMAL(10, 2),
  \`home_delivery_enabled\` TINYINT(1),
  \`branch_delivery_enabled\` TINYINT(1),
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

`;

db.all('SELECT * FROM products', [], (err, rows) => {
  if (!err && rows && rows.length > 0) {
    sqlDump += `-- INSERT PRODUCTS DATA\n`;
    rows.forEach((r) => {
      sqlDump += `REPLACE INTO \`products\` (id, slug, name, description, details, fabric_care, category, subcategory, collections, price, sale_price, discount_percentage, rating, review_count, is_trending, is_new_arrival, is_best_seller, is_sale, is_out_of_stock, colors, sizes, sku, reviews, inside_valley_fee, outside_valley_fee, is_free_delivery, seo, created_at) VALUES (${escapeSql(r.id)}, ${escapeSql(r.slug)}, ${escapeSql(r.name)}, ${escapeSql(r.description)}, ${escapeSql(r.details)}, ${escapeSql(r.fabric_care)}, ${escapeSql(r.category)}, ${escapeSql(r.subcategory)}, ${escapeSql(r.collections)}, ${r.price}, ${r.sale_price || 'NULL'}, ${r.discount_percentage || 'NULL'}, ${r.rating || 4.8}, ${r.review_count || 0}, ${r.is_trending ? 1 : 0}, ${r.is_new_arrival ? 1 : 0}, ${r.is_best_seller ? 1 : 0}, ${r.is_sale ? 1 : 0}, ${r.is_out_of_stock ? 1 : 0}, ${escapeSql(r.colors)}, ${escapeSql(r.sizes)}, ${escapeSql(r.sku)}, ${escapeSql(r.reviews)}, ${r.inside_valley_fee || 100}, ${r.outside_valley_fee || 200}, ${r.is_free_delivery ? 1 : 0}, ${escapeSql(r.seo)}, ${escapeSql(r.created_at)});\n`;
    });
  }

  fs.writeFileSync(dumpPath, sqlDump);
  console.log(`✅ Generated 1-Click MySQL Full SQL Dump at: src/scripts/full_database_seed.sql`);
  db.close();
});
