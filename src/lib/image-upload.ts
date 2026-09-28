import fs from 'fs';
import path from 'path';

const DEFAULT_FALLBACK_IMAGE = '';
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

/**
 * Ensures that the public/uploads directory exists on disk
 */
export function ensureUploadsDirExists(): string {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  return UPLOADS_DIR;
}

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'image/avif': '.avif',
  'image/bmp': '.bmp',
  'image/tiff': '.tiff',
};

function resolveExtension(originalName?: string, mimeType?: string): string {
  if (originalName) {
    const ext = path.extname(originalName).toLowerCase();
    if (ext && ext.length <= 5) return ext;
  }
  if (mimeType && MIME_EXTENSION_MAP[mimeType.toLowerCase()]) {
    return MIME_EXTENSION_MAP[mimeType.toLowerCase()];
  }
  return '.jpg';
}

/**
 * Saves a Buffer image to public/uploads directory and returns static URL (/uploads/filename)
 */
export function saveBufferLocally(buffer: Buffer, originalName?: string, mimeType?: string): string {
  try {
    const uploadsDir = ensureUploadsDirExists();
    const ext = resolveExtension(originalName, mimeType);
    const fileName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${fileName}`;
  } catch (e) {
    console.error('[Local File Save Error]', e);
    return '';
  }
}

/**
 * Direct file upload handler: saves Buffer image directly to public/uploads
 */
export async function uploadImageToDisk(buffer: Buffer, originalName?: string, mimeType?: string): Promise<string> {
  return saveBufferLocally(buffer, originalName, mimeType);
}

/**
 * Backward compatibility alias: Saves to public/uploads instead of Cloudinary/DB
 */
export async function uploadImageToCloudinary(buffer: Buffer, originalName?: string): Promise<string> {
  return saveBufferLocally(buffer, originalName);
}

/**
 * Backward compatibility alias: Saves to public/uploads instead of database BLOB
 */
export async function saveBufferToDatabase(buffer: Buffer, mimeType: string = 'image/jpeg'): Promise<string> {
  return saveBufferLocally(buffer, undefined, mimeType);
}

/**
 * Converts a base64 data URL to a local file in public/uploads and returns /uploads/[fileName]
 */
export async function saveBase64Image(dataUrl: string, originalName?: string): Promise<string> {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return DEFAULT_FALLBACK_IMAGE;
  }
  if (!dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  try {
    const matches = dataUrl.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
    if (matches) {
      const mimeType = matches[1] || 'image/jpeg';
      const buffer = Buffer.from(matches[2], 'base64');
      return saveBufferLocally(buffer, originalName, mimeType);
    }
  } catch (e) {
    console.error('[saveBase64Image Error]', e);
  }

  return DEFAULT_FALLBACK_IMAGE;
}

/**
 * Recursively inspects objects/arrays and converts any base64 image string to public/uploads file URL
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
