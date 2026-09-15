import { z } from 'zod';
import { CARD_BRANDS } from '../constants/cards';

export const createCardSchema = z.object({
    brand: z.enum(CARD_BRANDS).default('Visa'),
    holderName: z.string().trim().min(2).max(60).optional(),
});

export const cardStatusSchema = z.object({ status: z.enum(['ACTIVE', 'FROZEN']) });

export const cardIdSchema = z.object({ id: z.string().uuid() });

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type CardStatusInput = z.infer<typeof cardStatusSchema>;
