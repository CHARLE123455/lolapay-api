import { prisma } from '../lib/prisma';
import { notFound } from '../lib/errors';
import { toAccount, toCardSummary } from '../serializers/accounts.serializer';

const monthRange = (month?: string) => {
    const now = new Date();
    const [y = now.getFullYear(), m = now.getMonth() + 1] = month
        ? month.split('-').map(Number)
        : [now.getFullYear(), now.getMonth() + 1];
    return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
};

export async function getMyAccount(userId: string) {
    const account = await prisma.account.findUnique({ where: { userId } });
    if (!account) throw notFound('Account not found');
    return toAccount(account);
}

export async function getSummary(userId: string, month?: string) {
    const account = await prisma.account.findUnique({ where: { userId } });
    if (!account) throw notFound('Account not found');
    const { start, end } = monthRange(month);
    const inMonth = { accountId: account.id, createdAt: { gte: start, lt: end } };

    const [sent, received, cards, unreadNotifications, beneficiaries] = await Promise.all([
        prisma.transaction.aggregate({ _sum: { amount: true }, _count: true, where: { ...inMonth, type: 'DEBIT' } }),
        prisma.transaction.aggregate({ _sum: { amount: true }, _count: true, where: { ...inMonth, type: 'CREDIT' } }),
        prisma.card.findMany({ where: { userId, status: 'ACTIVE' }, orderBy: { isDefault: 'desc' } }),
        prisma.notification.count({ where: { userId, isRead: false } }),
        prisma.beneficiary.count({ where: { ownerId: userId } }),
    ]);

    return {
        currency: account.currency,
        accountNumber: account.accountNumber,
        totalBalance: account.balance.toFixed(2),
        sentThisMonth: (sent._sum.amount?.toFixed(2)) ?? '0.00',
        sentCount: sent._count,
        receivedThisMonth: (received._sum.amount?.toFixed(2)) ?? '0.00',
        receivedCount: received._count,
        activeCards: cards.length,
        primaryCard: cards[0] ? toCardSummary(cards[0]) : null,
        unreadNotifications,
        beneficiaries,
        periodStart: start,
        periodEnd: end,
    };
}
