import type { Request, Response, NextFunction } from 'express';
import * as beneficiaries from '../../src/services/beneficiaries.service';
import type { CreateBeneficiaryInput, ListBeneficiariesQuery, UpdateBeneficiaryInput } from '../validation/beneficiaries.schemas';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await beneficiaries.list(req.user!.id, req.query as unknown as ListBeneficiariesQuery) });
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json({ success: true, data: await beneficiaries.create(req.user!.id, req.body as CreateBeneficiaryInput) });
  } catch (e) {
    next(e);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await beneficiaries.update(req.user!.id, String(req.params['id']), req.body as UpdateBeneficiaryInput) });
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await beneficiaries.remove(req.user!.id, String(req.params['id']));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function followers(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await beneficiaries.followers(req.user!.id) });
  } catch (e) {
    next(e);
  }
}
