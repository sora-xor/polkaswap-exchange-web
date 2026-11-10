import { describe, expect, it } from 'vitest';

import walletAssetDetailsSource from '@/lib/soraneo-wallet/src/components/WalletAssetDetails.vue?raw';

describe('WalletAssetDetails source', () => {
  it('names icon-only asset actions for assistive technology', () => {
    expect(walletAssetDetailsSource).toContain(':aria-label="t(\'asset.remove\')"');
    expect(walletAssetDetailsSource).toContain(':aria-label="getOperationTooltip(operation)"');
    expect(walletAssetDetailsSource).toContain(':aria-label="t(\'code.receive\')"');
  });

  it('exposes the expandable balance breakdown state to assistive technology', () => {
    expect(walletAssetDetailsSource).toContain(':aria-expanded="wasBalanceDetailsClicked"');
    expect(walletAssetDetailsSource).toContain('aria-controls="asset-balance-breakdown"');
    expect(walletAssetDetailsSource).toContain('id="asset-balance-breakdown"');
  });

  it('explains when owned XOR is fully restricted and cannot be sent', () => {
    expect(walletAssetDetailsSource).toContain('v-if="isXorFullyRestricted"');
    expect(walletAssetDetailsSource).toContain('class="asset-details-restriction-note');
    expect(walletAssetDetailsSource).toContain('role="note"');
    expect(walletAssetDetailsSource).toContain("t('assets.balance.xorFullyRestricted'");
  });

  it('keeps restricted balance text readable in Noir, where the warning fill equals the warning colour', () => {
    const restrictedChip = walletAssetDetailsSource.match(/&--restricted\s*\{[^}]*\}/)?.[0] ?? '';
    const restrictionNote = walletAssetDetailsSource.match(/&-restriction-note\s*\{[^}]*/)?.[0] ?? '';

    for (const block of [restrictedChip, restrictionNote]) {
      expect(block).toContain('color: var(--s-color-status-warning-text);');
      expect(block).not.toContain('var(--s-color-status-warning-background)');
    }
  });

  it('uses total ownership for the headline and fiat value without duplicating locked balance', () => {
    expect(walletAssetDetailsSource).toContain(':value="getSafeFiatBalance(BalanceType.Total)"');
    expect(walletAssetDetailsSource).toContain('BalanceType.Total');
    expect(walletAssetDetailsSource).toContain('BalanceType.Free');
  });
});
