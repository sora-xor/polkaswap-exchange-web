import { describe, expect, it } from 'vitest';

describe('WalletAssets template', () => {
  it('uses the vuedraggable item slot API', async () => {
    const source = (await import('@/lib/soraneo-wallet/src/components/WalletAssets.vue?raw')).default as string;

    expect(source).toContain('item-key="address"');
    expect(source).toContain('<template #item');
    expect(source).toContain('v-if="visibleAssetList.length"');
    expect(source).toContain('v-model="visibleAssetList"');
    expect(source).not.toContain('v-if="showAsset(asset)"');
    expect(source).toContain('<div v-else class="wallet-assets__draggable">');
  });

  it('keeps the add asset action on the shared plain secondary button contract', async () => {
    const source = (await import('@/lib/soraneo-wallet/src/components/WalletAssets.vue?raw')).default as string;
    const addAssetStyleBlock = source.match(/&-add\s*\{[^}]*\}/)?.[0] ?? '';

    expect(source).toContain('<s-button');
    expect(source).toContain('class="wallet-assets-add s-typography-button--large"');
    expect(addAssetStyleBlock).toContain('margin-top: 16px;');
    expect(addAssetStyleBlock).not.toContain('background-color');
    expect(addAssetStyleBlock).not.toContain('box-shadow');
    expect(addAssetStyleBlock).not.toContain('color:');
  });

  it('keeps wallet asset action buttons on the shared production alternative action contract', async () => {
    const source = (await import('@/lib/soraneo-wallet/src/components/WalletAssets.vue?raw')).default as string;

    expect(source).not.toContain('&__button.el-button.neumorphic.s-action:not(.s-primary).s-alternative');
    expect(source).toContain('class="wallet-assets__button send"');
    expect(source).toContain('name="finance-send-24"');
    expect(source).toContain('class="wallet-assets__button swap"');
    expect(source).toContain('name="arrows-swap-24"');
    expect(source).toContain('name="arrows-chevron-right-rounded-24"');
  });

  it('keeps wallet header actions on shared production button sizing', async () => {
    const source = (await import('@/lib/soraneo-wallet/src/components/WalletBase.vue?raw')).default as string;
    const actionStyleBlock = source.match(/&_action\s*\{[^}]*\}/)?.[0] ?? '';

    expect(actionStyleBlock).toContain('display: flex;');
    expect(actionStyleBlock).toContain('align-items: flex-start;');
    expect(actionStyleBlock).not.toContain(':deep(.s-button)');
    expect(source).not.toContain('margin-left: 10px;');
    expect(source).not.toContain('height: 42px;');
  });

  it('keeps account asset row labels from inheriting wrapping that changes production spacing', async () => {
    const assetListItem = (await import('@/lib/soraneo-wallet/src/components/AssetListItem.vue?raw')).default as string;
    const tokenAddress = (await import('@/lib/soraneo-wallet/src/components/TokenAddress.vue?raw')).default as string;

    expect(assetListItem).not.toContain('word-break: break-word');
    expect(tokenAddress).not.toContain('word-break: break-word');
  });
});
