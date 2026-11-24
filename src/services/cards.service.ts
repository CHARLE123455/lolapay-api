import { prisma } from '../lib/prisma';
import { badRequest, notFound } from '../lib/errors';
import { generateCardLast4 } from '../lib/tokens';
import { CARD_VALIDITY_YEARS, MAX_CARDS_PER_USER } from '../constants/cards';
import { toCard } from '../serializers/cards.serializer';
import type { CardStatusInput, CreateCardInput } from '../validation/cards.schemas';

const notCancelled = { NOT: { status: 'CANCELLED' as const } };

async function findOwned(userId: string, id: string) {
    const card = await prisma.card.findFirst({ where: { id, userId, ...notCancelled } });
    if (!card) throw notFound('Card not found');
    return card;
}
  
export async function list(userId: string) {
    const cards = await prisma.card.findMany({
        where: { userId, ...notCancelled },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return cards.map(toCard);
}

export async function issue(userId: string, input: CreateCardInput) {
    const count = await prisma.card.count({ where: { userId, ...notCancelled } });
    if (count >= MAX_CARDS_PER_USER) throw badRequest(`You can have at most ${MAX_CARDS_PER_USER} cards`);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const now = new Date();
    const card = await prisma.card.create({
        data: {
            userId,
            brand: input.brand,
            last4: generateCardLast4(),
            holderName: (input.holderName ?? `${user.firstName} ${user.lastName}`).toUpperCase(),
            expMonth: now.getMonth() + 1,
            expYear: now.getFullYear() + CARD_VALIDITY_YEARS,
            isDefault: count === 0,
        },
    });
    return toCard(card);
}

export async function setStatus(userId: string, id: string, { status }: CardStatusInput) {
    const card = await findOwned(userId, id);
    return toCard(await prisma.card.update({ where: { id: card.id }, data: { status } }));
}

export async function setDefault(userId: string, id: string) {
    const card = await prisma.card.findFirst({ where: { id, userId, status: 'ACTIVE' } });
    if (!card) throw notFound('Active card not found');
    const [, updated] = await prisma.$transaction([
        prisma.card.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } }),
        prisma.card.update({ where: { id: card.id }, data: { isDefault: true } }),
    ]);
    return toCard(updated);
}

export async function cancel(userId: string, id: string) {
    const card = await findOwned(userId, id);
    await prisma.card.update({ where: { id: card.id }, data: { status: 'CANCELLED', isDefault: false } });
}
