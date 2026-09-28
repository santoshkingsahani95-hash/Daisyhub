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
const mysql = require('mysql2/promise');

const MYSQL_HOST = process.env.MYSQL_HOST || '103.235.199.20';
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER || 'daisyhub_app_user';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '$wyDinSV*$5fZv_r';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'daisyhub_daisyhubb';

async function checkConnection() {
  console.log('====================================================');
  console.log(`🔌 TESTING MYSQL CONNECTION TO: ${MYSQL_HOST}:${MYSQL_PORT}`);
  console.log(`👤 USER: ${MYSQL_USER}`);
  console.log(`📁 DATABASE: ${MYSQL_DATABASE}`);
  console.log('====================================================\n');

  try {
    const conn = await mysql.createConnection({
      host: MYSQL_HOST,
      port: MYSQL_PORT,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      connectTimeout: 8000,
    });

    console.log('✅ SUCCESS! Connected to Remote MySQL Database!');
    const [rows] = await conn.execute('SHOW TABLES;');
    console.log(`\nFound ${rows.length} tables in '${MYSQL_DATABASE}':`);
    console.table(rows);
    await conn.end();
  } catch (error) {
    console.error('\n❌ MYSQL CONNECTION FAILED!');
    console.error(`Error Code: ${error.code}`);
    console.error(`Error Message: ${error.message}\n`);

    if (error.code === 'ETIMEDOUT') {
      console.log('----------------------------------------------------');
      console.log('⚠️  REASON: cPanel Firewall is blocking port 3306!');
      console.log('----------------------------------------------------');
      console.log('Follow these 3 steps in cPanel to allow remote MySQL connection:\n');
      console.log('1. Log in to cPanel (https://www.daisyhubb.com:2083)');
      console.log('2. Search for "Remote MySQL" under the DATABASES section.');
      console.log('3. In the "Host" field, type "%" (without quotes) and click "Add Host".');
      console.log('----------------------------------------------------\n');
    }
  }
}

checkConnection();
