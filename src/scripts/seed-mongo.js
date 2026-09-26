const mongoose = require('mongoose');

const uri = 'mongodb://santoshkingsahani95_db_user:Daisyhubb123@ac-bgczwid-shard-00-00.8pmx4rq.mongodb.net:27017,ac-bgczwid-shard-00-01.8pmx4rq.mongodb.net:27017,ac-bgczwid-shard-00-02.8pmx4rq.mongodb.net:27017/ace-garment?ssl=true&replicaSet=atlas-940b4o-shard-0&authSource=admin&appName=Daisyhub';

const initialCategories = [
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
    subcategories: ['Pants & Trousers', 'Jeans', 'Skirts', 'Palazzos'],
  },
  {
    id: 'cat-sets',
    slug: 'sets',
    name: 'Co-ord Sets',
    description: 'Matching two-piece sets, blazer sets, and loungewear combos.',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop',
    subcategories: ['Two-Piece Sets', 'Blazer Sets', 'Loungewear Sets'],
  },
];

const initialCollections = [
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
  {
    id: 'col-sale',
    slug: 'sale',
    name: 'Special Offers',
    description: 'Exclusive discounts and seasonal promotions.',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=800&auto=format&fit=crop',
  },
];

const seedProducts = [
  {
    id: 'prod-flora-maxi',
    slug: 'floral-chiffon-maxi-dress',
    name: 'Floral Chiffon Tiered Maxi Dress',
    description: 'An elegant floral printed chiffon maxi dress featuring delicate ruffles, a cinched waistline, and comfortable inner lining. Perfect for daytime events and gatherings.',
    details: ['100% Premium Chiffon fabric', 'Full soft cotton lining', 'Elastic waistband with self-tie belt', 'Breathable and lightweight'],
    fabricCare: 'Hand wash in cold water or dry clean. Do not bleach. Cool iron if needed.',
    category: 'dresses',
    subcategory: 'Maxi Dresses',
    collections: ['new-arrivals', 'best-sellers', 'trending'],
    price: 3200,
    salePrice: 2650,
    discountPercentage: 17,
    rating: 4.9,
    reviewCount: 18,
    isTrending: true,
    isNewArrival: true,
    isBestSeller: true,
    isSale: true,
    isOutOfStock: false,
    colors: [
      {
        name: 'Pastel Floral',
        code: '#e8c5c8',
        images: [
          'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?q=80&w=800&auto=format&fit=crop',
        ],
        stock: 12,
      },
      {
        name: 'Sage Floral',
        code: '#9caf88',
        images: [
          'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=800&auto=format&fit=crop',
        ],
        stock: 8,
      },
    ],
    sizes: [
      { size: 'S', stock: 5, sku: 'DH-DRS-01-S' },
      { size: 'M', stock: 8, sku: 'DH-DRS-01-M' },
      { size: 'L', stock: 7, sku: 'DH-DRS-01-L' },
    ],
    sku: 'DH-DRS-01',
    createdAt: new Date().toISOString(),
    reviews: [
      {
        id: 'rev-1',
        userName: 'Aayusha Shrestha',
        rating: 5,
        comment: 'Absolutely stunning dress! The fabric is lightweight and super comfortable. Received so many compliments!',
        createdAt: '2026-02-14',
        verifiedPurchase: true,
      },
      {
        id: 'rev-2',
        userName: 'Pooja Thapa',
        rating: 5,
        comment: 'Great fitting and fast delivery in Lalitpur. Will order again from DaisyHub!',
        createdAt: '2026-02-20',
        verifiedPurchase: true,
      },
    ],
    insideValleyFee: 100,
    outsideValleyFee: 200,
    isFreeDelivery: false,
  },
  {
    id: 'prod-satin-coord',
    slug: 'luxurious-satin-two-piece-coord-set',
    name: 'Luxurious Satin Two-Piece Co-ord Set',
    description: 'Chic two-piece satin co-ord set featuring a button-up shirt and wide-leg matching trousers. Premium silky sheen with ultra-soft handfeel.',
    details: ['High grade silk satin blend', 'Relaxed fit shirt with lapel collar', 'High-waist elasticated trousers with side pockets'],
    fabricCare: 'Dry clean recommended or gentle hand wash in cold water.',
    category: 'sets',
    subcategory: 'Two-Piece Sets',
    collections: ['new-arrivals', 'best-sellers', 'trending'],
    price: 3800,
    salePrice: 3290,
    discountPercentage: 13,
    rating: 4.8,
    reviewCount: 14,
    isTrending: true,
    isNewArrival: true,
    isBestSeller: true,
    isSale: true,
    isOutOfStock: false,
    colors: [
      {
        name: 'Emerald Green',
        code: '#046307',
        images: [
          'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop',
        ],
        stock: 10,
      },
      {
        name: 'Champagne Beige',
        code: '#f5e6d3',
        images: [
          'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop',
        ],
        stock: 6,
      },
    ],
    sizes: [
      { size: 'S', stock: 4, sku: 'DH-SET-01-S' },
      { size: 'M', stock: 7, sku: 'DH-SET-01-M' },
      { size: 'L', stock: 5, sku: 'DH-SET-01-L' },
    ],
    sku: 'DH-SET-01',
    createdAt: new Date().toISOString(),
    reviews: [
      {
        id: 'rev-3',
        userName: 'Smarika Maharjan',
        rating: 5,
        comment: 'Very elegant satin set. Fits perfectly and looks super high-end.',
        createdAt: '2026-03-01',
        verifiedPurchase: true,
      },
    ],
    insideValleyFee: 100,
    outsideValleyFee: 200,
    isFreeDelivery: true,
  },
  {
    id: 'prod-linen-blouse',
    slug: 'classic-linen-button-down-shirt',
    name: 'Classic Linen Button-Down Oversized Shirt',
    description: 'Versatile oversized button-down shirt crafted from breathable cotton-linen blend. Ideal for layering or casual everyday wear.',
    details: ['Organic cotton linen blend', 'Oversized silhouette', 'Chest pocket detail', 'Mother-of-pearl finish buttons'],
    fabricCare: 'Machine wash warm on gentle cycle. Tumble dry low.',
    category: 'tops',
    subcategory: 'Shirts',
    collections: ['new-arrivals', 'trending'],
    price: 2400,
    salePrice: 1990,
    discountPercentage: 17,
    rating: 4.7,
    reviewCount: 9,
    isTrending: true,
    isNewArrival: true,
    isBestSeller: false,
    isSale: true,
    isOutOfStock: false,
    colors: [
      {
        name: 'Crisp White',
        code: '#ffffff',
        images: [
          'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop',
        ],
        stock: 15,
      },
      {
        name: 'Sky Blue',
        code: '#87ceeb',
        images: [
          'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=800&auto=format&fit=crop',
        ],
        stock: 9,
      },
    ],
    sizes: [
      { size: 'Free Size', stock: 24, sku: 'DH-TOP-01-FS' },
    ],
    sku: 'DH-TOP-01',
    createdAt: new Date().toISOString(),
    reviews: [],
    insideValleyFee: 100,
    outsideValleyFee: 200,
    isFreeDelivery: false,
  },
  {
    id: 'prod-pleated-trousers',
    slug: 'high-waist-wide-leg-pleated-trousers',
    name: 'High-Waist Wide-Leg Pleated Trousers',
    description: 'Sophisticated tailored trousers with front pleats, slant pockets, and a flattering high-waist fit. Perfect for office and evening wear.',
    details: ['Premium crepe suiting fabric', 'Front zipper with hook & bar closure', 'Deep side slant pockets', 'Straight wide-leg cut'],
    fabricCare: 'Machine wash cold inside out. Hang dry.',
    category: 'bottoms',
    subcategory: 'Pants & Trousers',
    collections: ['best-sellers', 'trending'],
    price: 2800,
    salePrice: 2400,
    discountPercentage: 14,
    rating: 4.9,
    reviewCount: 22,
    isTrending: true,
    isNewArrival: false,
    isBestSeller: true,
    isSale: true,
    isOutOfStock: false,
    colors: [
      {
        name: 'Jet Black',
        code: '#1a1a1a',
        images: [
          'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=800&auto=format&fit=crop',
        ],
        stock: 18,
      },
      {
        name: 'Camel Tan',
        code: '#c19a6b',
        images: [
          'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=800&auto=format&fit=crop',
        ],
        stock: 14,
      },
    ],
    sizes: [
      { size: 'S (26-27)', stock: 8, sku: 'DH-BTM-01-S' },
      { size: 'M (28-29)', stock: 12, sku: 'DH-BTM-01-M' },
      { size: 'L (30-31)', stock: 10, sku: 'DH-BTM-01-L' },
      { size: 'XL (32-33)', stock: 6, sku: 'DH-BTM-01-XL' },
    ],
    sku: 'DH-BTM-01',
    createdAt: new Date().toISOString(),
    reviews: [],
    insideValleyFee: 100,
    outsideValleyFee: 200,
    isFreeDelivery: false,
  },
];

