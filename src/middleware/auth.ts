import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { unauthorized } from '../lib/errors';
import { verifyAccessToken } from '../lib/tokens';
import { forbidden } from '../lib/errors';


export interface AuthUser {
    id: string;
    sessionId: string;
    email: string;
    role: 'USER' | 'ADMIN';
}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
    try {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ')) throw unauthorized('Missing access token');
        const token = header.slice('Bearer '.length);

        let payload;
        try {
            payload = verifyAccessToken(token);
        } catch {
            throw unauthorized('Invalid or expired access token');
        }

        const session = await prisma.session.findUnique({
            where: { id: payload.sid },
            select: { id: true, revokedAt: true, expiresAt: true, user: { select: { isActive: true } } },
        });
        if (!session || session.revokedAt || session.expiresAt < new Date() || !session.user.isActive) {
            throw unauthorized('Session has been revoked');
        }

        req.user = { id: payload.sub, sessionId: payload.sid, email: payload.email, role: payload.role };
        next();
    } catch (err) {
        next(err);
    }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
    if (req.user?.role !== 'ADMIN') return next(forbidden('Admin access required'));
    next();
}