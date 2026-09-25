const mongoose = require('mongoose');

const uri = 'mongodb://santoshkingsahani95_db_user:Daisyhub123@ac-bgczwid-shard-00-00.8pmx4rq.mongodb.net:27017,ac-bgczwid-shard-00-01.8pmx4rq.mongodb.net:27017,ac-bgczwid-shard-00-02.8pmx4rq.mongodb.net:27017/ace-garment?ssl=true&replicaSet=atlas-940b4o-shard-0&authSource=admin&appName=Daisyhub';

async function testConnection() {
  console.log('Testing connection to MongoDB Atlas direct shard hosts with Daisyhub123...');
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log('\n🎉 SUCCESS! Connected to MongoDB Atlas cluster Daisyhub!\n');
    
    // Check database collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Existing collections:', collections.map(c => c.name));

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.log(`Failed: ${err.message}`);
    process.exit(1);
  }
}

testConnection();
