import type { Request, Response, NextFunction } from 'express';
import * as accounts from '../../src/services/accounts.service';
import type { SummaryQuery } from '../validation/accounts.schemas';

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await accounts.getMyAccount(req.user!.id) });
  } catch (e) {
    next(e);
  }
}

export async function summary(req: Request, res: Response, next: NextFunction) {
  try {
    const { month } = req.query as unknown as SummaryQuery;
    res.json({ success: true, data: await accounts.getSummary(req.user!.id, month) });
  } catch (e) {
    next(e);
  }
}
