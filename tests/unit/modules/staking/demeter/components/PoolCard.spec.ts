import { describe, expect, it } from 'vitest';

import poolCardSource from '@/modules/staking/demeter/components/PoolCard.vue?raw';

describe('Demeter PoolCard source', () => {
  it('uses direct shared and local imports instead of the demeter registries', () => {
    expect(poolCardSource).not.toContain('lazyComponent(');
    expect(poolCardSource).not.toContain('demeterStakingLazyComponent(');
    expect(poolCardSource).not.toContain('Components.');
    expect(poolCardSource).not.toContain('DemeterStakingComponents.');
    expect(poolCardSource).not.toContain("from '@/router'");
    expect(poolCardSource).not.toContain("from '../../router'");
    expect(poolCardSource).toContain(
      "import CalculatorButton from '@/modules/staking/demeter/components/CalculatorButton.vue';"
    );
    expect(poolCardSource).toContain("import PoolInfo from '@/components/shared/PoolInfo.vue';");
  });
});
