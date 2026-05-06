import { describe, expect, it } from 'vitest';

import vaultDetailsSource from '@/features/vault/pages/VaultDetailsPage.vue?raw';

describe('VaultDetails source', () => {
  it('renders integer-only amounts for zero-fraction vault balances', () => {
    expect(vaultDetailsSource).toContain(':integer-only="isAmountValueIntegerOnly(formattedLockedAmount)"');
    expect(vaultDetailsSource).toContain(':integer-only="isAmountValueIntegerOnly(formattedDebtAmount)"');
    expect(vaultDetailsSource).toContain(':integer-only="isAmountValueIntegerOnly(formattedAvailableToBorrow)"');
    expect(vaultDetailsSource).toContain(':integer-only="isAmountValueIntegerOnly(formattedReturnedAmount)"');
  });
});
