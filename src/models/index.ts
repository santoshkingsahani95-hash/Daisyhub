import mongoose, { Schema } from 'mongoose';

// 1. Product Schema
const ProductSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    slug: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    details: [{ type: String }],
    fabricCare: { type: String, default: '' },
    category: { type: String, required: true, index: true },
    subcategory: { type: String },
    collections: [{ type: String }],
    price: { type: Number, required: true },
    salePrice: { type: Number },
    discountPercentage: { type: Number },
    rating: { type: Number, default: 4.8 },
    reviewCount: { type: Number, default: 0 },
    isTrending: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isSale: { type: Boolean, default: false },
    isOutOfStock: { type: Boolean, default: false },
    colors: [
      {
        name: String,
        code: String,
        images: [String],
        price: Number,
        salePrice: Number,
        stock: Number,
      },
    ],
    sizes: [
      {
        size: String,
        stock: Number,
        sku: String,
      },
    ],
    sku: { type: String, required: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
    reviews: [
      {
        id: String,
        userName: String,
        rating: Number,
        comment: String,
        createdAt: String,
        verifiedPurchase: Boolean,
        userImage: String,
        images: [String],
      },
    ],
    insideValleyFee: { type: Number, default: 100 },
    outsideValleyFee: { type: Number, default: 200 },
    isFreeDelivery: { type: Boolean, default: false },
    seo: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// 2. Category Schema
const CategorySchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    subcategories: [{ type: String }],
    seo: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// 3. Collection Schema
const CollectionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    seo: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// 4. Order Schema
const OrderSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    orderNumber: { type: String, required: true, index: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
    items: [
      {
        productId: String,
        productName: String,
        colorName: String,
        size: String,
        quantity: Number,
        price: Number,
        image: String,
      },
    ],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    paymentStatus: { type: String, default: 'pending' },
    orderStatus: { type: String, default: 'Pending' },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerMobile: { type: String, required: true },
    shippingAddress: { type: Schema.Types.Mixed },
    estimatedDelivery: { type: String },
    trackingNumber: { type: String },
  },
  { timestamps: true }
);

// 5. Coupon Schema
const CouponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    discountType: { type: String, required: true },
    discountValue: { type: Number, required: true },
    minOrderValue: { type: Number, default: 0 },
    maxDiscount: { type: Number },
    expiryDate: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// 6. CMS Schema
const CMSSchema = new Schema(
  {
    key: { type: String, default: 'homepage', unique: true },
    announcementBar: { type: Schema.Types.Mixed },
    hero: { type: Schema.Types.Mixed },
    editorialBanner: { type: Schema.Types.Mixed },
    instagramImages: [{ type: Schema.Types.Mixed }],
    fonepaySettings: { type: Schema.Types.Mixed },
    deliveryRates: [{ type: Schema.Types.Mixed }],
    seo: { type: Schema.Types.Mixed },
  },
  { timestamps: true, strict: false }
);

// 7. User Schema
const UserSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    mobile: { type: String },
    password: { type: String },
    role: { type: String, default: 'CUSTOMER' },
    registrationDate: { type: String, default: () => new Date().toISOString() },
    isBlocked: { type: Boolean, default: false },
    addresses: [{ type: Schema.Types.Mixed }],
  },
  { timestamps: true }
);

// 8. Inventory Schema
const InventorySchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    productId: { type: String, required: true, index: true },
    sku: { type: String, required: true },
    productName: { type: String, required: true },
    category: { type: String },
    totalStock: { type: Number, default: 0 },
    isOutOfStock: { type: Boolean, default: false },
    colors: [
      {
        name: String,
        code: String,
        stock: Number,
      },
    ],
    sizes: [
      {
        size: String,
        stock: Number,
        sku: String,
      },
    ],
  },
  { timestamps: true }
);

// 9. Delivery Rate Schema
const DeliveryRateSchema = new Schema(
  {
    district: { type: String, required: true, unique: true, index: true },
    province: { type: String, required: true },
    deliveryFee: { type: Number, required: true, default: 180 },
    enabled: { type: Boolean, required: true, default: true },
    homeDeliveryFee: { type: Number },
    branchDeliveryFee: { type: Number },
    homeDeliveryEnabled: { type: Boolean },
    branchDeliveryEnabled: { type: Boolean },
  },
  { timestamps: true }
);

export const ProductModel = mongoose.models.Product || mongoose.model('Product', ProductSchema, 'products');
export const CategoryModel = mongoose.models.Category || mongoose.model('Category', CategorySchema, 'categories');
export const CollectionModel = mongoose.models.Collection || mongoose.model('Collection', CollectionSchema, 'collections');
export const OrderModel = mongoose.models.Order || mongoose.model('Order', OrderSchema, 'orders');
export const CouponModel = mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema, 'coupons');
export const CMSModel = mongoose.models.CMS || mongoose.model('CMS', CMSSchema, 'cms');
export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema, 'users');
export const InventoryModel = mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema, 'inventory');
export const DeliveryRateModel = mongoose.models.DeliveryRate || mongoose.model('DeliveryRate', DeliveryRateSchema, 'delivery_rates');


