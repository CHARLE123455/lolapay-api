import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { notFound } from '../lib/errors';
import { toNotification } from '../serializers/notifications.serializer';
import type { ListNotificationsQuery } from '../validation/notifications.schemas';

type NewNotification = Omit<Prisma.NotificationCreateManyInput, 'id' | 'isRead' | 'createdAt'>;

const money = (amount: string, currency: string) =>
    `${currency === 'NGN' ? '₦' : `${currency} `}${Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

export async function list(userId: string, { unreadOnly, limit }: ListNotificationsQuery) {
    const [items, unread] = await Promise.all([
        prisma.notification.findMany({
            where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
            orderBy: { createdAt: 'desc' },
            take: limit,
        }),
        prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { data: items.map(toNotification), meta: { unread } };
}

export async function markRead(userId: string, id: string) {
    const result = await prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
    if (result.count === 0) throw notFound('Notification not found');
}

export async function markAllRead(userId: string) {
    const result = await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return { updated: result.count };
}

export async function push(...items: NewNotification[]) {
    if (items.length === 0) return;
    await prisma.notification.createMany({ data: items });
}

export function transferSent(userId: string, amount: string, currency: string, recipientName: string, data: Prisma.InputJsonValue): NewNotification {
    return { userId, type: 'TRANSFER_SENT', title: 'Money sent', body: `You sent ${money(amount, currency)} to ${recipientName}.`, data };
}

export function transferReceived(
    userId: string,
    amount: string,
    currency: string,
    senderName: string,
    note: string | null | undefined,
    data: Prisma.InputJsonValue,
): NewNotification {
    return {
        userId,
        type: 'TRANSFER_RECEIVED',
        title: 'Payment received',
        body: `${senderName} sent you ${money(amount, currency)}${note ? ` — "${note}"` : ''}.`,
        data,
    };
}

export function beneficiaryAdded(userId: string, ownerName: string, ownerId: string): NewNotification {
    return { userId, type: 'BENEFICIARY_ADDED', title: 'New connection', body: `${ownerName} added you as a beneficiary.`, data: { ownerId } };
}

export function newSignIn(userId: string, ipAddress?: string | null, userAgent?: string | null): NewNotification {
    return {
        userId,
        type: 'SECURITY',
        title: 'New sign-in',
        body: `A new sign-in to your account was detected${ipAddress ? ` from ${ipAddress}` : ''}.`,
        data: { userAgent: userAgent ?? null },
    };
}

export function passwordChanged(userId: string): NewNotification {
    return { userId, type: 'SECURITY', title: 'Password changed', body: 'Your password was changed. If this was not you, contact support immediately.' };
}

export function welcome(userId: string): NewNotification {
    return { userId, type: 'SYSTEM', title: 'Welcome to LolaPay', body: 'Your wallet is ready. Add a beneficiary and send your first payment.' };
}
