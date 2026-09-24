import { NextResponse } from 'next/server';
import { generateDynamicQr } from '@/lib/fonepay';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const amount = Number(body.amount);

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Valid payment amount is required' }, { status: 400 });
    }

    const credentials = {
      apiUsername: body.apiUsername,
      apiPassword: body.apiPassword,
      merchantCode: body.merchantCode,
      apiKey: body.apiKey,
    };

    const remarks1 = body.remarks1 || 'Ace Garment';
    const remarks2 = body.remarks2 || 'Order Payment';

    const result = await generateDynamicQr(amount, body.prn, credentials, remarks1, remarks2);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate Fonepay Dynamic QR' }, { status: 500 });
  }
}
