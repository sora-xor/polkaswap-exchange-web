import { describe, expect, it } from 'vitest';

import confirmBondingSource from '@/features/referrals/components/ConfirmBonding.vue?raw';
import confirmInviteUserSource from '@/features/referrals/components/ConfirmInviteUser.vue?raw';
import legacyConfirmBondingSource from '@/components/pages/Referrals/ConfirmBonding.vue?raw';
import legacyConfirmInviteUserSource from '@/components/pages/Referrals/ConfirmInviteUser.vue?raw';

describe('referrals feature component migration', () => {
  it('keeps the live referrals dialogs inside the feature boundary', () => {
    expect(confirmInviteUserSource).toContain("from '@/stores/referrals'");
    expect(confirmInviteUserSource).toContain("name: 'ReferralsConfirmInviteUser'");
    expect(confirmBondingSource).toContain("from '@/stores/referrals'");
    expect(confirmBondingSource).toContain("name: 'ReferralsConfirmBonding'");
  });

  it('keeps the legacy referrals dialog components as thin wrappers', () => {
    expect(legacyConfirmInviteUserSource).toContain(
      "import ConfirmInviteUser from '@/features/referrals/components/ConfirmInviteUser.vue';"
    );
    expect(legacyConfirmInviteUserSource).not.toContain("from '@/stores/referrals'");

    expect(legacyConfirmBondingSource).toContain(
      "import ConfirmBonding from '@/features/referrals/components/ConfirmBonding.vue';"
    );
    expect(legacyConfirmBondingSource).not.toContain("from '@/stores/referrals'");
  });
});
