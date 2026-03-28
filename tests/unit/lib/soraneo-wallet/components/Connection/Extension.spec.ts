import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/soraneo-wallet/src/composables/useWalletTranslation', () => ({
  useWalletTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import extensionConnectionListSource from '@/lib/soraneo-wallet/src/components/Connection/List/Extension.vue?raw';

describe('ExtensionConnectionList source', () => {
  it('does not throw when a wallet has no provider yet', async () => {
    const { default: ExtensionConnectionList } =
      await import('@/lib/soraneo-wallet/src/components/Connection/List/Extension.vue');
    const state = (ExtensionConnectionList as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    expect(() => state.hasDisconnectAction({ extensionName: 'fearless-wallet' })).not.toThrow();
    expect(state.hasDisconnectAction({ extensionName: 'fearless-wallet' })).toBe(false);
  });

  it('renders the recommended badge with a dedicated star icon class', () => {
    expect(extensionConnectionListSource).toContain(
      '<s-icon name="basic-circle-star-24" size="12" class="extension-label__icon"></s-icon>'
    );
  });

  it('resets the install action wrapper so noir mode does not inherit browser link styling', () => {
    expect(extensionConnectionListSource).toMatch(
      /\.connection-action\s*\{[\s\S]*?display:\s*inline-flex;[\s\S]*?color:\s*inherit;[\s\S]*?text-decoration:\s*none;[\s\S]*?\}/
    );
    expect(extensionConnectionListSource).toMatch(
      /:deep\(\.connection-install\)\s*\{[\s\S]*?display:\s*inline-flex\s*!important;[\s\S]*?align-items:\s*center\s*!important;[\s\S]*?justify-content:\s*center\s*!important;[\s\S]*?\}/
    );
  });

  it('marks right-side wallet state buttons with a dedicated class hook', () => {
    expect(extensionConnectionListSource).toMatch(
      /<s-button[\s\S]*?v-if="hasDisconnectAction\(wallet\)"[\s\S]*?class="connection-state"[\s\S]*?size="small"[\s\S]*?@click\.stop="handleDisconnect\(wallet\)"/
    );
    expect(extensionConnectionListSource).toContain(
      '<s-button v-else-if="isConnectedWallet(wallet)" class="connection-state" size="small" disabled>'
    );
  });

  it('suppresses the legacy font glyph so the inline icon svg is used', () => {
    expect(extensionConnectionListSource).toMatch(
      /\.extension-label__icon\s*\{[\s\S]*?&::before\s*\{[\s\S]*?content:\s*none\s*!important;[\s\S]*?\}/
    );
    expect(extensionConnectionListSource).toMatch(
      /\.extension-label__icon\s*\{[\s\S]*?:deep\(\.s-icon__svg\)\s*\{[\s\S]*?display:\s*block\s*!important;[\s\S]*?\}/
    );
  });
});
