const fs = require('fs');
const path = require('path');

function escapeSql(val) {
  if (val === undefined || val === null) return 'NULL';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  return `'${String(val).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
}

function toSqlJson(val) {
  if (val === undefined || val === null) return 'NULL';
  const str = typeof val === 'string' ? val : JSON.stringify(val);
  return escapeSql(str);
}

const seedCategories = [
  { id: 'cat-tops', slug: 'tops', name: 'Tops & Shirts', description: 'Chic tops, silk blouses, cropped shirts & essential tees.', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000' },
  { id: 'cat-dresses', slug: 'dresses', name: 'Dresses & Frocks', description: 'Flowy maxi dresses, satin slip dresses & evening frocks.', image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1000' },
  { id: 'cat-bottoms', slug: 'bottoms', name: 'Pants & Skirts', description: 'Tailored trousers, pleated skirts & high-waisted palazzos.', image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1000' },
  { id: 'cat-sets', slug: 'sets', name: 'Matching Sets', description: 'Co-ord 2-piece sets, blazer sets & elegant lounge sets.', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1000' },
  { id: 'cat-outerwear', slug: 'coat-outer', name: 'Coats & Jackets', description: 'Tailored trench coats, wool jackets & stylish dusters.', image: 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=1000' }
];

const seedCollections = [
  { id: 'col-new-arrivals', slug: 'new-arrivals', name: 'New Arrivals', description: 'The latest drops fresh from Daisy Hub.', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000' },
  { id: 'col-best-sellers', slug: 'best-sellers', name: 'Best Sellers', description: 'Customer favorites & top rated fashion pieces.', image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1000' },
  { id: 'col-trending', slug: 'trending', name: 'Trending Now', description: 'Viral & trending Kathmandu street style.', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1000' },
  { id: 'col-sale', slug: 'sale', name: 'Special Sale', description: 'Up to 50% OFF seasonal fashion deals.', image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1000' }
];

const seedProducts = [
  {
    id: 'prod-1790521595963',
    slug: 'coat',
    name: 'coat',
    description: 'Elegant women’s fashion piece designed for effortless confidence.',
    details: [],
    fabricCare: '',
    category: 'tops',
    collections: [],
    price: 1999,
    salePrice: 1599,
    discountPercentage: 20,
    rating: 4.8,
    reviewCount: 1,
    isTrending: false,
    isNewArrival: false,
    isBestSeller: false,
    isSale: false,
    isOutOfStock: false,
    colors: [{ name: 'Black', code: '#111111', images: ['/uploads/img_clean_1790522542447_5hor.jpg'] }],
    sizes: [{ size: 'Free Size', stock: 10 }],
    sku: 'DAISY-PROD-481',
    reviews: [],
    insideValleyFee: 100,
    outsideValleyFee: 200,
    isFreeDelivery: false,
    createdAt: '2026-09-27T15:06:35.963Z'
  },
  {
    id: 'prod-1790522449020',
    slug: 'product-1',
    name: 'product 1',
    description: 'Elegant women’s fashion piece designed for effortless confidence.',
    details: [],
    fabricCare: '',
    category: 'tops',
    collections: [],
    price: 1999,
    salePrice: 1599,
    discountPercentage: 20,
    rating: 4.8,
    reviewCount: 1,
    isTrending: false,
    isNewArrival: false,
    isBestSeller: false,
    isSale: false,
    isOutOfStock: false,
    colors: [{ name: 'Black', code: '#111111', images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop', 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1000&auto=format&fit=crop'] }],
    sizes: [{ size: 'Free Size', stock: 10 }],
    sku: 'DAISY-PROD-140',
    reviews: [],
    insideValleyFee: 100,
    outsideValleyFee: 200,
    isFreeDelivery: false,
    createdAt: '2026-09-27T15:20:49.020Z'
  }
];

let sql = `-- ============================================================
-- DAISY HUB COMPLETE RELATIONAL MYSQL DATABASE SEED
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

-- ============================================================
-- POPULATE DATA FOR ALL 9 TABLES
-- ============================================================

-- 1. SEED CATEGORIES
`;

seedCategories.forEach((c) => {
  sql += `REPLACE INTO \`categories\` (id, slug, name, description, image, subcategories, seo) VALUES (${escapeSql(c.id)}, ${escapeSql(c.slug)}, ${escapeSql(c.name)}, ${escapeSql(c.description || '')}, ${escapeSql(c.image || '')}, '[]', NULL);\n`;
});

