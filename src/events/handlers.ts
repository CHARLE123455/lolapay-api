import * as notifications from '../services/notifications.services';
import { logger } from '../lib/logger';
import type { LolaPayEvent } from './types';


export async function handleEvent(event: LolaPayEvent): Promise<void> {
  logger.debug({ type: event.type }, 'handling event');

  switch (event.type) {
    case 'transfer.completed': {
      const data = { transferId: event.transferId, reference: event.reference };
      return notifications.push(
        notifications.transferSent(event.senderId, event.amount, event.currency, event.recipientName, data),
        notifications.transferReceived(event.recipientId, event.amount, event.currency, event.senderName, event.note, data),
      );
    }
    case 'beneficiary.added':
      return notifications.push(notifications.beneficiaryAdded(event.beneficiaryUserId, event.ownerName, event.ownerId));
    case 'auth.registered':
      return notifications.push(notifications.welcome(event.userId));
    case 'auth.login':
      return notifications.push(notifications.newSignIn(event.userId, event.ipAddress, event.userAgent));
    case 'auth.password_changed':
      return notifications.push(notifications.passwordChanged(event.userId));
    case 'auth.session_revoked':
      return;
    default: {
      const exhaustiveCheck: never = event;
      logger.warn({ event: exhaustiveCheck }, 'unhandled event type');
      return;
    }
  }
}