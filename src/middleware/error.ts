import { Prisma } from '../../generated/prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import type { MulterError } from 'multer';


const isMulterError = (e: unknown): e is MulterError => e instanceof Error && e.name === 'MulterError';

function isJsonSyntaxError(err: unknown): err is SyntaxError & { status?: number; body?: unknown } {
    return err instanceof SyntaxError && 'body' in err;
}

export function notFoundHandler(req: Request, res: Response) {
    res.status(404).json({ success: false, code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (err instanceof AppError) {
        return res
            .status(err.statusCode)
            .json({ success: false, code: err.code, message: err.message, details: err.details ?? undefined });
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        const prismaError = err;
        if (prismaError.code === 'P2002') {
            const target = (prismaError.meta?.['target'] as string[] | undefined)?.join(', ');
            return res
                .status(409)
                .json({ success: false, code: 'CONFLICT', message: `A record with this ${target ?? 'value'} already exists` });
        }
        if (prismaError.code === 'P2025') {
            return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Resource not found' });
        }
    }

    if (isJsonSyntaxError(err)) {
        return res.status(400).json({ success: false, code: 'BAD_JSON', message: 'Malformed JSON body' });
    }

    if (isMulterError(err)) {
        const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller' : err.message;
        return res.status(400).json({ success: false, code: 'BAD_REQUEST', message });
    }

    logger.error({ err }, 'unhandled error');
    return res.status(500).json({
        success: false,
        code: 'INTERNAL_ERROR',
        message: env.isProd ? 'Something went wrong' : (err as Error).message,
    });
}