import type { Request, Response, NextFunction } from 'express';
import * as admin from '../services/admin.service';
import type { ListTransfersQuery, ListUsersQuery, UpdateUserRoleInput, UpdateUserStatusInput } from '../validation/admin.schemas';

export async function overview(_req: Request, res: Response, next: NextFunction) {
    try {
        res.json({ success: true, data: await admin.overview() });
    } catch (e) {
        next(e);
    }
}

export async function listUsers(req: Request, res: Response, next: NextFunction) {
    try {
        const { data, meta } = await admin.listUsers(req.query as unknown as ListUsersQuery);
        res.json({ success: true, data, meta });
    } catch (e) {
        next(e);
    }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
    try {
        res.json({ success: true, data: await admin.getUser(req.params['id'] as string) });
    } catch (e) {
        next(e);
    }
}

export async function setUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
        res.json({ success: true, data: await admin.setUserStatus(req.user!.id, req.params['id'] as string, req.body as UpdateUserStatusInput) });
    } catch (e) {
        next(e);
    }
}

export async function setUserRole(req: Request, res: Response, next: NextFunction) {
    try {
        res.json({ success: true, data: await admin.setUserRole(req.user!.id, req.params['id'] as string, req.body as UpdateUserRoleInput) });
    } catch (e) {
        next(e);
    }
}

export async function listTransfers(req: Request, res: Response, next: NextFunction) {
    try {
        const { data, meta } = await admin.listTransfers(req.query as unknown as ListTransfersQuery);
        res.json({ success: true, data, meta });
    } catch (e) {
        next(e);
    }
}
