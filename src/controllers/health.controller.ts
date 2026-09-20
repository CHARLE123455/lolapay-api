import type { Request, Response } from 'express';
import * as healthService from '../services/health.service';

export async function check(_req: Request, res: Response) {
    const report = await healthService.check();
    res.status(report.status === 'ok' ? 200 : 503).json(report);
}
