const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const uri = 'mongodb://santoshkingsahani95_db_user:Daisyhub123@ac-bgczwid-shard-00-00.8pmx4rq.mongodb.net:27017,ac-bgczwid-shard-00-01.8pmx4rq.mongodb.net:27017,ac-bgczwid-shard-00-02.8pmx4rq.mongodb.net:27017/ace-garment?ssl=true&replicaSet=atlas-940b4o-shard-0&authSource=admin&appName=Daisyhub';

const dbFilePath = path.join(__dirname, '../../data/db.json');

async function seedDatabase() {
  console.log('🌱 Starting MongoDB Atlas Database Population...');
  
  if (!fs.existsSync(dbFilePath)) {
    console.error('db.json not found at:', dbFilePath);
    process.exit(1);
  }

  const rawData = fs.readFileSync(dbFilePath, 'utf-8');
  const data = JSON.parse(rawData);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log('✅ Connected to MongoDB Atlas: ace-garment');

    const db = mongoose.connection.db;

    // 1. Seed Products
    const prodCol = db.collection('products');
    await prodCol.deleteMany({});
    if (data.products && data.products.length > 0) {
      await prodCol.insertMany(data.products);
      console.log(`✓ Seeded ${data.products.length} Products into MongoDB Atlas!`);
    } else {
      console.log('✓ Cleared all Products from MongoDB Atlas!');
    }

    // 2. Seed Categories
    const catCol = db.collection('categories');
    await catCol.deleteMany({});
    if (data.categories && data.categories.length > 0) {
      await catCol.insertMany(data.categories);
      console.log(`✓ Seeded ${data.categories.length} Categories into MongoDB Atlas!`);
    } else {
      console.log('✓ Cleared all Categories from MongoDB Atlas!');
    }

    // 3. Seed Collections
    const colCol = db.collection('collections');
    await colCol.deleteMany({});
    if (data.collections && data.collections.length > 0) {
      await colCol.insertMany(data.collections);
      console.log(`✓ Seeded ${data.collections.length} Collections into MongoDB Atlas!`);
    } else {
      console.log('✓ Cleared all Collections from MongoDB Atlas!');
    }

    // 4. Seed CMS & Delivery Rates
    if (data.cms) {
      const cmsCol = db.collection('cms');
      await cmsCol.deleteMany({});
      await cmsCol.insertOne({ key: 'homepage', ...data.cms });
      console.log('✓ Seeded Homepage CMS & Nepal Delivery Rates into MongoDB Atlas!');
    }

    // 5. Seed Orders
    const ordCol = db.collection('orders');
    await ordCol.deleteMany({});
    if (data.orders && data.orders.length > 0) {
      await ordCol.insertMany(data.orders);
      console.log(`✓ Seeded ${data.orders.length} Orders into MongoDB Atlas!`);
    } else {
      console.log('✓ Cleared all Orders from MongoDB Atlas!');
    }

    // 6. Seed Coupons
    const coupCol = db.collection('coupons');
    await coupCol.deleteMany({});
    if (data.coupons && data.coupons.length > 0) {
      await coupCol.insertMany(data.coupons);
      console.log(`✓ Seeded ${data.coupons.length} Coupons into MongoDB Atlas!`);
    } else {
      console.log('✓ Cleared all Coupons from MongoDB Atlas!');
    }

    // 7. Seed Users
    const userCol = db.collection('users');
    await userCol.deleteMany({});
    if (data.users && data.users.length > 0) {
      await userCol.insertMany(data.users);
      console.log(`✓ Seeded ${data.users.length} Users into MongoDB Atlas!`);
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
