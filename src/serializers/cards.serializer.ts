import type { Card } from '../../generated/prisma/client';

export const toCard = (c: Card) => ({
    id: c.id,
    brand: c.brand,
    last4: c.last4,
    maskedNumber: `**** **** **** ${c.last4}`,
    holderName: c.holderName,
    expMonth: c.expMonth,
    expYear: c.expYear,
    expiry: `${String(c.expMonth).padStart(2, '0')}/${String(c.expYear).slice(-2)}`,
    status: c.status,
    isDefault: c.isDefault,
    createdAt: c.createdAt,
});
