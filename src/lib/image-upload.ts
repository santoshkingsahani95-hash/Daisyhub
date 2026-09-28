import { saveImageBlobToDb } from './mysql';
import fs from 'fs';
import path from 'path';

const DEFAULT_FALLBACK_IMAGE = '';

/**
 * Saves a Buffer image as a LONGBLOB in MySQL database and returns /api/images/[id]
 */
export async function saveBufferToDatabase(buffer: Buffer, mimeType: string = 'image/jpeg'): Promise<string> {
  try {
    return await saveImageBlobToDb(buffer, mimeType);
  } catch (e) {
    console.error('[Database Image Save Error]', e);
    // Local disk fallback for dev environment if needed
    return saveBufferLocally(buffer);
  }
}

/**
 * Saves a Buffer image to local public/uploads directory (fallback)
 */
export function saveBufferLocally(buffer: Buffer, originalName?: string): string {
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const ext = originalName ? path.extname(originalName) || '.jpg' : '.jpg';
    const fileName = `img_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${fileName}`;
  } catch (e) {
    console.error('[Local File Save Error]', e);
    return '';
  }
}

/**
 * Uploads an image Buffer directly to MySQL Database BLOB storage
 */
export async function uploadImageToCloudinary(buffer: Buffer, originalName?: string): Promise<string> {
  const mimeType = originalName?.endsWith('.png') ? 'image/png' : (originalName?.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
  return await saveBufferToDatabase(buffer, mimeType);
}

/**
 * Converts a base64 data URL to a MySQL DB BLOB record and returns /api/images/[id]
 */
export async function saveBase64Image(dataUrl: string): Promise<string> {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return DEFAULT_FALLBACK_IMAGE;
  }
  if (!dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  try {
    const matches = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (matches) {
      const mimeType = matches[1] || 'image/jpeg';
      const buffer = Buffer.from(matches[2], 'base64');
      return await saveBufferToDatabase(buffer, mimeType);
    }
  } catch (e) {
    console.error('[saveBase64Image Error]', e);
  }

  return DEFAULT_FALLBACK_IMAGE;
}

/**
 * Recursively inspects objects/arrays and converts any base64 image string to MySQL DB BLOB URL
 */
export async function sanitizeObjectImages<T>(obj: T): Promise<T> {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    if (obj.startsWith('data:image/')) {
      return (await saveBase64Image(obj)) as unknown as T;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    const sanitizedArray = await Promise.all(obj.map((item) => sanitizeObjectImages(item)));
    return sanitizedArray as unknown as T;
  }

  if (typeof obj === 'object') {
    const newObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      newObj[key] = await sanitizeObjectImages(value);
    }
    return newObj as T;
  }

  return obj;
}
