import type { Prisma } from '../../generated/prisma/client';
import { toUserSummary, userSummarySelect } from './users.serializer';

export const transferInclude = {
    sender: { select: userSummarySelect },
    recipient: { select: userSummarySelect },
} as const;

export type TransferRow = Prisma.TransferGetPayload<{ include: typeof transferInclude }>;

export const toTransfer = (t: TransferRow, viewerId: string) => ({
    id: t.id,
    reference: t.reference,
    amount: t.amount.toFixed(2),
    currency: t.currency,
    note: t.note,
    status: t.status,
    direction: t.senderId === viewerId ? 'sent' : 'received',
    sender: toUserSummary(t.sender),
    recipient: toUserSummary(t.recipient),
    createdAt: t.createdAt,
});
