import type { Prisma } from '../../generated/prisma/client';
import { toTransaction, transactionInclude } from '../serializers/transactions.serializer';
import { notFound } from '../lib/errors';
import { prisma } from '../lib/prisma';
import type { ListTransactionsQuery } from '../validation/transactions.schemas';

async function accountIdOf(userId: string) {
    const account = await prisma.account.findUnique({ where: { userId }, select: { id: true } });
    if (!account) throw notFound('Account not found');
    return account.id;
}

export async function list(userId: string, { page, limit, type, from, to, q }: ListTransactionsQuery) {
    const accountId = await accountIdOf(userId);

    const where: Prisma.TransactionWhereInput = {
        accountId,
        ...(type ? { type } : {}),
        ...(from || to
            ? {
                createdAt: {
                    ...(from ? { gte: from } : {}),
                    ...(to ? { lte: to } : {}),
                },
            }
            : {}),
        ...(q
            ? {
                OR: [
                    { description: { contains: q, mode: 'insensitive' } },
                    { counterpartyName: { contains: q, mode: 'insensitive' } },
                    { transfer: { reference: { contains: q, mode: 'insensitive' } } },
                ],
            }
            : {}),
    };

    const [items, total] = await Promise.all([
        prisma.transaction.findMany({ where, include: transactionInclude, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
        prisma.transaction.count({ where }),
    ]);

    return { data: items.map(toTransaction), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getById(userId: string, id: string) {
    const accountId = await accountIdOf(userId);
    const tx = await prisma.transaction.findFirst({ where: { id, accountId }, include: transactionInclude });
    if (!tx) throw notFound('Transaction not found');
    return toTransaction(tx);
}
