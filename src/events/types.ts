export interface TransferCompletedEvent {
    type: 'transfer.completed';
    transferId: string;
    reference: string;
    senderId: string;
    senderName: string;
    recipientId: string;
    recipientName: string;
    amount: string;
    currency: string;
    note?: string | null;
    occurredAt: string;
}

export interface BeneficiaryAddedEvent {
    type: 'beneficiary.added';
    ownerId: string;
    ownerName: string;
    beneficiaryUserId: string;
    occurredAt: string;
}

export interface AuthEvent {
    type: 'auth.registered' | 'auth.login' | 'auth.password_changed' | 'auth.session_revoked';
    userId: string;
    userAgent?: string | null;
    ipAddress?: string | null;
    occurredAt: string;
}

export type LolaPayEvent = TransferCompletedEvent | BeneficiaryAddedEvent | AuthEvent;

export type EventHandler = (event: LolaPayEvent) => Promise<void>;
