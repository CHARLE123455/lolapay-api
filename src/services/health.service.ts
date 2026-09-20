import { prisma } from '../lib/prisma';
import { eventBus } from '../events/bus';

export async function check() {
    let db: 'ok' | 'down' = 'ok';
    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch {
        db = 'down';
    }
    return {
        status: db === 'ok' ? ('ok' as const) : ('degraded' as const),
        db,
        eventBus: eventBus.kind,
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
    };
}
