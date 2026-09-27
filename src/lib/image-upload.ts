import fs from 'fs';
import path from 'path';

const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop';

/**
 * Saves a base64 data URL as a static file in public/uploads and returns the relative URL (/uploads/filename)
 */
export function saveBase64Image(dataUrl: string): string {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return DEFAULT_FALLBACK_IMAGE;
  }

  // If already a regular URL or relative path, return as is
  if (!dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  try {
    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9\+\-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      console.warn('[ImageUpload] Invalid base64 data URL format, using fallback.');
      return DEFAULT_FALLBACK_IMAGE;
    }

    const mimeType = matches[1].toLowerCase();
    const base64Data = matches[2];

    let ext = '.jpg';
    if (mimeType.includes('png')) ext = '.png';
    else if (mimeType.includes('webp')) ext = '.webp';
    else if (mimeType.includes('gif')) ext = '.gif';
    else if (mimeType.includes('svg')) ext = '.svg';

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(uploadDir, filename);

    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    console.log(`[ImageUpload] Extracted & saved base64 image -> /uploads/${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('[ImageUpload Error] Failed to save base64 image to disk:', error);
    return DEFAULT_FALLBACK_IMAGE;
  }
}

/**
 * Recursively inspects objects/arrays and converts any base64 image string to stored URL
 */
export function sanitizeObjectImages<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    if (obj.startsWith('data:image/')) {
      return saveBase64Image(obj) as unknown as T;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObjectImages(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const newObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      newObj[key] = sanitizeObjectImages(value);
    }
    return newObj as T;
  }

  return obj;
}
