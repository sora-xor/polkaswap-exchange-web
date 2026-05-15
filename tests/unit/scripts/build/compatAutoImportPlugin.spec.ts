import { describe, expect, it } from 'vitest';

import { compatAutoImportPlugin } from '../../../../scripts/build/compatAutoImportPlugin.mjs';

describe('compatAutoImportPlugin', () => {
  const plugin = compatAutoImportPlugin({
    soramitsuUiRootPath: '/repo/src/lib/soramitsu-ui',
    soraneoWalletSrcPath: '/repo/src/lib/soraneo-wallet/src',
  });

  it('injects missing Vue imports only for vendored compatibility sources', () => {
    const source = '<script>export default { setup() { const value = ref(0); return { value }; } };</script>';

    const transformed = plugin.transform(source, '/repo/src/lib/soramitsu-ui/components/Legacy.vue');

    expect(transformed).toContain("import { ref } from 'vue';");
    expect(plugin.transform(source, '/repo/src/features/swap/SwapPage.vue')).toBeNull();
  });

  it('leaves files alone when the identifier is already locally bound', () => {
    const source = 'const ref = () => 1; export const value = ref();';

    expect(plugin.transform(source, '/repo/src/lib/soraneo-wallet/src/util.ts')).toBeNull();
  });
});
