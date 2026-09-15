import type { Prisma } from '../../generated/prisma/client';

export const transactionInclude = { transfer: true } as const;

export type TransactionRow = Prisma.TransactionGetPayload<{ include: typeof transactionInclude }>;

export const toTransaction = (t: TransactionRow) => ({
    id: t.id,
    type: t.type,
    amount: t.amount.toFixed(2),
    signedAmount: (t.type === 'CREDIT' ? t.amount : t.amount.neg()).toFixed(2),
    balanceAfter: t.balanceAfter.toFixed(2),
    description: t.description,
    counterparty: t.counterpartyUserId ? { id: t.counterpartyUserId, name: t.counterpartyName } : null,
    reference: t.transfer?.reference ?? null,
    transferId: t.transferId,
    status: t.transfer?.status ?? 'COMPLETED',
    note: t.transfer?.note ?? null,
    createdAt: t.createdAt,
});