const initialCMS = {
  key: 'homepage',
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
  instagramImages: [
    {
      id: 'ig-1',
      imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop',
      postUrl: 'https://www.instagram.com/daisy_hubnp',
    },
    {
      id: 'ig-2',
      imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=600&auto=format&fit=crop',
      postUrl: 'https://www.instagram.com/daisy_hubnp',
    },
    {
      id: 'ig-3',
      imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=600&auto=format&fit=crop',
      postUrl: 'https://www.instagram.com/daisy_hubnp',
    },
    {
      id: 'ig-4',
      imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=600&auto=format&fit=crop',
      postUrl: 'https://www.instagram.com/daisy_hubnp',
    },
  ],
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
    metaTitle: "DaisyHub (daissyhub.com) – Best Women's Clothing & Ladies Fashion Store Online in Nepal",
    metaDescription: "DaisyHub (daissyhub.com) is Nepal's premier online ladies clothing boutique. Shop exclusive women's fashion, ladies dresses, tops, trousers, co-ord sets, and trendy apparel with fast delivery across Kathmandu & all Nepal.",
    keywords: "daissyhub.com, daisyhub.com, daisyhubb.com, daisyhub, Daisy Hub Nepal, ladies clothing Nepal, women's clothing online Nepal, ladies dresses online Nepal, best ladies clothing store in Kathmandu",
    canonicalUrl: 'https://daissyhub.com',
    ogImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop',
    h1: "DaisyHub – Premium Ladies Clothing & Women's Fashion Online in Nepal",
  },
};

