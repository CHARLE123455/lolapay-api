import { eventBus } from '../events/bus';
import { badRequest, conflict, notFound } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { beneficiaryInclude, toBeneficiary } from '../serializers/beneficiaries.serializer';
import { toUserSummary, userSummarySelect } from '../serializers/users.serializer';
import type { CreateBeneficiaryInput, ListBeneficiariesQuery, UpdateBeneficiaryInput } from '../validation/beneficiaries.schemas';

export async function list(ownerId: string, { q, limit }: ListBeneficiariesQuery) {
    const rows = await prisma.beneficiary.findMany({
        where: {
            ownerId,
            beneficiaryUser: q
                ? {
                    OR: [
                        { firstName: { contains: q, mode: 'insensitive' } },
                        { lastName: { contains: q, mode: 'insensitive' } },
                        { tag: { contains: q, mode: 'insensitive' } },
                    ],
                }
                : undefined,
        },
        include: beneficiaryInclude,
        orderBy: [{ isFavourite: 'desc' }, { createdAt: 'desc' }],
        take: limit,
    });

    const lastTransfers = await prisma.transfer.findMany({
        where: { senderId: ownerId, recipientId: { in: rows.map((b: { beneficiaryUserId: any; }) => b.beneficiaryUserId) } },
        orderBy: { createdAt: 'desc' },
        distinct: ['recipientId'],
        select: { recipientId: true, amount: true, createdAt: true },
    });
    const last = new Map(lastTransfers.map((t: { recipientId: any; }) => [t.recipientId, t]));

    return rows.map((b: { beneficiaryUserId?: any; id?: string; nickname?: string | null; isFavourite?: boolean; createdAt?: Date; beneficiaryUser?: Pick<User, "tag" | "lastName" | "firstName" | "id" | "avatarUrl"> & { account: { accountNumber: string; } | null; }; }) => toBeneficiary(
        b,
        last.get(b.beneficiaryUserId) as { amount: { toFixed(n: number): string }; createdAt: Date } | undefined,
    ));
}

export async function create(ownerId: string, input: CreateBeneficiaryInput) {
    const { userId, tag, accountNumber, nickname } = input;
    const target = await prisma.user.findFirst({
        where: {
            isActive: true,
            ...(userId ? { id: userId } : tag ? { tag: tag.replace(/^@/, '').toLowerCase() } : { account: { accountNumber } }),
        },
    });
    if (!target) throw notFound('User not found');
    if (target.id === ownerId) throw badRequest('You cannot add yourself as a beneficiary');

    const exists = await prisma.beneficiary.findUnique({
        where: { ownerId_beneficiaryUserId: { ownerId, beneficiaryUserId: target.id } },
    });
    if (exists) throw conflict('This user is already in your beneficiaries');

    const [created, owner] = await Promise.all([
        prisma.beneficiary.create({ data: { ownerId, beneficiaryUserId: target.id, nickname }, include: beneficiaryInclude }),
        prisma.user.findUniqueOrThrow({ where: { id: ownerId } }),
    ]);

    await eventBus.publish({
        type: 'beneficiary.added',
        ownerId,
        ownerName: `${owner.firstName} ${owner.lastName}`,
        beneficiaryUserId: target.id,
        occurredAt: new Date().toISOString(),
    });

    return toBeneficiary(created);
}

export async function update(ownerId: string, id: string, patch: UpdateBeneficiaryInput) {
    const existing = await prisma.beneficiary.findFirst({ where: { id, ownerId } });
    if (!existing) throw notFound('Beneficiary not found');
    const updated = await prisma.beneficiary.update({ where: { id }, data: patch, include: beneficiaryInclude });
    return toBeneficiary(updated);
}

export async function remove(ownerId: string, id: string) {
    const { count } = await prisma.beneficiary.deleteMany({ where: { id, ownerId } });
    if (count === 0) throw notFound('Beneficiary not found');
}

export async function followers(userId: string) {
    const rows = await prisma.beneficiary.findMany({
        where: { beneficiaryUserId: userId },
        include: { owner: { select: userSummarySelect } },
        orderBy: { createdAt: 'desc' },
    });
    return rows.map((r: { id: any; createdAt: any; owner: Pick<User, "tag" | "lastName" | "firstName" | "id" | "avatarUrl">; }) => ({ id: r.id, since: r.createdAt, user: toUserSummary(r.owner) }));
}
