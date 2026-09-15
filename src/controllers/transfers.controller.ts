import type { Request, Response, NextFunction } from 'express';
import * as transfers from '../services/transfers.service';
import type { ListTransfersQuery, SendMoneyInput } from '../validation/transfers.schemas';

export async function send(req: Request, res: Response, next: NextFunction) {
    try {
        const body = req.body as SendMoneyInput;
        const idempotencyKey = body.idempotencyKey ?? req.header('Idempotency-Key');
        const data = await transfers.sendMoney(req.user!.id, { ...body, idempotencyKey });
        res.status(201).json({ success: true, data });
    } catch (e) {
        next(e);
    }
}

export async function list(req: Request, res: Response, next: NextFunction) {
    try {
        const query = req.query as unknown as ListTransfersQuery;
        const { data, meta } = await transfers.list(req.user!.id, query);
        res.json({ success: true, data, meta });
    } catch (e) {
        next(e);
    }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
    try {
        res.json({ success: true, data: await transfers.getById(req.user!.id, req.params['id'] as string) });
    } catch (e) {
        next(e);
    }
}
