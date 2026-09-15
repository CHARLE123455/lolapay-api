import { z } from 'zod';

export const listTransactionsSchema = z
    .object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        type: z.enum(['CREDIT', 'DEBIT']).optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
        q: z.string().trim().max(50).optional(),
    })
    .refine((d) => !d.from || !d.to || d.from <= d.to, { message: '`from` must be before `to`', path: ['from'] });

export const transactionIdSchema = z.object({ id: z.string().uuid() });

export type ListTransactionsQuery = z.infer<typeof listTransactionsSchema>;
