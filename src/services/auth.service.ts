import { Prisma, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../src/config/env';
import { eventBus } from '../../src/events/bus';
import { badRequest, conflict, unauthorized } from '../../src/lib/errors';
import { prisma } from '../../src/lib/prisma';
import {
    generateAccountNumber,
    generateCardLast4,
    generateRefreshToken,
    hashToken,
    refreshExpiry,
    signAccessToken,
} from '../../src/lib/tokens';
import { type PublicUser, toPublicUser } from '../serializers/users.serializer';
import type { LoginInput, RegisterInput } from '../validation/auth.schemas';

export interface ClientMeta {
    userAgent?: string;
    ipAddress?: string;
}

export interface AuthResult {
    user: PublicUser;
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
}

const googleClient = env.googleEnabled
    ? new OAuth2Client({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        redirectUri: env.GOOGLE_CALLBACK_URL,
    })
    : null;

async function uniqueTag(base: string): Promise<string> {
    const clean = base.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16) || 'user';
    let tag = clean;
    let i = 0;
    while (await prisma.user.findUnique({ where: { tag }, select: { id: true } })) {
        i += 1;
        tag = `${clean}${i}`;
    }
    return tag;
}

async function provisionUser(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.$transaction(async (tx: { user: { create: (arg0: { data: Prisma.UserCreateInput; }) => any; }; account: { create: (arg0: { data: { userId: any; accountNumber: string; balance: number; }; }) => any; }; transaction: { create: (arg0: { data: { accountId: any; type: string; amount: number; balanceAfter: number; description: string; counterpartyName: string; }; }) => any; }; card: { create: (arg0: { data: { userId: any; brand: string; last4: string; holderName: string; expMonth: number; expYear: number; isDefault: boolean; }; }) => any; }; userSettings: { create: (arg0: { data: { userId: any; }; }) => any; }; }) => {
        const user = await tx.user.create({ data });
        const account = await tx.account.create({
            data: { userId: user.id, accountNumber: generateAccountNumber(), balance: env.WELCOME_BONUS },
        });
        if (env.WELCOME_BONUS > 0) {
            await tx.transaction.create({
                data: {
                    accountId: account.id,
                    type: 'CREDIT',
                    amount: env.WELCOME_BONUS,
                    balanceAfter: env.WELCOME_BONUS,
                    description: 'Welcome bonus',
                    counterpartyName: 'LolaPay',
                },
            });
        }
        const now = new Date();
        await tx.card.create({
            data: {
                userId: user.id,
                brand: 'Visa',
                last4: generateCardLast4(),
                holderName: `${user.firstName} ${user.lastName}`.toUpperCase(),
                expMonth: now.getMonth() + 1,
                expYear: now.getFullYear() + 4,
                isDefault: true,
            },
        });
        await tx.userSettings.create({ data: { userId: user.id } });
        return user;
    });
}

async function issueSession(user: User, meta: ClientMeta): Promise<AuthResult> {
    const refreshToken = generateRefreshToken();
    const session = await prisma.session.create({
        data: {
            userId: user.id,
            refreshTokenHash: hashToken(refreshToken),
            userAgent: meta.userAgent?.slice(0, 255),
            ipAddress: meta.ipAddress,
            expiresAt: refreshExpiry(),
        },
    });
    const accessToken = signAccessToken({ sub: user.id, sid: session.id, email: user.email });
    return { user: toPublicUser(user), accessToken, refreshToken, expiresIn: env.ACCESS_TOKEN_TTL };
}

export async function register(input: RegisterInput, meta: ClientMeta): Promise<AuthResult> {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw conflict('An account with this email already exists');

    if (input.tag && (await prisma.user.findUnique({ where: { tag: input.tag } }))) {
        throw conflict('This tag is already taken');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await provisionUser({
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        tag: input.tag ?? (await uniqueTag(input.firstName)),
        provider: 'LOCAL',
    });

    await eventBus.publish({ type: 'auth.registered', userId: user.id, occurredAt: new Date().toISOString() });
    return issueSession(user, meta);
}

export async function login(input: LoginInput, meta: ClientMeta): Promise<AuthResult> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    const hash = user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid';
    const ok = await bcrypt.compare(input.password, hash);
    if (!user || !ok || !user.isActive) throw unauthorized('Invalid email or password');
    if (!user.passwordHash) throw unauthorized('This account uses Google sign-in');

    await eventBus.publish({
        type: 'auth.login',
        userId: user.id,
        userAgent: meta.userAgent ?? null,
        ipAddress: meta.ipAddress ?? null,
        occurredAt: new Date().toISOString(),
    });
    return issueSession(user, meta);
}

