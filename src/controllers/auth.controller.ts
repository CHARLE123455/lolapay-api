import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../../src/config/env';
import { badRequest } from '../../src/lib/errors';
import { logger } from '../../src/lib/logger';
import * as auth from '../../src/services/auth.service';

const meta = (req: Request) => ({
    ...(req.headers['user-agent'] !== undefined && { userAgent: req.headers['user-agent'] }),
    ...(req.ip !== undefined && { ipAddress: req.ip }),
});

export async function register(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await auth.register(req.body, meta(req));
        res.status(201).json({ success: true, data: result });
    } catch (e) {
        next(e);
    }
}

export async function login(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await auth.login(req.body, meta(req));
        res.json({ success: true, data: result });
    } catch (e) {
        next(e);
    }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await auth.refresh(req.body.refreshToken, meta(req));
        res.json({ success: true, data: result });
    } catch (e) {
        next(e);
    }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
    try {
        await auth.logout(req.user!.sessionId);
        res.json({ success: true, message: 'Logged out' });
    } catch (e) {
        next(e);
    }
}

export async function logoutAll(req: Request, res: Response, next: NextFunction) {
    try {
        const count = await auth.logoutAll(req.user!.id);
        res.json({ success: true, message: `Signed out of ${count} session(s)` });
    } catch (e) {
        next(e);
    }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
    try {
        await auth.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword, req.user!.sessionId);
        res.json({ success: true, message: 'Password updated. Other devices have been signed out.' });
    } catch (e) {
        next(e);
    }
}

export function googleRedirect(_req: Request, res: Response, next: NextFunction) {
    try {
        const state = crypto.randomBytes(16).toString('hex');
        res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 });
        res.redirect(auth.googleAuthUrl(state));
    } catch (e) {
        next(e);
    }
}

export async function googleCallback(req: Request, res: Response) {
    try {
        const { code, state, error } = req.query as Record<string, string | undefined>;
        if (error) throw badRequest(`Google sign-in failed: ${error}`);
        if (!code) throw badRequest('Missing authorization code');
        const cookieState = req.cookies?.oauth_state;
        if (!cookieState || cookieState !== state) throw badRequest('Invalid OAuth state');
        res.clearCookie('oauth_state');

        const result = await auth.googleCallback(code, meta(req));
        const url = new URL('/auth/callback', env.WEB_APP_URL);
        url.hash = new URLSearchParams({ accessToken: result.accessToken, refreshToken: result.refreshToken }).toString();
        res.redirect(url.toString());
    } catch (e) {
        logger.warn(e, 'google callback failed');
        const url = new URL('/login', env.WEB_APP_URL);
        url.searchParams.set('error', 'google_failed');
        res.redirect(url.toString());
    }
}

export async function googleToken(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await auth.loginWithGoogleIdToken(req.body.idToken, meta(req));
        res.json({ success: true, data: result });
    } catch (e) {
        next(e);
    }
}

export function providers(_req: Request, res: Response) {
    res.json({ success: true, data: { local: true, google: env.googleEnabled, googleClientId: env.GOOGLE_CLIENT_ID || null } });
}