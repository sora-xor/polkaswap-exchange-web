import { describe, expect, it } from 'vitest';

import stakingSource from '@/modules/staking/views/Staking.vue?raw';

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
});