export async function refresh(refreshToken: string, meta: ClientMeta): Promise<AuthResult> {
    const session = await prisma.session.findUnique({
        where: { refreshTokenHash: hashToken(refreshToken) },
        include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
        throw unauthorized('Refresh token is invalid or expired');
    }

    const newToken = generateRefreshToken();
    await prisma.session.update({
        where: { id: session.id },
        data: {
            refreshTokenHash: hashToken(newToken),
            lastUsedAt: new Date(),
            expiresAt: refreshExpiry(),
            userAgent: meta.userAgent?.slice(0, 255) ?? session.userAgent,
            ipAddress: meta.ipAddress ?? session.ipAddress,
        },
    });
    const accessToken = signAccessToken({ sub: session.user.id, sid: session.id, email: session.user.email });
    return { user: toPublicUser(session.user), accessToken, refreshToken: newToken, expiresIn: env.ACCESS_TOKEN_TTL };
}

export async function logout(sessionId: string): Promise<void> {
    await prisma.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function logoutAll(userId: string): Promise<number> {
    const res = await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    return res.count;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string, keepSessionId: string) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash) throw badRequest('This account uses Google sign-in and has no password');
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw unauthorized('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
        prisma.session.updateMany({
            where: { userId, revokedAt: null, NOT: { id: keepSessionId } },
            data: { revokedAt: new Date() },
        }),
    ]);
    await eventBus.publish({ type: 'auth.password_changed', userId, occurredAt: new Date().toISOString() });
}


export function googleAuthUrl(state: string): string {
    if (!googleClient) throw badRequest('Google sign-in is not configured');
    return googleClient.generateAuthUrl({
        access_type: 'offline',
        scope: ['openid', 'email', 'profile'],
        state,
        prompt: 'select_account',
    });
}

interface GoogleProfile {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | undefined;
}

async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
    if (!googleClient) throw badRequest('Google sign-in is not configured');
    const ticket = await googleClient.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
    const p = ticket.getPayload();
    if (!p?.email || !p.sub) throw unauthorized('Google token did not include an email');
    if (!p.email_verified) throw unauthorized('Google email is not verified');
    return {
        googleId: p.sub,
        email: p.email.toLowerCase(),
        firstName: p.given_name ?? p.name?.split(' ')[0] ?? 'Lola',
        lastName: p.family_name ?? p.name?.split(' ').slice(1).join(' ') ?? 'User',
        avatarUrl: p.picture,
    };
}

export async function googleCallback(code: string, meta: ClientMeta): Promise<AuthResult> {
    if (!googleClient) throw badRequest('Google sign-in is not configured');
    const { tokens } = await googleClient.getToken(code);
    if (!tokens.id_token) throw unauthorized('Google did not return an id_token');
    return loginWithGoogleIdToken(tokens.id_token, meta);
}

export async function loginWithGoogleIdToken(idToken: string, meta: ClientMeta): Promise<AuthResult> {
    const profile = await verifyGoogleIdToken(idToken);

    let user = await prisma.user.findUnique({ where: { googleId: profile.googleId } });
    if (!user) {
        const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
        if (byEmail) {
            user = await prisma.user.update({
                where: { id: byEmail.id },
                data: { googleId: profile.googleId, avatarUrl: byEmail.avatarUrl ?? profile.avatarUrl },
            });
        } else {
            user = await provisionUser({
                email: profile.email,
                firstName: profile.firstName,
                lastName: profile.lastName,
                avatarUrl: profile.avatarUrl,
                googleId: profile.googleId,
                provider: 'GOOGLE',
                tag: await uniqueTag(profile.firstName),
            });
            await eventBus.publish({ type: 'auth.registered', userId: user.id, occurredAt: new Date().toISOString() });
        }
    }
    if (!user.isActive) throw unauthorized('Account is disabled');

    await eventBus.publish({
        type: 'auth.login',
        userId: user.id,
        userAgent: meta.userAgent ?? null,
        ipAddress: meta.ipAddress ?? null,
        occurredAt: new Date().toISOString(),
    });
    return issueSession(user, meta);
}
