import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(4000),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    WEB_APP_URL: z.string().default('http://localhost:5173'),

    DATABASE_URL: z.string().min(1),

    JWT_ACCESS_SECRET: z.string().min(16),
    JWT_REFRESH_SECRET: z.string().min(16),
    ACCESS_TOKEN_TTL: z.string().default('15m'),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),

    GOOGLE_CLIENT_ID: z.string().optional().default(''),
    GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
    GOOGLE_CALLBACK_URL: z.string().default('http://localhost:4000/api/v1/auth/google/callback'),

    KAFKA_BROKERS: z.string().optional().default(''),
    KAFKA_CLIENT_ID: z.string().default('lolapay-api'),
    KAFKA_TOPIC_TRANSFERS: z.string().default('lolapay.transfers'),
    KAFKA_TOPIC_AUTH: z.string().default('lolapay.auth'),
    KAFKA_SSL: z
        .string()
        .optional()
        .default('false')
        .transform((v) => v === 'true'),
    KAFKA_SASL_USERNAME: z.string().optional().default(''),
    KAFKA_SASL_PASSWORD: z.string().optional().default(''),

    CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_API_KEY: z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),

    LOG_LEVEL: z.string().default('info'),
    WELCOME_BONUS: z.coerce.number().default(5000),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = {
    ...parsed.data,
    corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
    kafkaBrokers: parsed.data.KAFKA_BROKERS.split(',').map((s) => s.trim()).filter(Boolean),
    googleEnabled: Boolean(parsed.data.GOOGLE_CLIENT_ID),
    isProd: parsed.data.NODE_ENV === 'production',
};

export type Env = typeof env;
