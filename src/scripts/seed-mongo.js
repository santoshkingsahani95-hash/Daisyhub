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

const seedProducts = [];

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

    // 1. Seed Products & Inventory (Cleared)
    const prodCol = db.collection('products');
    await prodCol.deleteMany({});
    if (seedProducts.length > 0) {
      await prodCol.insertMany(seedProducts);
    }
    console.log(`✓ Cleared Products in MongoDB Atlas (${seedProducts.length} remaining)!`);

    const invCol = db.collection('inventory');
    await invCol.deleteMany({});
    const seedInventory = seedProducts.map((p) => {
      const totalStock = p.colors && p.colors.length > 0
        ? p.colors.reduce((sum, c) => sum + (c.stock || 0), 0)
        : (p.sizes ? p.sizes.reduce((sum, s) => sum + (s.stock || 0), 0) : 0);
      return {
        id: `inv-${p.id}`,
        productId: p.id,
        sku: p.sku,
        productName: p.name,
        category: p.category,
        totalStock,
        isOutOfStock: totalStock <= 0,
        colors: p.colors || [],
        sizes: p.sizes || [],
        updatedAt: new Date().toISOString(),
      };
    });
    if (seedInventory.length > 0) {
      await invCol.insertMany(seedInventory);
    }
    console.log(`✓ Cleared Inventory in MongoDB Atlas (${seedInventory.length} remaining)!`);

    // Clear Orders and Coupons test data
    const ordCol = db.collection('orders');
    await ordCol.deleteMany({});
    console.log('✓ Cleared test Orders in MongoDB Atlas!');

    const coupCol = db.collection('coupons');
    await coupCol.deleteMany({});
    console.log('✓ Cleared test Coupons in MongoDB Atlas!');
    console.log(`✓ Seeded ${seedInventory.length} Inventory items into MongoDB Atlas 'inventory' table!`);

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

    // 5. Seed Delivery Rates (77 Nepal Districts)
    const NEPAL_PROVINCES = [
      { name: 'Koshi Province', districts: ['Bhojpur', 'Dhankuta', 'Ilam', 'Jhapa', 'Khotang', 'Morang', 'Okhaldhunga', 'Panchthar', 'Sankhuwasabha', 'Solukhumbu', 'Sunsari', 'Taplejung', 'Terhathum', 'Udayapur'] },
      { name: 'Madhesh Province', districts: ['Bara', 'Dhanusha', 'Mahottari', 'Parsa', 'Rautahat', 'Saptari', 'Sarlahi', 'Siraha'] },
      { name: 'Bagmati Province', districts: ['Bhaktapur', 'Chitwan', 'Dhading', 'Dolakha', 'Kathmandu', 'Kavrepalanchok', 'Lalitpur', 'Makwanpur', 'Nuwakot', 'Ramechhap', 'Rasuwa', 'Sindhuli', 'Sindhupalchok'] },
      { name: 'Gandaki Province', districts: ['Baglung', 'Gorkha', 'Kaski', 'Lamjung', 'Manang', 'Mustang', 'Myagdi', 'Nawalpur', 'Parbat', 'Syangja', 'Tanahun'] },
      { name: 'Lumbini Province', districts: ['Arghakhanchi', 'Banke', 'Bardiya', 'Dang', 'Gulmi', 'Kapilvastu', 'Parasi', 'Palpa', 'Pyuthan', 'Rolpa', 'Rukum East', 'Rupandehi'] },
      { name: 'Karnali Province', districts: ['Dailekh', 'Dolpa', 'Humla', 'Jajarkot', 'Jumla', 'Kalikot', 'Mugu', 'Salyan', 'Surkhet', 'Rukum West'] },
      { name: 'Sudurpashchim Province', districts: ['Achham', 'Baitadi', 'Bajhang', 'Bajura', 'Dadeldhura', 'Darchula', 'Doti', 'Kailali', 'Kanchanpur'] },
    ];

    const initialRates = [];
    NEPAL_PROVINCES.forEach((province) => {
      province.districts.forEach((district) => {
        const isValley = ['Kathmandu', 'Lalitpur', 'Bhaktapur'].includes(district);
        initialRates.push({
          district,
          province: province.name,
          deliveryFee: isValley ? 100 : 180,
          enabled: true,
          homeDeliveryFee: isValley ? 100 : 180,
          branchDeliveryFee: isValley ? 50 : 120,
          homeDeliveryEnabled: true,
          branchDeliveryEnabled: true,
        });
      });
    });

    const delRatesCol = db.collection('delivery_rates');
    await delRatesCol.deleteMany({});
    await delRatesCol.insertMany(initialRates);
    console.log(`✓ Seeded ${initialRates.length} Nepal District Delivery Rates into MongoDB Atlas 'delivery_rates' collection!`);

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
