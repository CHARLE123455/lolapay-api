import type { Decimal } from '@prisma/client/runtime/client';
import { Prisma, TransferStatus } from '../../generated/prisma/client';
import { MAX_TRANSFER, MIN_TRANSFER } from '../constants/transfers';
import { eventBus } from '../events/bus';
import { badRequest, notFound, unprocessable } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { generateReference } from '../lib/tokens';
import { toTransfer, transferInclude } from '../serializers/transfers.serializer';
import type { ListTransfersQuery, SendMoneyInput } from '../validation/transfers.schemas';

async function resolveRecipient(input: SendMoneyInput) {
    const where: Prisma.UserWhereInput = input.recipientId
        ? { id: input.recipientId }
        : input.recipientTag
            ? { tag: input.recipientTag.replace(/^@/, '').toLowerCase() }
            : input.accountNumber
                ? { account: { accountNumber: input.accountNumber } }
                : {};
    if (Object.keys(where).length === 0) throw badRequest('Provide recipientId, recipientTag or accountNumber');
    const user = await prisma.user.findFirst({ where: { ...where, isActive: true }, include: { account: true } });
    if (!user || !user.account) throw notFound('Recipient not found');
    return user;
}

const visibleTo = (me: string, direction: ListTransfersQuery['direction']): Prisma.TransferWhereInput =>
    direction === 'sent' ? { senderId: me } : direction === 'received' ? { recipientId: me } : { OR: [{ senderId: me }, { recipientId: me }] };

export async function sendMoney(senderId: string, input: SendMoneyInput) {
    if (input.amount < MIN_TRANSFER) throw unprocessable(`Minimum transfer is ₦${MIN_TRANSFER}`);
    if (input.amount > MAX_TRANSFER) throw unprocessable(`Maximum transfer is ₦${MAX_TRANSFER.toLocaleString()}`);

    const recipient = await resolveRecipient(input);
    if (recipient.id === senderId) throw unprocessable('You cannot send money to yourself');

    if (input.idempotencyKey) {
        const existing = await prisma.transfer.findUnique({ where: { reference: input.idempotencyKey }, include: transferInclude });
        if (existing) return { ...toTransfer(existing, senderId), newBalance: await currentBalance(senderId) };
    }

    const amount = new Prisma.Decimal(input.amount.toFixed(2));
    const reference = input.idempotencyKey ?? generateReference();

    const result = await prisma.$transaction(
        async (tx) => {
            const [senderAcc, recipientAcc] = await Promise.all([
                tx.account.findUnique({ where: { userId: senderId } }),
                tx.account.findUnique({ where: { userId: recipient.id } }),
            ]);
            if (!senderAcc || !recipientAcc) throw notFound('Account not found');

            const ids = [senderAcc.id, recipientAcc.id].sort();
            await tx.$queryRaw`SELECT id FROM "Account" WHERE id IN (${Prisma.join(ids)}) FOR UPDATE`;

            const fresh = await tx.account.findUniqueOrThrow({ where: { id: senderAcc.id } });
            if (fresh.balance.lessThan(amount)) {
                throw unprocessable(`Insufficient funds. Available balance is ₦${fresh.balance.toFixed(2)}`);
            }

            const sender = await tx.user.findUniqueOrThrow({ where: { id: senderId } });
            const senderName = `${sender.firstName} ${sender.lastName}`;
            const recipientName = `${recipient.firstName} ${recipient.lastName}`;

            const transfer = await tx.transfer.create({
                data: { reference, senderId, recipientId: recipient.id, amount, note: input.note ?? null, status: 'COMPLETED' },
                include: transferInclude,
            });

            const debited = await tx.account.update({ where: { id: senderAcc.id }, data: { balance: { decrement: amount } } });
            const credited = await tx.account.update({ where: { id: recipientAcc.id }, data: { balance: { increment: amount } } });

            await tx.transaction.createMany({
                data: [
                    {
                        accountId: senderAcc.id,
                        transferId: transfer.id,
                        type: 'DEBIT',
                        amount,
                        balanceAfter: debited.balance,
                        description: `To ${recipientName}`,
                        counterpartyUserId: recipient.id,
                        counterpartyName: recipientName,
                    },
                    {
                        accountId: recipientAcc.id,
                        transferId: transfer.id,
                        type: 'CREDIT',
                        amount,
                        balanceAfter: credited.balance,
                        description: `From ${senderName}`,
                        counterpartyUserId: senderId,
                        counterpartyName: senderName,
                    },
                ],
            });

            return { transfer, senderName, recipientName, newBalance: debited.balance };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );

    await eventBus.publish({
        type: 'transfer.completed',
        transferId: result.transfer.id,
        reference: result.transfer.reference,
        senderId,
        senderName: result.senderName,
        recipientId: recipient.id,
        recipientName: result.recipientName,
        amount: result.transfer.amount.toFixed(2),
        currency: result.transfer.currency,
        note: result.transfer.note,
        occurredAt: result.transfer.createdAt.toISOString(),
    });

    return { ...toTransfer(result.transfer, senderId), newBalance: result.newBalance.toFixed(2) };
}

async function currentBalance(userId: string) {
    const account = await prisma.account.findUnique({ where: { userId }, select: { balance: true } });
    return account?.balance.toFixed(2) ?? '0.00';
}

export async function list(me: string, { page, limit, direction }: ListTransfersQuery) {
    const where = visibleTo(me, direction);
    const [items, total] = await Promise.all([
        prisma.transfer.findMany({ where, include: transferInclude, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
        prisma.transfer.count({ where }),
    ]);
    return { data: items.map((t: { sender: { id: string; tag: string; firstName: string; lastName: string; avatarUrl: string | null; }; recipient: { id: string; tag: string; firstName: string; lastName: string; avatarUrl: string | null; }; } & { id: string; reference: string; senderId: string; recipientId: string; amount: Decimal; currency: string; note: string | null; status: TransferStatus; failReason: string | null; createdAt: Date; }) => toTransfer(t, me)), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getById(me: string, id: string) {
    const transfer = await prisma.transfer.findFirst({ where: { id, ...visibleTo(me, 'all') }, include: transferInclude });
    if (!transfer) throw notFound('Transfer not found');
    return toTransfer(transfer, me);
}
