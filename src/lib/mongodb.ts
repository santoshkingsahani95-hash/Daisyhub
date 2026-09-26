import mongoose from 'mongoose';

const DEFAULT_FALLBACK_URI = 'mongodb://santoshkingsahani95_db_user:Daisyhubb123@ac-bgczwid-shard-00-00.8pmx4rq.mongodb.net:27017,ac-bgczwid-shard-00-01.8pmx4rq.mongodb.net:27017,ac-bgczwid-shard-00-02.8pmx4rq.mongodb.net:27017/ace-garment?ssl=true&replicaSet=atlas-940b4o-shard-0&authSource=admin&appName=Daisyhub';

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  let targetUri = process.env.MONGODB_URI || DEFAULT_FALLBACK_URI;

  if (targetUri.includes('<db_username>') || targetUri.includes('<db_password>')) {
    targetUri = DEFAULT_FALLBACK_URI;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
    };

    cached.promise = mongoose
      .connect(targetUri, opts)
      .then((m) => {
        console.log('✅ Connected to MongoDB Atlas');
        return m;
      })
      .catch(async (err) => {
        console.warn(`[MongoDB Primary Connection Warning]: ${err.message}. Attempting fallback connection...`);
        try {
          const fallbackConn = await mongoose.connect(DEFAULT_FALLBACK_URI, opts);
          console.log('✅ Connected to MongoDB Atlas (via Direct Shard Fallback)');
          return fallbackConn;
        } catch (fallbackErr: any) {
          console.error('❌ MongoDB Connection Error:', fallbackErr.message);
          cached.promise = null;
          return null;
        }
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
