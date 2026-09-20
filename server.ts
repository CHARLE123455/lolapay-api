import { createApp } from './app';
import { env } from './src/config/env';
import { logger } from './src/lib/logger';
import { prisma } from './src/lib/prisma';
import { eventBus } from './src/events/bus';
import { handleEvent } from './src/events/handlers';

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function main() {
  await prisma.$connect();
  await eventBus.connect();

  if (eventBus.kind === 'memory' || process.env['EMBED_WORKER'] !== 'false') {
    await eventBus.subscribe(handleEvent);
  }

  const server = createApp().listen(env.PORT, () => {
    logger.info(`LolaPay API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    logger.info(`Google OAuth: ${env.googleEnabled ? 'enabled' : 'disabled'} | Event bus: ${eventBus.kind}`);
  });

  let shuttingDown = false;

  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down`);

    const forceExit = setTimeout(() => {
      logger.error('shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    server.close(async (err) => {
      if (err) logger.error(err, 'error while closing server');
      try {
        await eventBus.disconnect();
        await prisma.$disconnect();
      } catch (cleanupErr) {
        logger.error(cleanupErr, 'error during shutdown cleanup');
      } finally {
        clearTimeout(forceExit);
        process.exit(0);
      }
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error(err, 'failed to start');
  process.exit(1);
});
