const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        process.env[k.trim()] = v.join('=').trim();
      }
    });
  }
} catch (e) {}

const { neon } = require('@neondatabase/serverless');

async function testNeon() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  console.log('====================================================');
  console.log(`🔌 TESTING NEON POSTGRES CONNECTION TO:`);
  console.log(`🔗 URL: ${dbUrl}`);
  console.log('====================================================\n');

  try {
    const sql = neon(dbUrl);
    const result = await sql`SELECT NOW() as current_time;`;
    console.log('✅ SUCCESS! Connected to Neon Serverless Postgres Database!');
    console.log('Current Server Time:', result[0].current_time);
  } catch (error) {
    console.error('❌ NEON CONNECTION FAILED:', error);
  }
}

testNeon();
