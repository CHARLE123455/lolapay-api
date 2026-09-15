import type { Request, Response, NextFunction } from 'express';
import * as sessions from '../services/sessions.service';

export async function list(req: Request, res: Response, next: NextFunction) {
    try {
        res.json({ success: true, data: await sessions.listActive(req.user!.id, req.user!.sessionId) });
    } catch (e) {
        next(e);
    }
}

export async function revoke(req: Request, res: Response, next: NextFunction) {
    try {
        await sessions.revoke(req.user!.id, req.params['id'] as string);
        res.status(204).send();
    } catch (e) {
        next(e);
    }
}
