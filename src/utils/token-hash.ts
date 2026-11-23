import { createHash, timingSafeEqual } from 'node:crypto';

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function refreshTokenMatches(token: string, storedHash: string): boolean {
  const tokenHash = Buffer.from(hashRefreshToken(token), 'hex');
  const savedHash = Buffer.from(storedHash, 'hex');
  return tokenHash.length === savedHash.length && timingSafeEqual(tokenHash, savedHash);
}
