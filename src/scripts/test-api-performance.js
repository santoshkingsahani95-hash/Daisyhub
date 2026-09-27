const http = require('http');

const start = Date.now();
console.log('Sending request to http://localhost:3000/api/db ...');

http.get('http://localhost:3000/api/db', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    const duration = Date.now() - start;
    const sizeKb = (Buffer.byteLength(data, 'utf8') / 1024).toFixed(2);
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`RESPONSE TIME: ${duration} ms`);
    console.log(`PAYLOAD SIZE: ${sizeKb} KB`);

    try {
      const parsed = JSON.parse(data);
      console.log(`SUCCESS: ${parsed.success}`);
      console.log(`PRODUCTS COUNT: ${parsed.data?.products?.length || 0}`);
      if (parsed.data?.products?.[0]?.colors?.[0]?.images) {
        console.log(`FIRST PRODUCT IMAGE SAMPLE: ${parsed.data.products[0].colors[0].images[0]}`);
      }
    } catch (e) {
      console.error('Failed to parse JSON response');
    }
  });
}).on('error', (err) => {
  console.log('Server not running locally on port 3000:', err.message);
});
