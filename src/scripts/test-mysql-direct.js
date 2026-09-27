const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('Testing connection to MySQL at 103.235.199.20:3306 ...');
  try {
    const connection = await mysql.createConnection({
      host: '103.235.199.20',
      port: 3306,
      user: 'daisyhub_daisyhubb',
      password: 'P@ss-W0rd',
      database: 'daisyhub_daisyhubb',
      connectTimeout: 10000,
    });
    console.log('SUCCESS: Connected to MySQL database!');
    const [rows] = await connection.execute('SHOW TABLES');
    console.log('TABLES IN MYSQL:', rows);
    await connection.end();
  } catch (error) {
    console.error('MYSQL CONNECTION ERROR:', error);
  }
}

testConnection();
