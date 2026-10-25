import { describe, expect, it } from 'vitest';

import stakingSource from '@/features/staking/pages/StakingPage.vue?raw';

describe('Staking.vue source', () => {
  it('wires calculator actions through the Demeter page helper', () => {
    expect(stakingSource).toContain('@calculator="showPoolCalculator"');
    expect(stakingSource).toContain('const showPoolCalculator = base.showPoolCalculator;');
  });

  it('unwraps Demeter dialog refs before passing them into modal bindings', () => {
    expect(stakingSource).toContain('v-model:visible="showStakeDialog"');
    expect(stakingSource).toContain('v-model:visible="showClaimDialog"');
    expect(stakingSource).toContain('v-model:visible="showCalculatorDialog"');
    expect(stakingSource).toContain('v-bind="selectedDerivedPool"');
    expect(stakingSource).not.toContain('v-model:visible="page.showStakeDialog"');
    expect(stakingSource).not.toContain('v-model:visible="page.showClaimDialog"');
    expect(stakingSource).not.toContain('v-model:visible="base.showCalculatorDialog"');
    expect(stakingSource).not.toContain('v-bind="page.selectedDerivedPool"');
  });

  it('uses explicit feature-local async component exports instead of legacy lazy-component registries', () => {
    expect(stakingSource).not.toContain('demeterStakingLazyComponent(');
    expect(stakingSource).not.toContain('soraStakingLazyComponent(');
    expect(stakingSource).not.toContain('DemeterStakingComponents.');
    expect(stakingSource).not.toContain('SoraStakingComponents.');
  });
});
