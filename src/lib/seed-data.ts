import { Product, Category, Collection, HomepageCMS } from '@/types';

export const initialCategories: Category[] = [];

export const initialCollections: Collection[] = [];

export const seedProducts: Product[] = [];

export const initialCMS: HomepageCMS = {
  announcementBar: {
    enabled: true,
    text: 'WELCOME TO DAISY HUB | FREE DELIVERY ACROSS NEPAL ON ORDERS ABOVE NPR 3,000',
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
  seo: {
    metaTitle: "DaisyHub – Best Women's Clothing & Ladies Fashion Store Online in Nepal",
    metaDescription: "DaisyHub is Nepal's premier online ladies clothing boutique. Shop exclusive women's fashion, ladies dresses, tops, trousers, co-ord sets, and trendy apparel with fast delivery across Kathmandu & all Nepal.",
    keywords: "daisyhub, Daisy Hub Nepal, ladies clothing Nepal, women's clothing online Nepal, ladies dresses online Nepal, best ladies clothing store in Kathmandu",
    canonicalUrl: 'https://daisyhub.com',
    ogImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop',
    h1: "DaisyHub – Premium Ladies Clothing & Women's Fashion Online in Nepal",
  },
};
