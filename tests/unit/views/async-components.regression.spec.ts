import { describe, expect, it } from 'vitest';

import demeterPoolSource from '@/features/pool/pages/DemeterPoolPage.vue?raw';
import stakingSource from '@/features/staking/pages/StakingPage.vue?raw';
import referralProgramSource from '@/features/rewards/pages/ReferralProgramPage.vue?raw';

describe('feature page import regressions', () => {
  it('uses direct Demeter page imports instead of lazy legacy wrappers', () => {
    expect(demeterPoolSource).toContain("import PoolBase from '@/modules/pool/views/Pool.vue';");
    expect(demeterPoolSource).toContain("import PoolCard from '@/modules/staking/demeter/components/PoolCard.vue';");
    expect(demeterPoolSource).toContain(
      "import StatusBadge from '@/modules/staking/demeter/components/StatusBadge.vue';"
    );
    expect(demeterPoolSource).not.toContain('defineAsyncComponent');
    expect(demeterPoolSource).not.toContain('/legacy/');
  });

  it('uses direct staking page imports instead of lazy legacy wrappers', () => {
    expect(stakingSource).toContain("import PoolBase from '@/modules/pool/views/Pool.vue';");
    expect(stakingSource).toContain("import PoolCard from '@/modules/staking/demeter/components/PoolCard.vue';");
    expect(stakingSource).toContain(
      "import DemeterStatusBadge from '@/modules/staking/demeter/components/StatusBadge.vue';"
    );
    expect(stakingSource).toContain("import SoraStatusBadge from '@/modules/staking/sora/components/StatusBadge.vue';");
    expect(stakingSource).not.toContain('defineAsyncComponent');
    expect(stakingSource).not.toContain('/legacy/');
  });

  it('uses the direct referral bonding page import', () => {
    expect(referralProgramSource).toContain(
      "import ReferralBonding from '@/features/referrals/pages/ReferralBondingPage.vue';"
    );
    expect(referralProgramSource).not.toContain('defineAsyncComponent');
    expect(referralProgramSource).not.toContain('/legacy/');
  });
});
