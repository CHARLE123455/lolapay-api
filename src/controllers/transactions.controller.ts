import type { Request, Response, NextFunction } from 'express';
import * as transactions from '../services/transactions.service';
import type { ListTransactionsQuery } from '../validation/transactions.schemas';

export async function list(req: Request, res: Response, next: NextFunction) {
    try {
        const query = req.query as unknown as ListTransactionsQuery;
        const { data, meta } = await transactions.list(req.user!.id, query);
        res.json({ success: true, data, meta });
    } catch (e) {
        next(e);
    }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
    try {
        res.json({ success: true, data: await transactions.getById(req.user!.id, req.params['id'] as string) });
    } catch (e) {
        next(e);
    }
}
