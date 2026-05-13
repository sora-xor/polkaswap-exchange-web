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

  it('keeps the add asset action on the shared medium secondary button contract', async () => {
    const source = (await import('@/lib/soraneo-wallet/src/components/WalletAssets.vue?raw')).default as string;
    const addAssetStyleBlock = source.match(/&-add\s*\{[^}]*\}/)?.[0] ?? '';

    expect(source).toContain('<s-button');
    expect(source).toContain('class="wallet-assets-add s-typography-button--medium"');
    expect(addAssetStyleBlock).toContain('margin-top: 14px;');
    expect(source).toContain(':deep(.s-button__text)');
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

  it('keeps account asset rows on compact wallet-specific scaling', async () => {
    const source = (await import('@/lib/soraneo-wallet/src/components/WalletAssets.vue?raw')).default as string;

    expect(source).toContain('--s-asset-item-height--fiat: 76px;');
    expect(source).toContain('--s-asset-item-height--fiat: 74px;');
    expect(source).toContain('padding: 0 12px 0 34px;');
    expect(source).toContain('padding: 0 10px;');
    expect(source).toContain('&-dashes');
    expect(source).toContain('width: 42px;');
    expect(source).toContain(':fiat-font-size-rate="FontSizeRate.SMALL"');
    expect(source).toContain(':fiat-font-weight-rate="FontWeightRate.SMALL"');
    expect(source).toContain('font-size: var(--s-font-size-small);');
    expect(source).toContain('font-size: var(--s-font-size-extra-small);');
    expect(source).toContain('letter-spacing: 0;');
    expect(source).toContain('text-overflow: ellipsis;');
    expect(source).toContain('white-space: nowrap;');
    expect(source).toContain('.wallet-assets__button.send,');
    expect(source).toContain('.wallet-assets :deep(.pin)');
  });

  it('keeps the asset headline compact when fiat data and filters share the row', async () => {
    const source = (await import('@/lib/soraneo-wallet/src/components/WalletAssetsHeadline.vue?raw')).default as string;

    expect(source).toContain('align-items: flex-start;');
    expect(source).toContain('gap: 8px 12px;');
    expect(source).toContain('min-height: 32px;');
    expect(source).toContain('display: none;');
    expect(source).toContain('font-size: var(--s-font-size-extra-small);');
    expect(source).toContain('.formatted-amount--shifted');
    expect(source).toContain(':deep(.formatted-amount__value)');
    expect(source).toContain('min-height: 30px;');
    expect(source).toContain('padding: 4px 8px;');
    expect(source).toContain('flex: 1 0 100%;');
    expect(source).toContain('margin-left: auto;');
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
