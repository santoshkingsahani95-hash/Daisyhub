export interface ParsedFonepayQR {
  merchantCode?: string;
  merchantName?: string;
  accountNumber?: string;
  rawPayload: string;
}

/**
 * Safely loads jsQR library in the browser environment without breaking Next.js server-side compilation.
 */
function getJsQR(): any {
  if (typeof window === 'undefined') return null;
  try {
    // eval('require') hides the import from Webpack static analysis during SSR build
    const req = eval('require');
    const mod = req('jsqr');
    return mod.default || mod;
  } catch (e) {
    return (window as any).jsQR || null;
  }
}

/**
 * Parses raw QR payload string (EMVCo format, Fonepay URL, JSON, or key-value text)
 * to automatically extract merchant code and merchant name.
 */
export function parseFonepayQrPayload(qrString: string): ParsedFonepayQR {
  const result: ParsedFonepayQR = { rawPayload: qrString };
  if (!qrString || typeof qrString !== 'string') return result;

  const trimmed = qrString.trim();

  // 1. Try EMVCo Specifications TLV Parsing (Payload starting with 000201... or standard QR payload)
  if (trimmed.length >= 10) {
    let index = 0;
    if (trimmed.startsWith('000201') || (trimmed.substring(0, 2) === '00' && trimmed.substring(2, 4) === '02')) {
      while (index < trimmed.length - 4) {
        const tag = trimmed.substring(index, index + 2);
        const lenStr = trimmed.substring(index + 2, index + 4);
        const len = parseInt(lenStr, 10);

        if (isNaN(len) || len <= 0 || index + 4 + len > trimmed.length) {
          break;
        }
        const val = trimmed.substring(index + 4, index + 4 + len);

        // Tag 59: Merchant Name in EMVCo standard
        if (tag === '59') {
          result.merchantName = val.trim();
        }

        // Tag 26 to Tag 51: Merchant Account Information Sub-TLVs
        const tagNum = parseInt(tag, 10);
        if (!isNaN(tagNum) && tagNum >= 26 && tagNum <= 51) {
          let subIdx = 0;
          while (subIdx < val.length - 4) {
            const subTag = val.substring(subIdx, subIdx + 2);
            const subLen = parseInt(val.substring(subIdx + 2, subIdx + 4), 10);
            if (isNaN(subLen) || subLen <= 0 || subIdx + 4 + subLen > val.length) {
              break;
            }
            const subVal = val.substring(subIdx + 4, subIdx + 4 + subLen);
            // Subtag 01 or 02 or 03 usually holds Merchant ID / Code in Fonepay/NepalPay
            if (subTag === '01' || subTag === '02' || subTag === '03') {
              if (!result.merchantCode && subVal.length >= 3) {
                result.merchantCode = subVal.trim();
              }
            }
            subIdx += 4 + subLen;
          }
          if (!result.merchantCode && val.length >= 4) {
            const match = val.match(/[A-Z0-9_-]{4,25}/i);
            if (match) result.merchantCode = match[0].trim();
          }
        }

        // Tag 62: Additional Data Field
        if (tag === '62') {
          let subIdx = 0;
          while (subIdx < val.length - 4) {
            const subTag = val.substring(subIdx, subIdx + 2);
            const subLen = parseInt(val.substring(subIdx + 2, subIdx + 4), 10);
            if (isNaN(subLen) || subLen <= 0 || subIdx + 4 + subLen > val.length) break;
            const subVal = val.substring(subIdx + 4, subIdx + 4 + subLen);
            if (subTag === '01' || subTag === '05' || subTag === '07') {
              if (!result.merchantCode) result.merchantCode = subVal.trim();
            }
            subIdx += 4 + subLen;
          }
        }

        index += 4 + len;
      }
    }
  }

  // 2. Try URL / Deep Link parsing
  if (!result.merchantCode || !result.merchantName) {
    if (trimmed.includes('://') || trimmed.includes('?') || trimmed.toLowerCase().includes('fonepay')) {
      try {
        let normalizedUrl = trimmed;
        if (trimmed.startsWith('fonepay://')) {
          normalizedUrl = trimmed.replace('fonepay://', 'http://fonepay.com/');
        } else if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
          normalizedUrl = 'http://' + trimmed;
        }

        const urlObj = new URL(normalizedUrl);
        const params = urlObj.searchParams;

        const mc =
          params.get('merchantCode') ||
          params.get('mc') ||
          params.get('merchant_code') ||
          params.get('mcode') ||
          params.get('code') ||
          params.get('id') ||
          params.get('mid');

        const mn =
          params.get('merchantName') ||
          params.get('mn') ||
          params.get('merchant_name') ||
          params.get('mname') ||
          params.get('name') ||
          params.get('store');

        const ac = params.get('accountNumber') || params.get('ac') || params.get('mobile') || params.get('phone');

        if (mc) result.merchantCode = mc.trim();
        if (mn) result.merchantName = decodeURIComponent(mn).trim();
        if (ac) result.accountNumber = ac.trim();

        if (!result.merchantCode && urlObj.pathname) {
          const parts = urlObj.pathname.split('/').filter(Boolean);
          const lastPart = parts[parts.length - 1];
          if (lastPart && /^[A-Z0-9_-]{4,25}$/i.test(lastPart)) {
            result.merchantCode = lastPart;
          }
        }
      } catch (e) {}
    }
  }

  // 3. Try JSON payload parsing
  if (!result.merchantCode || !result.merchantName) {
    try {
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const json = JSON.parse(trimmed);
        if (json.merchantCode || json.mc || json.code || json.merchant_code) {
          result.merchantCode = String(json.merchantCode || json.mc || json.code || json.merchant_code).trim();
        }
        if (json.merchantName || json.mn || json.name || json.store || json.merchant_name) {
          result.merchantName = String(json.merchantName || json.mn || json.name || json.store || json.merchant_name).trim();
        }
        if (json.accountNumber || json.mobile || json.phone) {
          result.accountNumber = String(json.accountNumber || json.mobile || json.phone).trim();
        }
      }
    } catch (e) {}
  }

  // 4. Fallback Regex Parsing
  if (!result.merchantCode) {
    const mcMatch = trimmed.match(/(?:merchantCode|mcode|merchant_code|mc|code|merchant)[:=]?\s*([A-Z0-9_-]{4,25})/i);
    if (mcMatch) result.merchantCode = mcMatch[1].trim();
  }

  if (!result.merchantName) {
    const mnMatch = trimmed.match(/(?:merchantName|mname|merchant_name|mn|store|name)[:=]?\s*([a-zA-Z0-9\s&._-]{3,40})(?:&|;|\n|$)/i);
    if (mnMatch) result.merchantName = mnMatch[1].trim();
  }

  return result;
}

