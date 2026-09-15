import { EventEmitter } from 'events';
import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { EventHandler, LolaPayEvent } from './types';

export interface EventBus {
    publish(event: LolaPayEvent): Promise<void>;
    subscribe(handler: EventHandler): Promise<void>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    readonly kind: 'kafka' | 'memory';
}

function topicFor(event: LolaPayEvent): string {
    return event.type.startsWith('auth.') ? env.KAFKA_TOPIC_AUTH : env.KAFKA_TOPIC_TRANSFERS;
}

class MemoryBus implements EventBus {
    readonly kind = 'memory' as const;
    private emitter = new EventEmitter();

    async connect() {
        logger.info('Event bus: in-memory (set KAFKA_BROKERS to use Kafka)');
    }
    async disconnect() {
        this.emitter.removeAllListeners();
    }
    async publish(event: LolaPayEvent) {
        setImmediate(() => this.emitter.emit('event', event));
    }
    async subscribe(handler: EventHandler) {
        this.emitter.on('event', (e: LolaPayEvent) => {
            handler(e).catch((err) => logger.error({ err, event: e.type }, 'event handler failed'));
        });
    }
}

class KafkaBus implements EventBus {
    readonly kind = 'kafka' as const;
    private kafka: Kafka;
    private producer: Producer;
    private consumer?: Consumer;
    private connected = false;

    constructor() {
        this.kafka = new Kafka({
            clientId: env.KAFKA_CLIENT_ID,
            brokers: env.kafkaBrokers,
            logLevel: logLevel.WARN,
            ...(env.KAFKA_SSL ? { ssl: true } : {}),
            ...(env.KAFKA_SASL_USERNAME && env.KAFKA_SASL_PASSWORD
                ? {
                      sasl: {
                          mechanism: 'plain' as const,
                          username: env.KAFKA_SASL_USERNAME,
                          password: env.KAFKA_SASL_PASSWORD,
                      },
                  }
                : {}),
            retry: { retries: 5, initialRetryTime: 300 },
        });
        this.producer = this.kafka.producer({ allowAutoTopicCreation: true });
    }

    async connect() {
        await this.ensureTopics();
        await this.producer.connect();
        this.connected = true;
        logger.info({ brokers: env.kafkaBrokers }, 'Event bus: Kafka producer connected');
    }

    private async ensureTopics() {
        const admin = this.kafka.admin();
        await admin.connect();
        try {
            const existing = await admin.listTopics();
            const wanted = [env.KAFKA_TOPIC_TRANSFERS, env.KAFKA_TOPIC_AUTH].filter((t) => !existing.includes(t));
            if (wanted.length) {
                await admin.createTopics({
                    waitForLeaders: true,
                    topics: wanted.map((topic) => ({ topic, numPartitions: 3, replicationFactor: 1 })),
                });
                logger.info({ topics: wanted }, 'created Kafka topics');
            }
        } finally {
            await admin.disconnect();
        }
    }

    async disconnect() {
        await this.consumer?.disconnect();
        if (this.connected) await this.producer.disconnect();
    }

    async publish(event: LolaPayEvent) {
        const key = 'transferId' in event ? event.transferId : 'userId' in event ? event.userId : event.ownerId;
        try {
            await this.producer.send({
                topic: topicFor(event),
                messages: [{ key, value: JSON.stringify(event), headers: { type: event.type } }],
            });
        } catch (err) {
            logger.error({ err, type: event.type }, 'failed to publish event to Kafka');
        }
    }

    async subscribe(handler: EventHandler) {
        this.consumer = this.kafka.consumer({ groupId: `${env.KAFKA_CLIENT_ID}-notifications` });
        await this.consumer.connect();
        await this.consumer.subscribe({ topics: [env.KAFKA_TOPIC_TRANSFERS, env.KAFKA_TOPIC_AUTH], fromBeginning: false });
        await this.consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                if (!message.value) return;
                try {
                    const event = JSON.parse(message.value.toString()) as LolaPayEvent;
                    await handler(event);
                } catch (err) {
                    logger.error({ err, topic, partition, offset: message.offset }, 'consumer failed to process message');
                }
            },
        });
        logger.info('Event bus: Kafka consumer running');
    }
}

export const eventBus: EventBus = env.kafkaBrokers.length > 0 ? new KafkaBus() : new MemoryBus();
