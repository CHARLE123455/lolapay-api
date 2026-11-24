import type { User } from '../../generated/prisma/client';

export interface PublicUser {
    id: string;
    email: string;
    tag: string;
    firstName: string;
    lastName: string;
    fullName: string;
    role: 'USER' | 'ADMIN';
    phone: string | null;
    avatarUrl: string | null;
    provider: string;
    hasPassword: boolean;
    createdAt: Date;
}

export function toPublicUser(u: User): PublicUser {
    return {
        id: u.id,
        email: u.email,
        tag: u.tag,
        firstName: u.firstName,
        lastName: u.lastName,
        fullName: `${u.firstName} ${u.lastName}`,
        role: u.role,
        phone: u.phone,
        avatarUrl: u.avatarUrl,
        provider: u.provider,
        hasPassword: Boolean(u.passwordHash),
        createdAt: u.createdAt,
    };
}

export interface UserSummary {
    id: string;
    tag: string;
    firstName: string;
    lastName: string;
    fullName: string;
    avatarUrl: string | null;
}

export function toUserSummary(u: Pick<User, 'id' | 'tag' | 'firstName' | 'lastName' | 'avatarUrl'>): UserSummary {
    return {
        id: u.id,
        tag: u.tag,
        firstName: u.firstName,
        lastName: u.lastName,
        fullName: `${u.firstName} ${u.lastName}`,
        avatarUrl: u.avatarUrl,
    };
}

export const userSummarySelect = { id: true, tag: true, firstName: true, lastName: true, avatarUrl: true } as const;
