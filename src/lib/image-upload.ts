import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop';

// Configure Cloudinary from environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'acegarment';
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret && apiSecret !== 'your_cloudinary_api_secret') {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

/**
 * Saves a Buffer or Base64 image to local public/uploads directory
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
    return DEFAULT_FALLBACK_IMAGE;
  }
}

/**
 * Uploads an image Buffer to Cloudinary (or falls back to local storage)
 */
export async function uploadImageToCloudinary(buffer: Buffer, originalName?: string): Promise<string> {
  if (cloudName && apiKey && apiSecret && apiSecret !== 'your_cloudinary_api_secret') {
    try {
      return await new Promise<string>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'ace_garment_products',
            resource_type: 'image',
          },
          (error, result) => {
            if (error || !result) {
              reject(error || new Error('Cloudinary upload failed'));
            } else {
              resolve(result.secure_url);
            }
          }
        );
        uploadStream.end(buffer);
      });
    } catch (err) {
      console.warn('[Cloudinary Upload Failed, using local storage fallback]', err);
    }
  }

  return saveBufferLocally(buffer, originalName);
}

/**
 * Saves a base64 data URL to Cloudinary or local storage and returns the image URL
 */
export function saveBase64Image(dataUrl: string): string {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return DEFAULT_FALLBACK_IMAGE;
  }
  if (!dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  try {
    const matches = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (matches) {
      const buffer = Buffer.from(matches[2], 'base64');
      return saveBufferLocally(buffer);
    }
  } catch (e) {
    console.error('[saveBase64Image Error]', e);
  }

  return DEFAULT_FALLBACK_IMAGE;
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

