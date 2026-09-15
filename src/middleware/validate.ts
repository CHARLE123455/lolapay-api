import type { NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';
import { badRequest } from '../lib/errors';

type Schema = ZodType;

export const validate =
    (schemas: { body?: Schema; query?: Schema; params?: Schema }) =>
        (req: Request, _res: Response, next: NextFunction) => {
            for (const key of ['body', 'query', 'params'] as const) {
                const schema = schemas[key];
                if (!schema) continue;
                const result = schema.safeParse(req[key]);
                if (!result.success) {
                    return next(
                        badRequest(
                            'Validation failed',
                            result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
                        ),
                    );
                }
                req[key] = result.data;
            }
            next();
        };
