import { prisma } from '../lib/prisma';
import { notFound } from '../lib/errors';
import { toNotification } from '../serializers/notifications.serializer';
import type { ListNotificationsQuery } from '../validation/notifications.schemas';

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
