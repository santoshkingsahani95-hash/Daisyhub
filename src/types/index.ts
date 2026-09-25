export interface ColorOption {
  name: string;
  code: string; // hex string e.g. #000000
  images: string[];
  price?: number; // custom price override for this color variant
  salePrice?: number; // custom sale price override for this color variant
  sizes?: SizeVariant[]; // size stock for this color option
  stock?: number; // individual stock level for this specific color variant
}

export interface SizeVariant {
  size: 'Free Size' | 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | string;
  stock: number;
  sku?: string;
}

export interface ProductVariant {
  id: string;
  colorName: string;
  colorCode: string;
  size: string;
  stock: number;
  sku: string;
  price?: number;
  salePrice?: number;
}

export interface ProductReview {
  id: string;
  userName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
  verifiedPurchase: boolean;
  userImage?: string;
  images?: string[];
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  details?: string[];
  fabricCare?: string;
  category: 'tops' | 'dresses' | 'bottoms' | 'sets' | string;
  subcategory?: string;
  collections?: string[]; // e.g. ['new-arrivals', 'best-sellers', 'trending', 'sale', 'everyday-essentials', 'party-edits']
  price: number; // in NPR
  salePrice?: number; // in NPR
  discountPercentage?: number;
  rating: number;
  reviewCount: number;
  isTrending?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isSale?: boolean;
  isOutOfStock?: boolean;
  colors: ColorOption[];
  sizes: SizeVariant[];
  variants?: ProductVariant[];
  sku: string;
  createdAt: string;
  reviews?: ProductReview[];
  insideValleyFee?: number;
  outsideValleyFee?: number;
  isFreeDelivery?: boolean;
  seo?: SEOMetadata;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  subcategories: string[];
  seo?: SEOMetadata;
}

export interface Collection {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  seo?: SEOMetadata;
}

export interface CartItem {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  image: string;
  colorName: string;
  colorCode: string;
  size: string;
  price: number; // current price (salePrice if available)
  originalPrice: number;
  quantity: number;
  sku: string;
  maxStock?: number;
}

export interface WishlistItem {
  productId: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  salePrice?: number;
  category: string;
  colors: string[];
}

export interface Address {
  id?: string;
  fullName: string;
  mobile: string;
  email: string;
  province: string;
  district: string;
  city: string;
  streetAddress: string;
  landmark?: string;
  deliveryType?: 'home' | 'branch';
  isDefault?: boolean;
}

export type PaymentMethod = 'cod' | 'esewa' | 'khalti' | 'fonepay' | 'card';

export interface OrderItem {
  productId: string;
  productName: string;
  colorName: string;
  size: string;
  quantity: number;
  price: number;
  image: string;
}

export type OrderStatus = 'Pending' | 'Out for Delivery' | 'Cancelled';

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  orderStatus: OrderStatus;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  shippingAddress: Address;
  deliveryType?: 'home' | 'branch';
  estimatedDelivery: string;
  trackingNumber?: string;
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  expiryDate: string;
  active: boolean;
}

export interface DistrictDeliveryRate {
  district: string;
  province: string;
  deliveryFee: number;
  enabled: boolean;
  homeDeliveryFee?: number;
  branchDeliveryFee?: number;
  homeDeliveryEnabled?: boolean;
  branchDeliveryEnabled?: boolean;
}

export interface FonepayQRItem {
  id: string;
  qrImageUrl: string;
  merchantName: string;
  merchantCode: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface FonepaySettings {
  qrMode: 'static' | 'dynamic';
  qrImageUrl: string;
  merchantName: string;
  merchantCode: string;
  accountNumber?: string;
  instructions: string;
  autoVerifyEnabled: boolean;
  apiUsername?: string;
  apiPassword?: string;
  apiKey?: string;
  savedQrs?: FonepayQRItem[];
}

export interface SEOMetadata {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  keywords?: string;
  noIndex?: boolean;
  h1?: string;
  categoryDescription?: string;
}

export interface HomepageCMS {
  announcementBar: {
    enabled: boolean;
    text: string;
  };
  hero: {
    heading: string;
    subtitle: string;
    buttonText: string;
    buttonUrl: string;
    secondaryButtonText: string;
    secondaryButtonUrl: string;
    desktopImage: string;
    mobileImage: string;
  };
  editorialBanner: {
    heading: string;
    subtitle: string;
    buttonText: string;
    buttonUrl: string;
    image: string;
  };
  instagramImages: {
    id: string;
    imageUrl: string;
    postUrl: string;
  }[];
  fonepaySettings?: FonepaySettings;
  deliveryRates?: DistrictDeliveryRate[];
  seo?: SEOMetadata;
}

export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  password?: string;
  role: 'CUSTOMER' | 'ADMIN' | 'MANAGER';
  registrationDate: string;
  isBlocked?: boolean;
  addresses?: Address[];
}

export interface AdminCredentials {
  username: string;
  password: string;
  lastUpdated?: string;
}
