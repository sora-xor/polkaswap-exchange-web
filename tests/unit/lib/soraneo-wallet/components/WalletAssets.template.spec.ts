import { describe, expect, it } from 'vitest';

describe('WalletAssets template', () => {
  it('uses the vuedraggable item slot API', async () => {
    const source = (await import('@/lib/soraneo-wallet/src/components/WalletAssets.vue?raw')).default as string;

    expect(source).toContain('item-key="address"');
    expect(source).toContain('<template #item');
    expect(source).toContain('v-if="assetList.length"');
    expect(source).toContain('<div v-else class="wallet-assets__draggable">');
  });
});
