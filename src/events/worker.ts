import { eventBus } from './bus';
import { handleEvent } from './handlers';
import { logger } from '../logger';
import { prisma } from '../prisma';

async function main() {
    await eventBus.connect();
    await eventBus.subscribe(handleEvent);
    logger.info({ bus: eventBus.kind }, 'LolaPay notifications worker started');
}

main().catch((err) => {
    logger.error(err, 'worker crashed');
    process.exit(1);
});

const shutdown = async () => {
    await eventBus.disconnect();
    await prisma.$disconnect();
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
