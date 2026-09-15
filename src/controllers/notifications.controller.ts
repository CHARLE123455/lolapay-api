import type { Request, Response, NextFunction } from 'express';
import * as notifications from '../services/notifications.services';
import type { ListNotificationsQuery } from '../validation/notifications.schemas';

export async function list(req: Request, res: Response, next: NextFunction) {
    try {
        const { data, meta } = await notifications.list(req.user!.id, req.query as unknown as ListNotificationsQuery);
        res.json({ success: true, data, meta });
    } catch (e) {
        next(e);
    }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
    try {
        await notifications.markRead(req.user!.id, req.params['id'] as string);
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
        res.json({ success: true, data: await notifications.markAllRead(req.user!.id) });
    } catch (e) {
        next(e);
    }
}
