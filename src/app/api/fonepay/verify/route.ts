import { NextResponse } from 'next/server';
import { verifyTransaction } from '@/lib/fonepay';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prn, credentials } = body;

    if (!prn) {
      return NextResponse.json({ error: 'PRN is required for verification' }, { status: 400 });
    }

    const result = await verifyTransaction(prn, credentials);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to verify transaction with Fonepay' }, { status: 500 });
  }
}
