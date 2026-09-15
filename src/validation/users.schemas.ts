import { z } from 'zod';
import { tagSchema } from './auth.schemas';

export const updateProfileSchema = z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    phone: z.string().min(7).max(20).nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
    tag: tagSchema.optional(),
});

export const updateSettingsSchema = z.object({
    currency: z.enum(['NGN', 'USD', 'GBP', 'EUR']).optional(),
    language: z.enum(['en', 'fr', 'yo', 'ha', 'ig']).optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    transactionAlerts: z.boolean().optional(),
    marketingEmails: z.boolean().optional(),
    twoFactorEnabled: z.boolean().optional(),
});

export const searchSchema = z.object({
    q: z.string().min(1).max(50),
    limit: z.coerce.number().min(1).max(20).default(10),
});