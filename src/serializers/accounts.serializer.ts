type Account = {
  id: string;
  accountNumber: string;
  currency: string;
  balance: { toFixed(digits: number): string };
  updatedAt: Date;
};

type Card = {
  id: string;
  brand: string;
  last4: string;
};

export const toAccount = (a: Account) => ({
  id: a.id,
  accountNumber: a.accountNumber,
  currency: a.currency,
  balance: a.balance.toFixed(2),
  updatedAt: a.updatedAt,
});

export const toCardSummary = (c: Card) => ({ id: c.id, brand: c.brand, last4: c.last4 });
