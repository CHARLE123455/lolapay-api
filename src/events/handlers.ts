import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { LolaPayEvent } from './types';

const money = (amount: string, currency: string) =>
  `${currency === 'NGN' ? '₦' : currency + ' '}${Number(amount).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
  })}`;

export async function handleEvent(event: LolaPayEvent): Promise<void> {
  logger.debug({ type: event.type }, 'handling event');

  switch (event.type) {
    case 'transfer.completed': {
      await prisma.notification.createMany({
        data: [
          {
            userId: event.senderId,
            type: 'TRANSFER_SENT',
            title: 'Money sent',
            body: `You sent ${money(event.amount, event.currency)} to ${event.recipientName}.`,
            data: { transferId: event.transferId, reference: event.reference },
          },
          {
            userId: event.recipientId,
            type: 'TRANSFER_RECEIVED',
            title: 'Payment received',
            body: `${event.senderName} sent you ${money(event.amount, event.currency)}${
              event.note ? ` — "${event.note}"` : ''
            }.`,
            data: { transferId: event.transferId, reference: event.reference },
          },
        ],
      });
      return;
    }
    case 'beneficiary.added': {
      await prisma.notification.create({
        data: {
          userId: event.beneficiaryUserId,
          type: 'BENEFICIARY_ADDED',
          title: 'New connection',
          body: `${event.ownerName} added you as a beneficiary.`,
          data: { ownerId: event.ownerId },
        },
      });
      return;
    }
    case 'auth.login': {
      await prisma.notification.create({
        data: {
          userId: event.userId,
          type: 'SECURITY',
          title: 'New sign-in',
          body: `A new sign-in to your account was detected${event.ipAddress ? ` from ${event.ipAddress}` : ''}.`,
          data: { userAgent: event.userAgent },
        },
      });
      return;
    }
    case 'auth.password_changed': {
      await prisma.notification.create({
        data: {
          userId: event.userId,
          type: 'SECURITY',
          title: 'Password changed',
          body: 'Your password was changed. If this was not you, contact support immediately.',
        },
      });
      return;
    }
    case 'auth.registered': {
      await prisma.notification.create({
        data: {
          userId: event.userId,
          type: 'SYSTEM',
          title: 'Welcome to LolaPay',
          body: 'Your wallet is ready. Add a beneficiary and send your first payment.',
        },
      });
      return;
    }
    case 'auth.session_revoked':
      return;
  }
}
