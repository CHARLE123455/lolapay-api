import { toUserSummary, userSummarySelect } from './users.serializer';

export const beneficiaryInclude = {
  beneficiaryUser: { select: { ...userSummarySelect, account: { select: { accountNumber: true } } } },
} as const;

type BeneficiaryRow = {
  id: string;
  nickname: string | null;
  isFavourite: boolean;
  createdAt: Date;
  beneficiaryUser: Parameters<typeof toUserSummary>[0] & { account: { accountNumber: string } | null };
};

export const toBeneficiary = (b: BeneficiaryRow, lastTransfer?: { amount: { toFixed(n: number): string }; createdAt: Date }) => ({
  id: b.id,
  nickname: b.nickname,
  isFavourite: b.isFavourite,
  createdAt: b.createdAt,
  displayName: b.nickname ?? `${b.beneficiaryUser.firstName} ${b.beneficiaryUser.lastName}`,
  user: { ...toUserSummary(b.beneficiaryUser), accountNumber: b.beneficiaryUser.account?.accountNumber ?? null },
  lastTransfer: lastTransfer ? { amount: lastTransfer.amount.toFixed(2), at: lastTransfer.createdAt } : null,
});
