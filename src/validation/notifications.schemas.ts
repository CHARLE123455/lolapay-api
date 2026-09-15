import { z } from 'zod';

export const listNotificationsSchema = z.object({
    unreadOnly: z
        .enum(['true', 'false'])
        .default('false')
        .transform((v) => v === 'true'),
    limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const notificationIdSchema = z.object({ id: z.uuid() });

export type ListNotificationsQuery = z.infer<typeof listNotificationsSchema>;
