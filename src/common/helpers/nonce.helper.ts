import { createHash } from 'crypto';

export function hashNonce(nonce: string): string {
  return createHash('sha256').update(nonce).digest('hex');
}

export function generateOtp(length: number): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

export function compareNonce(plain: string, hashed: string): boolean {
  const hashedPlain = hashNonce(plain);
  return hashedPlain === hashed;
}

export function generateNonce(length: number): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < length; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
