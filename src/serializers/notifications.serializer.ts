import type { Notification } from '../../generated/prisma/client';

export const toNotification = (n: Notification) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    data: n.data,
    isRead: n.isRead,
    createdAt: n.createdAt,
});
