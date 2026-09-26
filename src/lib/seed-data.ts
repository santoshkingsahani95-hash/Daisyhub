import { Product, Category, Collection, HomepageCMS } from '@/types';
import { generateDefaultDeliveryRates } from './nepal-locations';

export const initialCategories: Category[] = [
  {
    id: 'cat-dresses',
    slug: 'dresses',
    name: 'Dresses',
    description: 'Elegant maxi dresses, midi dresses, and casual day wear for women in Nepal.',
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop',
    subcategories: ['Maxi Dresses', 'Midi Dresses', 'Party Dresses', 'Casual Dresses'],
  },
  {
    id: 'cat-tops',
    slug: 'tops',
    name: 'Tops & Shirts',
    description: 'Stylish blouses, crop tops, casual t-shirts, and chic shirts.',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop',
    subcategories: ['Blouses', 'Crop Tops', 'Shirts', 'Casual Tops'],
  },
  {
    id: 'cat-bottoms',
    slug: 'bottoms',
    name: 'Bottoms & Trousers',
    description: 'High-waist pants, trendy jeans, pleated skirts, and comfortable trousers.',
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=800&auto=format&fit=crop',
    subcategories: ['Pants & Trousers', 'Jeans', 'Skirts'],
  },
  {
    id: 'cat-sets',
    slug: 'sets',
    name: 'Co-ord Sets',
    description: 'Matching two-piece sets, blazer sets, and loungewear combos.',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop',
    subcategories: ['Two-Piece Sets', 'Blazer Sets'],
  },
];

export const initialCollections: Collection[] = [
  {
    id: 'col-new-arrivals',
    slug: 'new-arrivals',
    name: 'New Arrivals',
    description: 'Fresh fashion drops direct from the design studio.',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'col-best-sellers',
    slug: 'best-sellers',
    name: 'Best Sellers',
    description: 'Most loved styles by DaisyHub customers across Nepal.',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'col-trending',
    slug: 'trending',
    name: 'Trending Now',
    description: 'Hot viral styles trending on social media.',
    image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=800&auto=format&fit=crop',
  },
];

export const seedProducts: Product[] = [];

export const initialCMS: HomepageCMS = {
  announcementBar: {
    enabled: true,
    text: 'WELCOME TO DAISY HUB (daissyhub.com) | FREE DELIVERY ACROSS NEPAL ON ORDERS ABOVE NPR 3,000',
  },
  hero: {
    heading: 'ELEVATED WOMEN\'S FASHION',
    subtitle: 'Discover Nepal\'s premier online ladies clothing boutique.',
    buttonText: 'SHOP COLLECTION',
    buttonUrl: '/shop',
    secondaryButtonText: 'NEW ARRIVALS',
    secondaryButtonUrl: '/shop?category=new-arrivals',
    desktopImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1600&auto=format&fit=crop',
    mobileImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800&auto=format&fit=crop',
  },
  editorialBanner: {
    heading: 'TRENDING CO-ORD SETS & DRESSES',
    subtitle: 'Step out with effortless elegance and modern silhouette.',
    buttonText: 'EXPLORE NOW',
    buttonUrl: '/shop',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1200&auto=format&fit=crop',
  },
  instagramImages: [],
  fonepaySettings: {
    qrMode: 'static',
    qrImageUrl: '',
    merchantName: 'DAISY HUB PVT LTD',
    merchantCode: '',
    accountNumber: '',
    instructions: 'Scan official Fonepay QR code to complete payment instantly.',
    autoVerifyEnabled: true,
  },
  deliveryRates: generateDefaultDeliveryRates(),
  seo: {
    metaTitle: "DaisyHub – Best Women's Clothing & Ladies Fashion Store Online in Nepal",
    metaDescription: "DaisyHub is Nepal's premier online ladies clothing boutique. Shop exclusive women's fashion, ladies dresses, tops, trousers, co-ord sets, and trendy apparel with fast delivery across Kathmandu & all Nepal.",
    keywords: "daisyhub, Daisy Hub Nepal, ladies clothing Nepal, women's clothing online Nepal, ladies dresses online Nepal, best ladies clothing store in Kathmandu",
    canonicalUrl: 'https://daissyhub.com',
    ogImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop',
    h1: "DaisyHub – Premium Ladies Clothing & Women's Fashion Online in Nepal",
  },
};

