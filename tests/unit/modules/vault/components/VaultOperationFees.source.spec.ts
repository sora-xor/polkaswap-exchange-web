import { describe, expect, it } from 'vitest';

import borrowMoreSource from '@/modules/vault/components/BorrowMoreDialog.vue?raw';
import repayDebtSource from '@/modules/vault/components/RepayDebtDialog.vue?raw';

describe('vault operation fee selection', () => {
  it('uses the borrow operation fee for borrow-more display and validation', () => {
    expect(borrowMoreSource).toContain('networkFees.value?.[Operation.BorrowVaultDebt]');
    expect(borrowMoreSource).not.toContain('networkFees.value?.[Operation.CreateVault]');
  });

  it('uses the repay operation fee for repay-debt display and validation', () => {
    expect(repayDebtSource).toContain('networkFees.value?.[Operation.RepayVaultDebt]');
    expect(repayDebtSource).not.toContain('networkFees.value?.[Operation.CreateVault]');
  });
});
