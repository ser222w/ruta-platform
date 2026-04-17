import { createHash } from 'crypto';

interface LiqPayFormData {
  publicKey: string;
  privateKey: string;
  amount: number;
  currency?: string;
  description: string;
  orderId: string;
  resultUrl?: string;
  serverUrl?: string;
}

interface LiqPayFormResult {
  data: string; // base64 JSON
  signature: string;
}

/**
 * Генерує data + signature для LiqPay checkout форми.
 * signature = base64(sha1(privateKey + data + privateKey))
 */
export function generateLiqPayForm(input: LiqPayFormData): LiqPayFormResult {
  const {
    publicKey,
    privateKey,
    amount,
    currency = 'UAH',
    description,
    orderId,
    resultUrl,
    serverUrl
  } = input;

  const params: Record<string, string | number> = {
    public_key: publicKey,
    version: 3,
    action: 'pay',
    amount,
    currency,
    description,
    order_id: orderId,
    language: 'uk'
  };

  if (resultUrl) params.result_url = resultUrl;
  if (serverUrl) params.server_url = serverUrl;

  const data = Buffer.from(JSON.stringify(params)).toString('base64');
  const signature = generateSignature(privateKey, data);

  return { data, signature };
}

/**
 * Верифікує підпис LiqPay webhook callback.
 * signature = base64(sha1(privateKey + data + privateKey))
 */
export function verifyLiqPaySignature(
  privateKey: string,
  data: string,
  signature: string
): boolean {
  const expected = generateSignature(privateKey, data);
  return expected === signature;
}

/**
 * Декодує LiqPay data payload.
 */
export function decodeLiqPayData(data: string): Record<string, unknown> {
  try {
    return JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
  } catch {
    throw new Error('Неможливо декодувати LiqPay data');
  }
}

function generateSignature(privateKey: string, data: string): string {
  return createHash('sha1')
    .update(privateKey + data + privateKey)
    .digest('base64');
}
