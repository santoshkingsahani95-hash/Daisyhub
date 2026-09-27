const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

const dbPath = path.join(__dirname, '..', '..', 'database.sqlite');
const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function processBase64(str) {
  if (typeof str !== 'string') return str;
  if (!str.startsWith('data:image/')) return str;

  try {
    const matches = str.match(/^data:image\/([a-zA-Z0-9\+\-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop';
    }

    const mimeType = matches[1].toLowerCase();
    const base64Data = matches[2];

    let ext = '.jpg';
    if (mimeType.includes('png')) ext = '.png';
    else if (mimeType.includes('webp')) ext = '.webp';
    else if (mimeType.includes('gif')) ext = '.gif';

    const filename = `img_clean_${Date.now()}_${Math.random().toString(36).substring(2, 6)}${ext}`;
    const filePath = path.join(uploadDir, filename);

    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    console.log(`Saved extracted image: /uploads/${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error('Error processing base64 image:', err);
    return 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop';
  }
}

function deepClean(obj) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return processBase64(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClean(item));
  }

  if (typeof obj === 'object') {
    const res = {};
    for (const [key, value] of Object.entries(obj)) {
      res[key] = deepClean(value);
    }
    return res;
  }

  return obj;
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database.sqlite:', err);
    process.exit(1);
  }
  console.log('Connected to database.sqlite for cleanup...');
});

db.all('SELECT id, colors, details, collections, reviews FROM products', [], (err, rows) => {
  if (err) {
    console.error('Error querying products table:', err);
    return;
  }

  console.log(`Analyzing ${rows.length} products for base64 image bloat...`);
  let cleanedCount = 0;

  rows.forEach((row) => {
    let modified = false;

    let colorsObj = [];
    if (row.colors) {
      try {
        colorsObj = JSON.parse(row.colors);
      } catch (e) {}
    }

    const cleanedColors = deepClean(colorsObj);
    if (JSON.stringify(cleanedColors) !== JSON.stringify(colorsObj)) {
      modified = true;
    }

    if (modified) {
      cleanedCount++;
      const newColorsJson = JSON.stringify(cleanedColors);
      db.run(
        'UPDATE products SET colors = ? WHERE id = ?',
        [newColorsJson, row.id],
        (updateErr) => {
          if (updateErr) {
            console.error(`Failed to update product ${row.id}:`, updateErr);
          } else {
            console.log(`✅ Successfully cleaned base64 image bloat for product ${row.id}`);
          }
        }
      );
    }
  });

  setTimeout(() => {
    console.log(`🎉 Cleanup completed. Cleaned ${cleanedCount} products with base64 bloat.`);
    db.close();
  }, 1000);
});
