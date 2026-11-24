import type { Prisma } from '../../generated/prisma/client';
import { toUserSummary, userSummarySelect } from './users.serializer';

export const adminUserSelect = {
    id: true,
    email: true,
    tag: true,
    firstName: true,
    lastName: true,
    avatarUrl: true,
    provider: true,
    role: true,
    isActive: true,
    createdAt: true,
    account: { select: { accountNumber: true, balance: true } },
    _count: { select: { sentTransfers: true, receivedTransfers: true, sessions: true } },
} as const;

export type AdminUserRow = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>;

export const toAdminUser = (u: AdminUserRow) => ({
    id: u.id,
    email: u.email,
    tag: u.tag,
    firstName: u.firstName,
    lastName: u.lastName,
    fullName: `${u.firstName} ${u.lastName}`,
    avatarUrl: u.avatarUrl,
    provider: u.provider,
    role: u.role,
    isActive: u.isActive,
    accountNumber: u.account?.accountNumber ?? null,
    balance: u.account ? u.account.balance.toFixed(2) : '0.00',
    transfersSent: u._count.sentTransfers,
    transfersReceived: u._count.receivedTransfers,
    createdAt: u.createdAt,
});

export const adminTransferInclude = {
    sender: { select: userSummarySelect },
    recipient: { select: userSummarySelect },
} as const;

export type AdminTransferRow = Prisma.TransferGetPayload<{ include: typeof adminTransferInclude }>;

export const toAdminTransfer = (t: AdminTransferRow) => ({
    id: t.id,
    reference: t.reference,
    amount: t.amount.toFixed(2),
    currency: t.currency,
    note: t.note,
    status: t.status,
    failReason: t.failReason,
    sender: toUserSummary(t.sender),
    recipient: toUserSummary(t.recipient),
    createdAt: t.createdAt,
});
