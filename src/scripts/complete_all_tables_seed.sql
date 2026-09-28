-- ============================================================
-- DAISY HUB COMPLETE RELATIONAL MYSQL DATABASE SEED
-- Database: daisyhub_daisyhubb
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(100) PRIMARY KEY,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `details` TEXT,
  `fabric_care` TEXT,
  `category` VARCHAR(100) NOT NULL,
  `subcategory` VARCHAR(100),
  `collections` TEXT,
  `price` DECIMAL(10, 2) NOT NULL,
  `sale_price` DECIMAL(10, 2),
  `discount_percentage` INT,
  `rating` DECIMAL(3, 1) DEFAULT 4.8,
  `review_count` INT DEFAULT 0,
  `is_trending` TINYINT(1) DEFAULT 0,
  `is_new_arrival` TINYINT(1) DEFAULT 0,
  `is_best_seller` TINYINT(1) DEFAULT 0,
  `is_sale` TINYINT(1) DEFAULT 0,
  `is_out_of_stock` TINYINT(1) DEFAULT 0,
  `colors` TEXT,
  `sizes` TEXT,
  `sku` VARCHAR(100) NOT NULL,
  `reviews` TEXT,
  `inside_valley_fee` DECIMAL(10,2) DEFAULT 100.00,
  `outside_valley_fee` DECIMAL(10,2) DEFAULT 200.00,
  `is_free_delivery` TINYINT(1) DEFAULT 0,
  `seo` TEXT,
  `created_at` VARCHAR(100),
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS `categories` (
  `id` VARCHAR(100) PRIMARY KEY,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `image` VARCHAR(500),
  `subcategories` TEXT,
  `seo` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. COLLECTIONS TABLE
CREATE TABLE IF NOT EXISTS `collections` (
  `id` VARCHAR(100) PRIMARY KEY,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `image` VARCHAR(500),
  `seo` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(100) PRIMARY KEY,
  `order_number` VARCHAR(100) NOT NULL UNIQUE,
  `created_at` VARCHAR(100),
  `items` TEXT NOT NULL,
  `subtotal` DECIMAL(10, 2) NOT NULL,
  `discount` DECIMAL(10, 2) DEFAULT 0.00,
  `shipping` DECIMAL(10, 2) DEFAULT 0.00,
  `total` DECIMAL(10, 2) NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL,
  `payment_status` VARCHAR(50) DEFAULT 'pending',
  `order_status` VARCHAR(50) DEFAULT 'Pending',
  `customer_name` VARCHAR(255) NOT NULL,
  `customer_email` VARCHAR(255) NOT NULL,
  `customer_mobile` VARCHAR(50) NOT NULL,
  `shipping_address` TEXT,
  `estimated_delivery` VARCHAR(100),
  `tracking_number` VARCHAR(100),
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. COUPONS TABLE
CREATE TABLE IF NOT EXISTS `coupons` (
  `code` VARCHAR(50) PRIMARY KEY,
  `discount_type` VARCHAR(20) NOT NULL,
  `discount_value` DECIMAL(10, 2) NOT NULL,
  `min_order_value` DECIMAL(10, 2) DEFAULT 0.00,
  `max_discount` DECIMAL(10, 2),
  `expiry_date` VARCHAR(50),
  `active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. CMS TABLE
CREATE TABLE IF NOT EXISTS `cms` (
  `key` VARCHAR(50) PRIMARY KEY,
  `announcement_bar` TEXT,
  `hero` TEXT,
  `editorial_banner` TEXT,
  `instagram_images` TEXT,
  `fonepay_settings` TEXT,
  `delivery_rates` TEXT,
  `seo` TEXT,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. USERS TABLE
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(100) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `mobile` VARCHAR(50),
  `password` VARCHAR(255),
  `role` VARCHAR(20) DEFAULT 'CUSTOMER',
  `registration_date` VARCHAR(100),
  `is_blocked` TINYINT(1) DEFAULT 0,
  `addresses` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. INVENTORY TABLE
CREATE TABLE IF NOT EXISTS `inventory` (
  `id` VARCHAR(100) PRIMARY KEY,
  `product_id` VARCHAR(100) NOT NULL,
  `sku` VARCHAR(100) NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100),
  `total_stock` INT DEFAULT 0,
  `is_out_of_stock` TINYINT(1) DEFAULT 0,
  `colors` TEXT,
  `sizes` TEXT,
  `updated_at` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. DELIVERY RATES TABLE
CREATE TABLE IF NOT EXISTS `delivery_rates` (
  `district` VARCHAR(100) PRIMARY KEY,
  `province` VARCHAR(100) NOT NULL,
  `delivery_fee` DECIMAL(10, 2) NOT NULL DEFAULT 180.00,
  `enabled` TINYINT(1) DEFAULT 1,
  `home_delivery_fee` DECIMAL(10, 2),
  `branch_delivery_fee` DECIMAL(10, 2),
  `home_delivery_enabled` TINYINT(1),
  `branch_delivery_enabled` TINYINT(1),
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- POPULATE DATA FOR ALL 9 TABLES
-- ============================================================

-- 1. SEED CATEGORIES
REPLACE INTO `categories` (id, slug, name, description, image, subcategories, seo) VALUES ('cat-tops', 'tops', 'Tops & Shirts', 'Chic tops, silk blouses, cropped shirts & essential tees.', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000', '[]', NULL);
REPLACE INTO `categories` (id, slug, name, description, image, subcategories, seo) VALUES ('cat-dresses', 'dresses', 'Dresses & Frocks', 'Flowy maxi dresses, satin slip dresses & evening frocks.', 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1000', '[]', NULL);
REPLACE INTO `categories` (id, slug, name, description, image, subcategories, seo) VALUES ('cat-bottoms', 'bottoms', 'Pants & Skirts', 'Tailored trousers, pleated skirts & high-waisted palazzos.', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1000', '[]', NULL);
REPLACE INTO `categories` (id, slug, name, description, image, subcategories, seo) VALUES ('cat-sets', 'sets', 'Matching Sets', 'Co-ord 2-piece sets, blazer sets & elegant lounge sets.', 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1000', '[]', NULL);
REPLACE INTO `categories` (id, slug, name, description, image, subcategories, seo) VALUES ('cat-outerwear', 'coat-outer', 'Coats & Jackets', 'Tailored trench coats, wool jackets & stylish dusters.', 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=1000', '[]', NULL);

-- 2. SEED COLLECTIONS
REPLACE INTO `collections` (id, slug, name, description, image, seo) VALUES ('col-new-arrivals', 'new-arrivals', 'New Arrivals', 'The latest drops fresh from Daisy Hub.', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000', NULL);
REPLACE INTO `collections` (id, slug, name, description, image, seo) VALUES ('col-best-sellers', 'best-sellers', 'Best Sellers', 'Customer favorites & top rated fashion pieces.', 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1000', NULL);
REPLACE INTO `collections` (id, slug, name, description, image, seo) VALUES ('col-trending', 'trending', 'Trending Now', 'Viral & trending Kathmandu street style.', 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1000', NULL);
REPLACE INTO `collections` (id, slug, name, description, image, seo) VALUES ('col-sale', 'sale', 'Special Sale', 'Up to 50% OFF seasonal fashion deals.', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1000', NULL);

-- 3. SEED COUPONS
REPLACE INTO `coupons` (code, discount_type, discount_value, min_order_value, max_discount, expiry_date, active) VALUES ('WELCOME10', 'percentage', 10.00, 1000.00, 500.00, '2026-12-31', 1);
REPLACE INTO `coupons` (code, discount_type, discount_value, min_order_value, max_discount, expiry_date, active) VALUES ('DAISY20', 'fixed', 500.00, 3000.00, 500.00, '2026-12-31', 1);

-- 4. SEED USERS
REPLACE INTO `users` (id, name, email, mobile, role, registration_date, is_blocked, addresses) VALUES ('usr-admin-1', 'Admin Manager', 'admin@daisyhub.com', '+977 9800000000', 'ADMIN', '2026-01-01', 0, '[]');

-- 5. SEED PRODUCTS & INVENTORY
REPLACE INTO `products` (id, slug, name, description, details, fabric_care, category, subcategory, collections, price, sale_price, discount_percentage, rating, review_count, is_trending, is_new_arrival, is_best_seller, is_sale, is_out_of_stock, colors, sizes, sku, reviews, inside_valley_fee, outside_valley_fee, is_free_delivery, seo, created_at) VALUES ('prod-1790521595963', 'coat', 'coat', 'Elegant women’s fashion piece designed for effortless confidence.', '[]', '', 'tops', NULL, '[]', 1999, 1599, 20, 4.8, 1, 0, 0, 0, 0, 0, '[{"name":"Black","code":"#111111","images":["/uploads/img_clean_1790522542447_5hor.jpg"]}]', '[{"size":"Free Size","stock":10}]', 'DAISY-PROD-481', '[]', 100, 200, 0, NULL, '2026-09-27T15:06:35.963Z');
REPLACE INTO `inventory` (id, product_id, sku, product_name, category, total_stock, is_out_of_stock, colors, sizes, updated_at) VALUES ('inv-prod-1790521595963', 'prod-1790521595963', 'DAISY-PROD-481', 'coat', 'tops', 10, 0, '[{"name":"Black","code":"#111111","images":["/uploads/img_clean_1790522542447_5hor.jpg"]}]', '[{"size":"Free Size","stock":10}]', '2026-09-27T17:13:00.876Z');
REPLACE INTO `products` (id, slug, name, description, details, fabric_care, category, subcategory, collections, price, sale_price, discount_percentage, rating, review_count, is_trending, is_new_arrival, is_best_seller, is_sale, is_out_of_stock, colors, sizes, sku, reviews, inside_valley_fee, outside_valley_fee, is_free_delivery, seo, created_at) VALUES ('prod-1790522449020', 'product-1', 'product 1', 'Elegant women’s fashion piece designed for effortless confidence.', '[]', '', 'tops', NULL, '[]', 1999, 1599, 20, 4.8, 1, 0, 0, 0, 0, 0, '[{"name":"Black","code":"#111111","images":["https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop","https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1000&auto=format&fit=crop"]}]', '[{"size":"Free Size","stock":10}]', 'DAISY-PROD-140', '[]', 100, 200, 0, NULL, '2026-09-27T15:20:49.020Z');
REPLACE INTO `inventory` (id, product_id, sku, product_name, category, total_stock, is_out_of_stock, colors, sizes, updated_at) VALUES ('inv-prod-1790522449020', 'prod-1790522449020', 'DAISY-PROD-140', 'product 1', 'tops', 10, 0, '[{"name":"Black","code":"#111111","images":["https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop","https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1000&auto=format&fit=crop"]}]', '[{"size":"Free Size","stock":10}]', '2026-09-27T17:13:00.877Z');
