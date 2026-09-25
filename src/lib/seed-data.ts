import { Product, Category, Collection, HomepageCMS } from '@/types';

export const initialCategories: Category[] = [
  {
    id: 'cat-tops',
    slug: 'tops',
    name: 'Tops',
    description: 'Elevated basic tees, satin blouses, ribbed crops & knitwear crafted for everyday style.',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop',
    subcategories: ['Basic Tops', 'Crop Tops', 'Ribbed Tops', 'Shirts', 'Blouses', 'Tank Tops'],
  },
  {
    id: 'cat-dresses',
    slug: 'dresses',
    name: 'Dresses',
    description: 'Effortless mini, midi, and maxi dresses designed to make a confident statement.',
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=1000&auto=format&fit=crop',
    subcategories: ['Mini Dresses', 'Midi Dresses', 'Maxi Dresses', 'Casual Dresses', 'Party Dresses'],
  },
  {
    id: 'cat-bottoms',
    slug: 'bottoms',
    name: 'Bottoms',
    description: 'Tailored trousers, high-waisted denim, cargo pants & chic skirts.',
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1000&auto=format&fit=crop',
    subcategories: ['Jeans', 'Trousers', 'Cargo Pants', 'Skirts', 'Shorts'],
  },
  {
    id: 'cat-sets',
    slug: 'sets',
    name: 'Sets',
    description: 'Matching two-piece co-ords and tailored lounge sets for instant coordination.',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1000&auto=format&fit=crop',
    subcategories: ['Co-ord Sets', 'Two Piece Sets', 'Casual Sets'],
  },
];

export const initialCollections: Collection[] = [
  {
    id: 'col-everyday',
    slug: 'everyday-essentials',
    name: 'Everyday Essentials',
    description: 'Minimalist foundation pieces you will reach for daily.',
    image: 'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 'col-party',
    slug: 'party-edits',
    name: 'Party Edits',
    description: 'Satin silhouettes, structured mini dresses and glamorous night-out looks.',
    image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 'col-office',
    slug: 'office-formal',
    name: 'Office & Formal',
    description: 'Sleek trousers, sharp blazers and elegant poplin button-downs.',
    image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 'col-casual',
    slug: 'casual-chic',
    name: 'Casual Chic',
    description: 'Relaxed fits, rib-knit co-ords and laid-back sophistication.',
    image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 'col-weekend',
    slug: 'weekend-looks',
    name: 'Weekend Looks',
    description: 'Breezy linen sets and effortless maxi dresses for weekend ease.',
    image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=1000&auto=format&fit=crop',
  },
];

export const seedProducts: Product[] = [];

export const initialCMS: HomepageCMS = {
  announcementBar: {
    enabled: true,
    text: 'FREE DELIVERY ACROSS NEPAL ON ORDERS ABOVE NPR 3,000 | SHOP NEW ARRIVALS NOW',
  },
  hero: {
    heading: 'YOUR STYLE.\nYOUR STATEMENT.',
    subtitle: 'Discover modern women’s fashion designed for every version of you. Elevated essentials, liquid satin, and precision tailoring.',
    buttonText: 'SHOP NEW ARRIVALS',
    buttonUrl: '/category/new-arrivals',
    secondaryButtonText: 'EXPLORE COLLECTIONS',
    secondaryButtonUrl: '/shop',
    desktopImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2000&auto=format&fit=crop',
    mobileImage: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop',
  },
  editorialBanner: {
    heading: 'EFFORTLESSLY YOU',
    subtitle: 'Timeless pieces made for everyday confidence. Clean silhouettes, luxury fabrics, and understated modern elegance.',
    buttonText: 'EXPLORE COLLECTION',
    buttonUrl: '/shop',
    image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=2000&auto=format&fit=crop',
  },
  instagramImages: [
    {
      id: 'ig-1',
      imageUrl: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=800&auto=format&fit=crop',
      postUrl: 'https://www.instagram.com/daisy_hubnp?stkn=MTh4dTQzeGxoMXpnYg==',
    },
    {
      id: 'ig-2',
      imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop',
      postUrl: 'https://www.instagram.com/daisy_hubnp?stkn=MTh4dTQzeGxoMXpnYg==',
    },
    {
      id: 'ig-3',
      imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop',
      postUrl: 'https://www.instagram.com/daisy_hubnp?stkn=MTh4dTQzeGxoMXpnYg==',
    },
    {
      id: 'ig-4',
      imageUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=800&auto=format&fit=crop',
      postUrl: 'https://www.instagram.com/daisy_hubnp?stkn=MTh4dTQzeGxoMXpnYg==',
    },
    {
      id: 'ig-5',
      imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=800&auto=format&fit=crop',
      postUrl: 'https://www.instagram.com/daisy_hubnp?stkn=MTh4dTQzeGxoMXpnYg==',
    },
    {
      id: 'ig-6',
      imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop',
      postUrl: 'https://www.instagram.com/daisy_hubnp?stkn=MTh4dTQzeGxoMXpnYg==',
    },
  ],
  fonepaySettings: {
    qrMode: 'static',
    qrImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop',
    merchantName: 'DAISY HUB PVT LTD',
    merchantCode: 'DAISY8849',
    accountNumber: '9841234567',
    instructions: 'Scan this official Fonepay QR code using any Mobile Banking app or digital wallet to complete payment.',
    autoVerifyEnabled: true,
  },
};
