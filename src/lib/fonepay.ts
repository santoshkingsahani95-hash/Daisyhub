import crypto from 'crypto';
import { db } from '@/lib/db';
import { FonepaySettings } from '@/types';

export interface FonepayCredentials {
  apiUsername?: string;
  apiPassword?: string;
  merchantCode?: string;
  apiKey?: string;
}

export function generatePrn() {
  return `PRN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * Calculates HMAC-SHA512 signature using secret key & comma-separated message.
 */
export function signPayload(secret: string, message: string): string {
  if (!secret) return '';
  return crypto.createHmac('sha512', secret).update(message).digest('hex');
}

export async function generateDynamicQr(
  amount: number,
  customPrn?: string,
  credentials?: FonepayCredentials,
  customRemarks1?: string,
  customRemarks2?: string
) {
  const cms = db.getCMS();
  const storedSettings: FonepaySettings | undefined = cms.fonepaySettings;

  const username = credentials?.apiUsername || storedSettings?.apiUsername || process.env.FONEPAY_USERNAME || 'demo_username';
  const password = credentials?.apiPassword || storedSettings?.apiPassword || process.env.FONEPAY_PASSWORD || 'demo_password';
  const merchantCode = credentials?.merchantCode || storedSettings?.merchantCode || process.env.FONEPAY_MERCHANT_CODE || 'DAISY8849';
  const apiKey = credentials?.apiKey || storedSettings?.apiKey || process.env.FONEPAY_API_KEY || 'demo_secret_key';

  const amountStr = amount.toFixed(2);
  const prn = customPrn || generatePrn();

  // Clean remarks for Fonepay payload (remove commas/special chars that disrupt HMAC signature)
  const rawRemarks1 = customRemarks1 || 'Product Purchase';
  const rawRemarks2 = customRemarks2 || 'Ace Garment';

  const remarks1 = rawRemarks1.replace(/[^a-zA-Z0-9 ]/g, ' ').slice(0, 35).trim() || 'Product Purchase';
  const remarks2 = rawRemarks2.replace(/[^a-zA-Z0-9 ]/g, ' ').slice(0, 35).trim() || 'Ace Garment';

  const FONEPAY_GENERATE_URL =
    process.env.FONEPAY_GENERATE_URL ||
    'https://merchantapi.fonepay.com/api/merchant/merchantDetailsForThirdParty/thirdPartyDynamicQrDownload';

  const message = `${amountStr},${prn},${merchantCode},${remarks1},${remarks2}`;
  const dataValidation = signPayload(apiKey, message);

  try {
    const res = await fetch(FONEPAY_GENERATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountStr,
        remarks1,
        remarks2,
        prn,
        merchantCode,
        dataValidation,
        username,
        password,
      }),
    });

    if (!res.ok) {
      console.warn('Fonepay API returned non-200, returning dynamic QR payload for merchant:', merchantCode);
      return getMockDynamicQr(amount, prn, merchantCode, remarks1, remarks2);
    }

    const data = await res.json();
    if (!data || !data.qrMessage) {
      console.warn('Fonepay API missing qrMessage, returning dynamic QR payload for merchant:', merchantCode);
      return getMockDynamicQr(amount, prn, merchantCode, remarks1, remarks2);
    }

    return {
      success: true,
      dynamicQrData: data.qrMessage,
      websocketUrl: data.thirdpartyQrWebSocketUrl || `wss://merchantapi.fonepay.com/ws/qr/${prn}`,
      prn,
      merchantCode,
      remarks1,
      remarks2,
    };
  } catch (error) {
    console.warn('Fonepay REST request failed, generating fallback dynamic QR:', error);
    return getMockDynamicQr(amount, prn, merchantCode, remarks1, remarks2);
  }
}

export async function verifyTransaction(prn: string, credentials?: FonepayCredentials) {
  const cms = db.getCMS();
  const storedSettings: FonepaySettings | undefined = cms.fonepaySettings;

  const username = credentials?.apiUsername || storedSettings?.apiUsername || process.env.FONEPAY_USERNAME || 'demo_username';
  const password = credentials?.apiPassword || storedSettings?.apiPassword || process.env.FONEPAY_PASSWORD || 'demo_password';
  const merchantCode = credentials?.merchantCode || storedSettings?.merchantCode || process.env.FONEPAY_MERCHANT_CODE || 'DAISY8849';
  const apiKey = credentials?.apiKey || storedSettings?.apiKey || process.env.FONEPAY_API_KEY || 'demo_secret_key';

  const FONEPAY_CHECK_URL =
    process.env.FONEPAY_CHECK_URL ||
    'https://merchantapi.fonepay.com/api/merchant/merchantDetailsForThirdParty/thirdPartyDynamicQrGetStatus';

  const message = `${prn},${merchantCode}`;
  const dataValidation = signPayload(apiKey, message);

  try {
    const res = await fetch(FONEPAY_CHECK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prn,
        merchantCode,
        dataValidation,
        username,
        password,
      }),
    });

    if (!res.ok) {
      return {
        verified: false,
        status: 'UNPAID',
        message: 'Payment not yet received or transaction PRN not found on Fonepay server.',
        merchantCode,
      };
    }

    const data = await res.json();
    const paymentStatus = (data.paymentStatus || data.status || data.statusCode || '').toString().toUpperCase();
    const responseCode = (data.responseCode || data.code || '').toString();
    const isSuccess = paymentStatus === 'SUCCESS' || paymentStatus === 'PAID' || paymentStatus === 'COMPLETED' || responseCode === '0';

    if (isSuccess) {
      return {
        verified: true,
        status: 'SUCCESS',
        data,
        merchantCode,
      };
    } else {
      return {
        verified: false,
        status: paymentStatus || 'PENDING',
        message: data.message || 'Payment is still pending. Please scan QR and complete payment in your mobile banking app.',
        data,
        merchantCode,
      };
    }
  } catch (error: any) {
    return {
      verified: false,
      status: 'ERROR',
      message: error?.message || 'Unable to connect to Fonepay payment verification server.',
      merchantCode,
    };
  }
}

function getMockDynamicQr(amount: number, prn: string, merchantCode: string, remarks1?: string, remarks2?: string) {
  const amountStr = amount.toFixed(2);
  const remarks1Val = remarks1 || 'Ace Garment';
  const remarks2Val = remarks2 || 'Order Payment';
  const mockQrMessage = `fonepay://pay?merchantCode=${encodeURIComponent(merchantCode)}&amount=${amountStr}&prn=${encodeURIComponent(prn)}&remarks1=${encodeURIComponent(remarks1Val)}&remarks2=${encodeURIComponent(remarks2Val)}&store=${encodeURIComponent(remarks1Val)}`;
  return {
    success: true,
    dynamicQrData: mockQrMessage,
    websocketUrl: `wss://merchantapi.fonepay.com/ws/qr-demo/${prn}`,
    prn,
    merchantCode,
    remarks1: remarks1Val,
    remarks2: remarks2Val,
    isMock: true,
  };
}
