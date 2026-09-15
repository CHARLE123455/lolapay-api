import { prisma } from '../lib/prisma';
import { notFound } from '../lib/errors';
import { toSession } from '../serializers/sessions.serializer';

export async function listActive(userId: string, currentSessionId: string) {
    const sessions = await prisma.session.findMany({
        where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { lastUsedAt: 'desc' },
    });
    return sessions.map((s) => toSession(s, currentSessionId));
}

export async function revoke(userId: string, id: string) {
    const result = await prisma.session.updateMany({
        where: { id, userId, revokedAt: null },
        data: { revokedAt: new Date() },
    });
    if (result.count === 0) throw notFound('Session not found');
}
