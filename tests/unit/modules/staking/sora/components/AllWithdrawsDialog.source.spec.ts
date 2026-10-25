import { describe, expect, it } from 'vitest';

import allWithdrawsDialogSource from '@/modules/staking/sora/components/AllWithdrawsDialog.vue?raw';

describe('AllWithdrawsDialog source', () => {
  it('uses a direct local EraCountdown import instead of the sora registry', () => {
    expect(allWithdrawsDialogSource).not.toContain('soraStakingLazyComponent(');
    expect(allWithdrawsDialogSource).not.toContain('SoraStakingComponents.');
    expect(allWithdrawsDialogSource).not.toContain("from '../../router'");
    expect(allWithdrawsDialogSource).toContain(
      "import EraCountdown from '@/modules/staking/sora/components/EraCountdown.vue';"
    );
  });
});
