import { z } from 'zod';

const pagination = {
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
};

export const listUsersSchema = z.object({
    ...pagination,
    q: z.string().trim().max(60).optional(),
    status: z.enum(['active', 'inactive']).optional(),
    role: z.enum(['USER', 'ADMIN']).optional(),
});

export const listTransfersSchema = z
    .object({
        ...pagination,
        status: z.enum(['PENDING', 'COMPLETED', 'FAILED']).optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
        q: z.string().trim().max(60).optional(),
    })
    .refine((d) => !d.from || !d.to || d.from <= d.to, { message: '`from` must be before `to`', path: ['from'] });

export const userIdSchema = z.object({ id: z.string().uuid() });

export const updateUserStatusSchema = z.object({ isActive: z.boolean() });
export const updateUserRoleSchema = z.object({ role: z.enum(['USER', 'ADMIN']) });

export type ListUsersQuery = z.infer<typeof listUsersSchema>;
export type ListTransfersQuery = z.infer<typeof listTransfersSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
