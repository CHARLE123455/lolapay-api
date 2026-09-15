import type { NextFunction, Request, Response } from 'express';
import * as uploads from '../services/uploads.service';

export async function setAvatar(req: Request, res: Response, next: NextFunction) {
    try {
        const request = req as Request & { file?: any };
        res.json({ success: true, data: await uploads.setAvatar(req.user!.id, request.file) });
    } catch (e) {
        next(e);
    }
}

export async function removeAvatar(req: Request, res: Response, next: NextFunction) {
    try {
        res.json({ success: true, data: await uploads.removeAvatar(req.user!.id) });
    } catch (e) {
        next(e);
    }
}
