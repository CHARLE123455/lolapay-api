import type { Request, Response, NextFunction } from 'express';
import * as cards from '../services/cards.service';
import type { CardStatusInput, CreateCardInput } from '../validation/cards.schemas';

export async function list(req: Request, res: Response, next: NextFunction) {
    try {
        res.json({ success: true, data: await cards.list(req.user!.id) });
    } catch (e) {
        next(e);
    }
}

export async function issue(req: Request, res: Response, next: NextFunction) {
    try {
        res.status(201).json({ success: true, data: await cards.issue(req.user!.id, req.body as CreateCardInput) });
    } catch (e) {
        next(e);
    }
}

export async function setStatus(req: Request, res: Response, next: NextFunction) {
    try {
        res.json({ success: true, data: await cards.setStatus(req.user!.id, req.params['id'] as string, req.body as CardStatusInput) });
    } catch (e) {
        next(e);
    }
}

export async function setDefault(req: Request, res: Response, next: NextFunction) {
    try {
        res.json({ success: true, data: await cards.setDefault(req.user!.id, req.params['id'] as string) });
    } catch (e) {
        next(e);
    }
}

export async function cancel(req: Request, res: Response, next: NextFunction) {
    try {
        await cards.cancel(req.user!.id, req.params['id'] as string);
        res.status(204).send();
    } catch (e) {
        next(e);
    }
}
