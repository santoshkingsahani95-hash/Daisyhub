import { NextResponse } from 'next/server';
import { uploadImageToCloudinary, saveBase64Image } from '@/lib/image-upload';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle Multipart Form Data Uploads
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const url = await uploadImageToCloudinary(buffer, file.name);

      console.log(`[Upload API] Image uploaded successfully -> ${url}`);
      return NextResponse.json({ success: true, url });
    }

    // Handle JSON Payload
    const body = await request.json();
    const { base64Data, image } = body;
    const targetData = base64Data || image;

    if (!targetData) {
      return NextResponse.json({ success: false, error: 'Missing image data' }, { status: 400 });
    }

    const savedUrl = await saveBase64Image(targetData);
    return NextResponse.json({ success: true, url: savedUrl });
  } catch (error: any) {
    console.error('[Upload API Error]', error);
    return NextResponse.json({ success: false, error: error.message || 'Image upload failed' }, { status: 500 });
  }
}

