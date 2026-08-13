import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(pin, salt, 100000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  try {
    const candidate = pbkdf2Sync(pin, salt, 100000, 32, 'sha256').toString('hex');
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
  } catch {
    return false;
  }
}
