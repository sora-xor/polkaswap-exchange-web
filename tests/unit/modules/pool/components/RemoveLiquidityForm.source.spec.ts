import { describe, expect, it } from 'vitest';

import removeLiquidityFormSource from '@/modules/pool/components/RemoveLiquidity/Form.vue?raw';

describe('RemoveLiquidity Form source', () => {
  it('uses direct local and shared imports instead of the lazy registries', () => {
    expect(removeLiquidityFormSource).not.toContain('lazyComponent(');
    expect(removeLiquidityFormSource).not.toContain('poolLazyComponent(');
    expect(removeLiquidityFormSource).not.toContain('Components.');
    expect(removeLiquidityFormSource).not.toContain('PoolComponents.');
    expect(removeLiquidityFormSource).not.toContain("from '@/router'");
    expect(removeLiquidityFormSource).not.toContain("from '@/modules/pool/router'");
    expect(removeLiquidityFormSource).toContain(
      "import RemoveLiquidityConfirm from '@/modules/pool/components/RemoveLiquidity/Confirm.vue';"
    );
    expect(removeLiquidityFormSource).toContain(
      "import RemoveLiquidityTransactionDetails from '@/modules/pool/components/RemoveLiquidity/TransactionDetails.vue';"
    );
    expect(removeLiquidityFormSource).toContain(
      "import SlippageTolerance from '@/components/shared/Settings/SlippageTolerance.vue';"
    );
    expect(removeLiquidityFormSource).toContain(
      "import NetworkFeeWarningDialog from '@/components/shared/Dialog/NetworkFeeWarning.vue';"
    );
    expect(removeLiquidityFormSource).toContain("import TokenInput from '@/components/shared/Input/TokenInput.vue';");
  });
});
