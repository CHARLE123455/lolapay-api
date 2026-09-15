import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { listNotificationsSchema, notificationIdSchema } from '../validation/notifications.schemas';
import * as notification from '../controllers/notifications.controller';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get('/', validate({ query: listNotificationsSchema }), notification.list);
notificationsRouter.post('/read-all', notification.markAllRead);
notificationsRouter.patch('/:id/read', validate({ params: notificationIdSchema }), notification.markRead);
