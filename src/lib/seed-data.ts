import { Product, Category, Collection, HomepageCMS } from '@/types';

export const initialCategories: Category[] = [];

export const initialCollections: Collection[] = [];

export const seedProducts: Product[] = [];

export const initialCMS: HomepageCMS = {
  announcementBar: {
    enabled: true,
    text: 'WELCOME TO DAISY HUB | SHOP NOW',
  },
  hero: {
    heading: 'ELEVATED STYLE',
    subtitle: 'Discover modern fashion designed for everyday confidence.',
    buttonText: 'SHOP NOW',
    buttonUrl: '/shop',
    secondaryButtonText: 'EXPLORE',
    secondaryButtonUrl: '/shop',
    desktopImage: '',
    mobileImage: '',
  },
  editorialBanner: {
    heading: 'NEW ARRIVALS',
    subtitle: 'Explore our latest collection.',
    buttonText: 'EXPLORE',
    buttonUrl: '/shop',
    image: '',
  },
  instagramImages: [],
  fonepaySettings: {
    qrMode: 'static',
    qrImageUrl: '',
    merchantName: 'DAISY HUB PVT LTD',
    merchantCode: '',
    accountNumber: '',
    instructions: 'Scan official Fonepay QR code to complete payment.',
    autoVerifyEnabled: true,
  },
};
