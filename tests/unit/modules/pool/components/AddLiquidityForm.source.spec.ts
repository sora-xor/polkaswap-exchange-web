import { describe, expect, it } from 'vitest';

import addLiquidityFormSource from '@/modules/pool/components/AddLiquidity/Form.vue?raw';

describe('AddLiquidity Form source', () => {
  it('keeps the SelectToken component reference distinct from the select handler', () => {
    expect(addLiquidityFormSource).toContain('<SelectToken');
    expect(addLiquidityFormSource).toContain('@select="handleSelectToken"');
    expect(addLiquidityFormSource).not.toContain('<select-token');
    expect(addLiquidityFormSource).toContain('const handleSelectToken = async (token: AccountAsset) => {');
    expect(addLiquidityFormSource).not.toContain('const selectToken = async (token: AccountAsset) => {');
  });

  it('uses direct local and shared imports instead of the lazy registries', () => {
    expect(addLiquidityFormSource).not.toContain('lazyComponent(');
    expect(addLiquidityFormSource).not.toContain('poolLazyComponent(');
    expect(addLiquidityFormSource).not.toContain('Components.');
    expect(addLiquidityFormSource).not.toContain('PoolComponents.');
    expect(addLiquidityFormSource).not.toContain("from '@/router'");
    expect(addLiquidityFormSource).not.toContain("from '@/modules/pool/router'");
    expect(addLiquidityFormSource).toContain(
      "import WalletComponentInfoLine from '@/lib/soraneo-wallet/src/components/InfoLine.vue';"
    );
    expect(addLiquidityFormSource).toContain(
      "import AddLiquidityConfirm from '@/modules/pool/components/AddLiquidity/Confirm.vue';"
    );
    expect(addLiquidityFormSource).toContain(
      "import AddLiquidityTransactionDetails from '@/modules/pool/components/AddLiquidity/TransactionDetails.vue';"
    );
    expect(addLiquidityFormSource).toContain("import SelectToken from '@/components/shared/SelectAsset/SelectToken.vue';");
    expect(addLiquidityFormSource).toContain(
      "import SlippageTolerance from '@/components/shared/Settings/SlippageTolerance.vue';"
    );
    expect(addLiquidityFormSource).toContain(
      "import NetworkFeeWarningDialog from '@/components/shared/Dialog/NetworkFeeWarning.vue';"
    );
    expect(addLiquidityFormSource).toContain("import TokenInput from '@/components/shared/Input/TokenInput.vue';");
  });
});
