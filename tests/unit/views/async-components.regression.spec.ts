import { describe, expect, it } from 'vitest';

import DemeterPoolView from '@/modules/staking/demeter/views/Pool.vue';
import StakingView from '@/modules/staking/views/Staking.vue';
import ReferralProgramView from '@/views/ReferralProgram.vue';

type VueSfcModule = {
  components?: Record<string, unknown>;
  __vccOpts?: {
    components?: Record<string, unknown>;
  };
};

function getRegisteredComponent(sfc: VueSfcModule, name: string): unknown {
  return sfc.components?.[name] ?? sfc.__vccOpts?.components?.[name];
}

function assertAsyncComponent(component: unknown): void {
  expect(component).toBeDefined();
  expect(typeof (component as { __asyncLoader?: unknown }).__asyncLoader).toBe('function');
}

describe('async component registration regressions', () => {
  it('registers Demeter pool base as an async component wrapper', () => {
    const poolBase = getRegisteredComponent(DemeterPoolView as VueSfcModule, 'PoolBase');

    assertAsyncComponent(poolBase);
  });

  it('registers staking pool base as an async component wrapper', () => {
    const poolBase = getRegisteredComponent(StakingView as VueSfcModule, 'PoolBase');

    assertAsyncComponent(poolBase);
  });

  it('registers referral bonding as an async component wrapper', () => {
    const referralBonding = getRegisteredComponent(ReferralProgramView as VueSfcModule, 'ReferralBonding');

    assertAsyncComponent(referralBonding);
  });
});
