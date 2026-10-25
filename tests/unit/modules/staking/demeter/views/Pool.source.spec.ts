import { describe, expect, it } from 'vitest';

import demeterPoolSource from '@/features/pool/pages/DemeterPoolPage.vue?raw';

describe('Demeter Pool.vue source', () => {
  it('uses the page collapse helper for the farming badge visibility guard', () => {
    expect(demeterPoolSource).toContain('v-show="!page.isActiveCollapseItem(liquidity.address, activeCollapseItems)"');
    expect(demeterPoolSource).not.toContain('v-show="!isActiveCollapseItem(liquidity.address, activeCollapseItems)"');
  });

  it('routes calculator clicks through the calculator action instead of the dialog visibility ref', () => {
    expect(demeterPoolSource).toContain('@calculator="base.showPoolCalculator"');
    expect(demeterPoolSource).not.toContain('@calculator="base.showCalculatorDialog($event)"');
  });

  it('unwraps Demeter dialog refs before binding them into the template', () => {
    expect(demeterPoolSource).toContain('v-model:visible="showStakeDialog"');
    expect(demeterPoolSource).toContain('v-model:visible="showClaimDialog"');
    expect(demeterPoolSource).toContain('v-model:visible="showCalculatorDialog"');
    expect(demeterPoolSource).toContain(':parent-loading="dialogParentLoading"');
    expect(demeterPoolSource).toContain('v-bind="selectedDerivedPool"');
    expect(demeterPoolSource).toContain(':liquidity="selectedAccountLiquidity"');
    expect(demeterPoolSource).not.toContain('v-model:visible="page.showStakeDialog"');
    expect(demeterPoolSource).not.toContain('v-model:visible="page.showClaimDialog"');
    expect(demeterPoolSource).not.toContain('v-model:visible="base.showCalculatorDialog"');
    expect(demeterPoolSource).not.toContain(':parent-loading="parentLoading || page.loading"');
    expect(demeterPoolSource).not.toContain('v-bind="page.selectedDerivedPool"');
    expect(demeterPoolSource).not.toContain(':liquidity="base.selectedAccountLiquidity"');
  });
});