sql += `\n-- 2. SEED COLLECTIONS\n`;
seedCollections.forEach((col) => {
  sql += `REPLACE INTO \`collections\` (id, slug, name, description, image, seo) VALUES (${escapeSql(col.id)}, ${escapeSql(col.slug)}, ${escapeSql(col.name)}, ${escapeSql(col.description || '')}, ${escapeSql(col.image || '')}, NULL);\n`;
});

sql += `\n-- 3. SEED COUPONS\n`;
sql += `REPLACE INTO \`coupons\` (code, discount_type, discount_value, min_order_value, max_discount, expiry_date, active) VALUES ('WELCOME10', 'percentage', 10.00, 1000.00, 500.00, '2026-12-31', 1);\n`;
sql += `REPLACE INTO \`coupons\` (code, discount_type, discount_value, min_order_value, max_discount, expiry_date, active) VALUES ('DAISY20', 'fixed', 500.00, 3000.00, 500.00, '2026-12-31', 1);\n`;

sql += `\n-- 4. SEED USERS\n`;
sql += `REPLACE INTO \`users\` (id, name, email, mobile, role, registration_date, is_blocked, addresses) VALUES ('usr-admin-1', 'Admin Manager', 'admin@daisyhub.com', '+977 9800000000', 'ADMIN', '2026-01-01', 0, '[]');\n`;

sql += `\n-- 5. SEED PRODUCTS & INVENTORY\n`;
seedProducts.forEach((p) => {
  sql += `REPLACE INTO \`products\` (id, slug, name, description, details, fabric_care, category, subcategory, collections, price, sale_price, discount_percentage, rating, review_count, is_trending, is_new_arrival, is_best_seller, is_sale, is_out_of_stock, colors, sizes, sku, reviews, inside_valley_fee, outside_valley_fee, is_free_delivery, seo, created_at) VALUES (${escapeSql(p.id)}, ${escapeSql(p.slug)}, ${escapeSql(p.name)}, ${escapeSql(p.description || '')}, ${toSqlJson(p.details || [])}, ${escapeSql(p.fabricCare || '')}, ${escapeSql(p.category)}, ${escapeSql(p.subcategory || null)}, ${toSqlJson(p.collections || [])}, ${p.price}, ${p.salePrice || 'NULL'}, ${p.discountPercentage || 'NULL'}, ${p.rating || 4.8}, ${p.reviewCount || 0}, ${p.isTrending ? 1 : 0}, ${p.isNewArrival ? 1 : 0}, ${p.isBestSeller ? 1 : 0}, ${p.isSale ? 1 : 0}, ${p.isOutOfStock ? 1 : 0}, ${toSqlJson(p.colors || [])}, ${toSqlJson(p.sizes || [])}, ${escapeSql(p.sku)}, ${toSqlJson(p.reviews || [])}, ${p.insideValleyFee || 100}, ${p.outsideValleyFee || 200}, ${p.isFreeDelivery ? 1 : 0}, ${toSqlJson(p.seo || null)}, ${escapeSql(p.createdAt || new Date().toISOString())});\n`;

  const totalStock = p.colors && p.colors.length > 0
    ? p.colors.reduce((sum, c) => sum + (typeof c.stock === 'number' ? c.stock : 10), 0)
    : 10;

  sql += `REPLACE INTO \`inventory\` (id, product_id, sku, product_name, category, total_stock, is_out_of_stock, colors, sizes, updated_at) VALUES ('inv-${p.id}', ${escapeSql(p.id)}, ${escapeSql(p.sku || 'N/A')}, ${escapeSql(p.name)}, ${escapeSql(p.category || 'General')}, ${totalStock}, ${totalStock <= 0 ? 1 : 0}, ${toSqlJson(p.colors || [])}, ${toSqlJson(p.sizes || [])}, ${escapeSql(new Date().toISOString())});\n`;
});

const dumpPath = path.join(__dirname, '..', '..', 'src', 'scripts', 'complete_all_tables_seed.sql');
fs.writeFileSync(dumpPath, sql);
console.log(`✅ Complete SQL dump created at src/scripts/complete_all_tables_seed.sql`);
