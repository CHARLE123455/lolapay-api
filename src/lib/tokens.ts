import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessTokenPayload {
    sub: string;
    sid: string;
    email: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
        expiresIn: env.ACCESS_TOKEN_TTL as NonNullable<jwt.SignOptions['expiresIn']>,
        issuer: 'lolapay',
    });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'lolapay' }) as AccessTokenPayload;
}

export function generateRefreshToken(): string {
    return crypto.randomBytes(48).toString('base64url');
}

export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshExpiry(): Date {
    return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function generateReference(prefix = 'LP'): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}-${ts}-${rand}`;
}

export function generateAccountNumber(): string {
    let n = '9';
    for (let i = 0; i < 9; i++) n += Math.floor(Math.random() * 10);
    return n;
}

export function generateCardLast4(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
}
