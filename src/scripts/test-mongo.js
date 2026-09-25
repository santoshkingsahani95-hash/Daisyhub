const mongoose = require('mongoose');

const usernamesToTry = ['admin', 'daisyhub', 'santosh', 'user', 'acegarment', 'ace_garment', 'daisyhubb', 'root'];
const pass = 'El8CFrNcwCn3Adgg';
const baseUri = 'ac-bgczwid-shard-00-00.8pmx4rq.mongodb.net:27017,ac-bgczwid-shard-00-01.8pmx4rq.mongodb.net:27017,ac-bgczwid-shard-00-02.8pmx4rq.mongodb.net:27017/ace-garment?ssl=true&replicaSet=atlas-940b4o-shard-0&authSource=admin&appName=Daisyhub';

async function testConnections() {
  for (const user of usernamesToTry) {
    const uri = `mongodb://${user}:${pass}@${baseUri}`;
    console.log(`Trying username: ${user}...`);
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
      console.log(`\n🎉 SUCCESS! Connected to MongoDB Atlas with username: ${user}\n`);
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.log(`Failed with username ${user}: ${err.message}`);
    }
  }
  console.log('\nCould not connect with guessed usernames.');
  process.exit(1);
}

testConnections();
