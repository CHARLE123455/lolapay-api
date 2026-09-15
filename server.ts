import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { eventBus } from './events/bus';
import { handleEvent } from './events/handlers';

async function main() {
  await prisma.$connect();
  await eventBus.connect();

  if (eventBus.kind === 'memory' || process.env.EMBED_WORKER !== 'false') {
    await eventBus.subscribe(handleEvent);
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`LolaPay API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    logger.info(`Google OAuth: ${env.googleEnabled ? 'enabled' : 'disabled'} | Event bus: ${eventBus.kind}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await eventBus.disconnect();
      await prisma.$disconnect();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error(err, 'failed to start');
  process.exit(1);
});
