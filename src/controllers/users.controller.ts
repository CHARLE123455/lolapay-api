import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { conflict, notFound } from '../../src/lib/errors';
import { prisma } from '../../src/lib/prisma';
import { toPublicUser, toUserSummary, userSummarySelect } from '../serializers/users.serializer';
import { searchSchema } from '../validation/users.schemas';

export async function getMe(req: Request, res: Response, next: NextFunction) {
    try {
        const user = await prisma.user.findUniqueOrThrow({
            where: { id: req.user!.id },
            include: {
                account: true,
                settings: true,
                cards: { where: { isDefault: true }, take: 1 },
            },
        });
        res.json({
            success: true,
            data: {
                ...toPublicUser(user),
                account: user.account && {
                    id: user.account.id,
                    accountNumber: user.account.accountNumber,
                    currency: user.account.currency,
                    balance: user.account.balance.toFixed(2),
                },
                settings: user.settings,
                defaultCard: user.cards[0] ?? null,
            },
        });
    } catch (e) {
        next(e);
    }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
    try {
        if (req.body.tag) {
            const taken = await prisma.user.findUnique({ where: { tag: req.body.tag }, select: { id: true } });
            if (taken && taken.id !== req.user!.id) throw conflict('This tag is already taken');
        }
        const user = await prisma.user.update({ where: { id: req.user!.id }, data: req.body });
        res.json({ success: true, data: toPublicUser(user) });
    } catch (e) {
        next(e);
    }
}

export async function getSettings(req: Request, res: Response, next: NextFunction) {
    try {
        const settings = await prisma.userSettings.upsert({
            where: { userId: req.user!.id },
            update: {},
            create: { userId: req.user!.id },
        });
        res.json({ success: true, data: settings });
    } catch (e) {
        next(e);
    }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
        const settings = await prisma.userSettings.upsert({
            where: { userId: req.user!.id },
            update: req.body,
            create: { userId: req.user!.id, ...req.body },
        });
        res.json({ success: true, data: settings });
    } catch (e) {
        next(e);
    }
}

export async function deleteMe(req: Request, res: Response, next: NextFunction) {
    try {
        await prisma.$transaction([
            prisma.user.update({ where: { id: req.user!.id }, data: { isActive: false } }),
            prisma.session.updateMany({ where: { userId: req.user!.id }, data: { revokedAt: new Date() } }),
        ]);
        res.json({ success: true, message: 'Account deactivated' });
    } catch (e) {
        next(e);
    }
}

export async function search(req: Request, res: Response, next: NextFunction) {
    try {
        const { q, limit } = req.query as unknown as z.infer<typeof searchSchema>;
        const term = q.replace(/^@/, '');
        const users = await prisma.user.findMany({
            where: {
                isActive: true,
                NOT: { id: req.user!.id },
                OR: [
                    { tag: { contains: term, mode: 'insensitive' } },
                    { firstName: { contains: term, mode: 'insensitive' } },
                    { lastName: { contains: term, mode: 'insensitive' } },
                    { email: { equals: term, mode: 'insensitive' } },
                    { account: { accountNumber: term } },
                ],
            },
            select: userSummarySelect,
            take: limit,
            orderBy: [{ firstName: 'asc' }],
        });
        res.json({ success: true, data: users.map(toUserSummary) });
    } catch (e) {
        next(e);
    }
}

export async function getByTag(req: Request, res: Response, next: NextFunction) {
    try {
        const user = await prisma.user.findFirst({
            where: {
                tag: (Array.isArray(req.params['tag']) ? req.params['tag'][0] ?? '' : req.params['tag'] ?? '').replace(/^@/, ''),
                isActive: true,
            },
            select: userSummarySelect,
        });
        if (!user) throw notFound('User not found');
        res.json({ success: true, data: toUserSummary(user) });
    } catch (e) {
        next(e);
    }
}