/**
 * Reads an uploaded image file, processes canvas pixel data with jsQR dynamically on client side,
 * and extracts merchant details automatically.
 */
export async function scanQRFromFile(file: File): Promise<{
  dataUrl: string;
  qrPayload: string | null;
  parsed: ParsedFonepayQR | null;
  error?: string;
}> {
  if (typeof window === 'undefined') {
    return { dataUrl: '', qrPayload: null, parsed: null, error: 'Client side only' };
  }

  const jsQR = getJsQR();

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => {
      resolve({ dataUrl: '', qrPayload: null, parsed: null, error: 'Failed to read image file.' });
    };

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();

      img.onerror = () => {
        resolve({ dataUrl, qrPayload: null, parsed: null, error: 'Invalid image asset.' });
      };

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx || !jsQR) {
          resolve({ dataUrl, qrPayload: null, parsed: null });
          return;
        }

        const sizesToTest = [
          { width: img.width, height: img.height },
          { width: 1000, height: Math.round((img.height * 1000) / img.width) },
          { width: 700, height: Math.round((img.height * 700) / img.width) },
          { width: 450, height: Math.round((img.height * 450) / img.width) },
        ];

        let foundQrCode: string | null = null;

        for (const dims of sizesToTest) {
          if (dims.width <= 0 || dims.height <= 0) continue;
          canvas.width = dims.width;
          canvas.height = dims.height;
          ctx.drawImage(img, 0, 0, dims.width, dims.height);
          const imageData = ctx.getImageData(0, 0, dims.width, dims.height);

          let qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (qrResult && qrResult.data) {
            foundQrCode = qrResult.data;
            break;
          }

          qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'onlyInvert',
          });

          if (qrResult && qrResult.data) {
            foundQrCode = qrResult.data;
            break;
          }

          const pixels = imageData.data;
          for (let i = 0; i < pixels.length; i += 4) {
            const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
            const bw = avg > 128 ? 255 : 0;
            pixels[i] = bw;
            pixels[i + 1] = bw;
            pixels[i + 2] = bw;
          }

          qrResult = jsQR(pixels, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (qrResult && qrResult.data) {
            foundQrCode = qrResult.data;
            break;
          }
        }

        if (foundQrCode) {
          const parsed = parseFonepayQrPayload(foundQrCode);
          resolve({ dataUrl, qrPayload: foundQrCode, parsed });
        } else {
          resolve({ dataUrl, qrPayload: null, parsed: null });
        }
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  });
}
