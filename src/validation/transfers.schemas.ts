import { z } from 'zod';
import { MAX_TRANSFER, MIN_TRANSFER } from '../../src/constants/transfers';

export const sendMoneySchema = z
    .object({
        amount: z.coerce.number().positive().min(MIN_TRANSFER).max(MAX_TRANSFER),
        note: z.string().trim().max(140).optional(),
        recipientId: z.string().uuid().optional(),
        recipientTag: z.string().min(3).max(21).optional(),
        accountNumber: z.string().length(10).optional(),
        idempotencyKey: z.string().min(8).max(64).optional(),
    })
    .refine((d) => [d.recipientId, d.recipientTag, d.accountNumber].filter(Boolean).length === 1, {
        message: 'Provide exactly one of recipientId, recipientTag or accountNumber',
    });

export const listTransfersSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    direction: z.enum(['sent', 'received', 'all']).default('all'),
});

export const transferIdSchema = z.object({ id: z.string().uuid() });

export type SendMoneyInput = z.infer<typeof sendMoneySchema>;
export type ListTransfersQuery = z.infer<typeof listTransfersSchema>;
