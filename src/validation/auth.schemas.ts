import { z } from 'zod';

export const tagSchema = z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-z0-9_]+$/, 'Tag may only contain lowercase letters, numbers and underscores');

export const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a number');

export const registerSchema = z.object({
    email: z.string().email().transform((e) => e.toLowerCase()),
    password: passwordSchema,
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    tag: tagSchema.optional(),
    phone: z.string().min(7).max(20).optional(),
});

export const loginSchema = z.object({
    email: z.string().email().transform((e) => e.toLowerCase()),
    password: z.string().min(1),
});

export const refreshSchema = z.object({
    refreshToken: z.string().min(10),
});

export const googleTokenSchema = z.object({
    idToken: z.string().min(10),
});

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1),
        newPassword: passwordSchema,
    })
    .refine((d) => d.currentPassword !== d.newPassword, {
        message: 'New password must be different from current password',
        path: ['newPassword'],
    });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
