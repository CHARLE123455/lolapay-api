import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { badRequest, notFound } from '../lib/errors';
import { adminTransferInclude, adminUserSelect, toAdminTransfer, toAdminUser } from '../serializers/admin.serializer';
import type { ListTransfersQuery, ListUsersQuery, UpdateUserRoleInput, UpdateUserStatusInput } from '../validation/admin.schemas';

const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

export async function overview() {
    const today = startOfToday();
    const since = daysAgo(13);
    since.setHours(0, 0, 0, 0);

    const [users, activeUsers, newUsersToday, transfers, transfersToday, volume, volumeToday, balances, cards, failed, series] =
        await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { isActive: true } }),
            prisma.user.count({ where: { createdAt: { gte: today } } }),
            prisma.transfer.count({ where: { status: 'COMPLETED' } }),
            prisma.transfer.count({ where: { status: 'COMPLETED', createdAt: { gte: today } } }),
            prisma.transfer.aggregate({ _sum: { amount: true }, where: { status: 'COMPLETED' } }),
            prisma.transfer.aggregate({ _sum: { amount: true }, where: { status: 'COMPLETED', createdAt: { gte: today } } }),
            prisma.account.aggregate({ _sum: { balance: true } }),
            prisma.card.count({ where: { status: 'ACTIVE' } }),
            prisma.transfer.count({ where: { status: 'FAILED' } }),
            prisma.$queryRaw<{ day: Date; count: bigint; volume: Prisma.Decimal | null }[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count, SUM(amount) AS volume
        FROM "Transfer"
        WHERE status = 'COMPLETED' AND "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1
      `,
        ]);

    const byDay = new Map(series.map((r) => [r.day.toISOString().slice(0, 10), r]));
    const daily = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(since);
        d.setDate(since.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        const row = byDay.get(key);
        return { date: key, count: row ? Number(row.count) : 0, volume: row?.volume ? row.volume.toFixed(2) : '0.00' };
    });

    return {
        users: { total: users, active: activeUsers, newToday: newUsersToday },
        transfers: { total: transfers, today: transfersToday, failed },
        volume: { total: (volume._sum.amount ?? new Prisma.Decimal(0)).toFixed(2), today: (volumeToday._sum.amount ?? new Prisma.Decimal(0)).toFixed(2) },
        balances: { total: (balances._sum.balance ?? new Prisma.Decimal(0)).toFixed(2) },
        cards: { active: cards },
        daily,
    };
}

export async function listUsers({ page, limit, q, status, role }: ListUsersQuery) {
    const where: Prisma.UserWhereInput = {
        ...(status ? { isActive: status === 'active' } : {}),
        ...(role ? { role } : {}),
        ...(q
            ? {
                OR: [
                    { email: { contains: q, mode: 'insensitive' } },
                    { tag: { contains: q, mode: 'insensitive' } },
                    { firstName: { contains: q, mode: 'insensitive' } },
                    { lastName: { contains: q, mode: 'insensitive' } },
                    { account: { accountNumber: { contains: q } } },
                ],
            }
            : {}),
    };

    const [items, total] = await Promise.all([
        prisma.user.findMany({ where, select: adminUserSelect, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
        prisma.user.count({ where }),
    ]);

    return { data: items.map(toAdminUser), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getUser(id: string) {
    const user = await prisma.user.findUnique({ where: { id }, select: adminUserSelect });
    if (!user) throw notFound('User not found');
    return toAdminUser(user);
}

export async function setUserStatus(adminId: string, id: string, { isActive }: UpdateUserStatusInput) {
    if (adminId === id && !isActive) throw badRequest('You cannot deactivate your own account');
    const user = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({ where: { id }, data: { isActive }, select: adminUserSelect });
        if (!isActive) await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
        return updated;
    });
    return toAdminUser(user);
}

export async function setUserRole(adminId: string, id: string, { role }: UpdateUserRoleInput) {
    if (adminId === id && role !== 'ADMIN') throw badRequest('You cannot remove your own admin role');
    const user = await prisma.user.update({ where: { id }, data: { role }, select: adminUserSelect });
    return toAdminUser(user);
}

export async function listTransfers({ page, limit, status, from, to, q }: ListTransfersQuery) {
    const where: Prisma.TransferWhereInput = {
        ...(status ? { status } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
        ...(q
            ? {
                OR: [
                    { reference: { contains: q, mode: 'insensitive' } },
                    { note: { contains: q, mode: 'insensitive' } },
                    { sender: { OR: [{ tag: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } },
                    { recipient: { OR: [{ tag: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } },
                ],
            }
            : {}),
    };

    const [items, total] = await Promise.all([
        prisma.transfer.findMany({ where, include: adminTransferInclude, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
        prisma.transfer.count({ where }),
    ]);

    return { data: items.map(toAdminTransfer), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
