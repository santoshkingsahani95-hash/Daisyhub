import mongoose from 'mongoose';

const DEFAULT_FALLBACK_URI = 'mongodb://santoshkingsahani95_db_user:Daisyhubb123@ac-bgczwid-shard-00-00.8pmx4rq.mongodb.net:27017,ac-bgczwid-shard-00-01.8pmx4rq.mongodb.net:27017,ac-bgczwid-shard-00-02.8pmx4rq.mongodb.net:27017/ace-garment?ssl=true&replicaSet=atlas-940b4o-shard-0&authSource=admin&appName=Daisyhub';

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // Reset stale or failed connection state
  if (mongoose.connection.readyState !== 1) {
    cached.conn = null;
    cached.promise = null;
  }

  let targetUri = DEFAULT_FALLBACK_URI;

  if (process.env.MONGODB_URI) {
    let envUri = process.env.MONGODB_URI;
    if (envUri.includes('Daisyhub123@')) {
      envUri = envUri.replace('Daisyhub123@', 'Daisyhubb123@');
    }
    if (!envUri.includes('<db_username>') && !envUri.includes('<db_password>')) {
      targetUri = envUri;
    }
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
      dbName: 'ace-garment',
    };

    cached.promise = mongoose
      .connect(targetUri, opts)
      .then((m) => {
        console.log(`✅ Connected to MongoDB Atlas (Database: ${m.connection.db?.databaseName || 'ace-garment'})`);
        return m;
      })
      .catch(async (err) => {
        console.warn(`[MongoDB Primary Connection Warning]: ${err.message}. Retrying fallback connection...`);
        try {
          await mongoose.disconnect();
          const fallbackConn = await mongoose.connect(DEFAULT_FALLBACK_URI, opts);
          console.log(`✅ Connected to MongoDB Atlas via Fallback (Database: ${fallbackConn.connection.db?.databaseName || 'ace-garment'})`);
          return fallbackConn;
        } catch (fallbackErr: any) {
          console.error('❌ MongoDB Connection Error:', fallbackErr.message);
          cached.promise = null;
          cached.conn = null;
          return null;
        }
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