const initialUser = {
  id: 'usr-admin-1',
  name: 'Admin Manager',
  email: 'admin@daisyhub.com',
  mobile: '+977 9800000000',
  role: 'ADMIN',
  registrationDate: '2026-01-01',
};

async function seedDatabase() {
  console.log('🌱 Starting MongoDB Atlas Database Population...');

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log('✅ Connected to MongoDB Atlas: ace-garment');

    const db = mongoose.connection.db;

    // 1. Seed Products
    const prodCol = db.collection('products');
    await prodCol.deleteMany({});
    await prodCol.insertMany(seedProducts);
    console.log(`✓ Seeded ${seedProducts.length} Products into MongoDB Atlas!`);

    // 2. Seed Categories
    const catCol = db.collection('categories');
    await catCol.deleteMany({});
    await catCol.insertMany(initialCategories);
    console.log(`✓ Seeded ${initialCategories.length} Categories into MongoDB Atlas!`);

    // 3. Seed Collections
    const colCol = db.collection('collections');
    await colCol.deleteMany({});
    await colCol.insertMany(initialCollections);
    console.log(`✓ Seeded ${initialCollections.length} Collections into MongoDB Atlas!`);

    // 4. Seed CMS & Settings
    const cmsCol = db.collection('cms');
    await cmsCol.deleteMany({});
    await cmsCol.insertOne(initialCMS);
    console.log('✓ Seeded Homepage CMS into MongoDB Atlas!');

    // 5. Seed Admin User
    const userCol = db.collection('users');
    const existingAdmin = await userCol.findOne({ id: initialUser.id });
    if (!existingAdmin) {
      await userCol.insertOne(initialUser);
      console.log('✓ Seeded Admin Manager into MongoDB Atlas!');
    }

    const collections = await db.listCollections().toArray();
    console.log('\n🎉 ALL TABLES POPULATED SUCCESSFULLY IN MONGODB ATLAS!');
    console.log('MongoDB Atlas Collections List:', collections.map(c => c.name));

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ MongoDB Atlas Seeding Error:', err);
    process.exit(1);
  }
}

seedDatabase();
