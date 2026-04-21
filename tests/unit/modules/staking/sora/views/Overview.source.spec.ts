import { describe, expect, it } from 'vitest';

import overviewSource from '@/features/staking/pages/SoraOverviewPage.vue?raw';

describe('staking sora Overview source', () => {
  it('uses a dedicated vertical wrapper for the overview info lines', () => {
    expect(overviewSource).toContain('<div class="overview-info">');
    expect(overviewSource).not.toContain('<div class="info">');
    expect(overviewSource).toContain(":integer-only=\"minNominatorBondFormatted === '0'\"");
    expect(overviewSource).toMatch(
      /\.overview-info\s*\{\s*display:\s*flex;\s*flex-direction:\s*column;\s*width:\s*100%;\s*min-width:\s*0;\s*margin-top:\s*25px;\s*\}/s
    );
  });

  it('uses explicit feature-local async component exports instead of the legacy sora lazy-component registry', () => {
    expect(overviewSource).not.toContain('soraStakingLazyComponent(');
    expect(overviewSource).not.toContain('SoraStakingComponents.');
    expect(overviewSource).not.toContain('walletComponents.');
    expect(overviewSource).toContain(
      "import WalletFormattedAmountWithFiatValue from '@/lib/soraneo-wallet/src/components/FormattedAmountWithFiatValue.vue';"
    );
    expect(overviewSource).toContain("import WalletInfoLine from '@/lib/soraneo-wallet/src/components/InfoLine.vue';");
    expect(overviewSource).toContain("import WalletTokenLogo from '@/lib/soraneo-wallet/src/components/TokenLogo.vue';");
    expect(overviewSource).toContain("import BackButton from '@/modules/staking/sora/components/BackButton.vue';");
    expect(overviewSource).toContain(
      "import { SoraStakingPageNames, StakeDialogMode } from '@/modules/staking/sora/consts';"
    );
  });
});
