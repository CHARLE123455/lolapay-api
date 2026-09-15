import { z } from 'zod';

export const createBeneficiarySchema = z
    .object({
        userId: z.string().uuid().optional(),
        tag: z.string().min(3).max(21).optional(),
        accountNumber: z.string().length(10).optional(),
        nickname: z.string().trim().max(50).optional(),
    })
    .refine((d) => d.userId || d.tag || d.accountNumber, { message: 'Provide userId, tag or accountNumber' });

export const updateBeneficiarySchema = z
    .object({
        nickname: z.string().trim().max(50).nullable().optional(),
        isFavourite: z.boolean().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' });

export const listBeneficiariesSchema = z.object({
    q: z.string().trim().max(50).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const beneficiaryIdSchema = z.object({ id: z.string().uuid() });

export type CreateBeneficiaryInput = z.infer<typeof createBeneficiarySchema>;
export type UpdateBeneficiaryInput = z.infer<typeof updateBeneficiarySchema>;
export type ListBeneficiariesQuery = z.infer<typeof listBeneficiariesSchema>;
