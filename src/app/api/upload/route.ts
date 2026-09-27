import { NextResponse } from 'next/server';
import { saveBase64Image } from '@/lib/image-upload';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle Multipart Form Data
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const ext = path.extname(file.name) || '.jpg';
      const filename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
      const filePath = path.join(uploadDir, filename);

      fs.writeFileSync(filePath, buffer);

      console.log(`[Upload API] Form File Saved -> /uploads/${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
      return NextResponse.json({ success: true, url: `/uploads/${filename}` });
    }

    // Handle JSON Base64 Payload
    const body = await request.json();
    const { base64Data, image } = body;
    const targetData = base64Data || image;

    if (!targetData) {
      return NextResponse.json({ success: false, error: 'Missing base64 image data' }, { status: 400 });
    }

    const savedUrl = saveBase64Image(targetData);
    return NextResponse.json({ success: true, url: savedUrl });
  } catch (error: any) {
    console.error('[Upload API Error]', error);
    return NextResponse.json({ success: false, error: error.message || 'Image upload failed' }, { status: 500 });
  }
}
