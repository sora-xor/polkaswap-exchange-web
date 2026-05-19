import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('@/lib/soraneo-wallet/src/composables/useWalletTranslation', () => ({
  useWalletTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import extensionConnectionListSource from '@/lib/soraneo-wallet/src/components/Connection/List/Extension.vue?raw';
import ExtensionConnectionList from '@/lib/soraneo-wallet/src/components/Connection/List/Extension.vue';

describe('ExtensionConnectionList source', () => {
  it('does not throw when a wallet has no provider yet', async () => {
    const { default: ExtensionConnectionList } =
      await import('@/lib/soraneo-wallet/src/components/Connection/List/Extension.vue');
    const state = (ExtensionConnectionList as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    expect(() => state.hasDisconnectAction({ extensionName: 'fearless-wallet' })).not.toThrow();
    expect(state.hasDisconnectAction({ extensionName: 'fearless-wallet' })).toBe(false);
  });

  it('renders the recommended badge with the compact star icon', () => {
    const wrapper = mount(ExtensionConnectionList, {
      props: {
        wallets: [
          {
            extensionName: 'fearless-wallet',
            title: 'Fearless Wallet',
            logo: { src: '', alt: 'Fearless Wallet' },
          },
        ],
        recommendedWallets: ['fearless-wallet'],
      },
      global: {
        stubs: {
          AccountCard: {
            template: '<article><slot name="avatar" /><slot name="name" /><slot /></article>',
          },
          ConnectionItems: {
            template: '<section><slot /></section>',
          },
          's-icon': {
            props: ['name', 'size'],
            template: '<i class="s-icon-stub" :data-name="name" :data-size="size"></i>',
          },
        },
      },
    });

    const icon = wrapper.find('.extension-label__icon');

    expect(icon.attributes('data-name')).toBe('star-16');
    expect(icon.attributes('data-size')).toBe('14');
    expect(extensionConnectionListSource).not.toContain('name="basic-circle-star-24"');
  });

  it('styles the recommended badge as a compact aligned pill', () => {
    expect(extensionConnectionListSource).toMatch(
      /&-label\s*\{[\s\S]*?display:\s*inline-flex;[\s\S]*?align-items:\s*center;[\s\S]*?min-height:\s*20px;[\s\S]*?font-weight:\s*600;[\s\S]*?white-space:\s*nowrap;[\s\S]*?\}/
    );
    expect(extensionConnectionListSource).toMatch(
      /\.extension-label__icon\s*\{[\s\S]*?align-items:\s*center;[\s\S]*?justify-content:\s*center;[\s\S]*?width:\s*14px;[\s\S]*?height:\s*14px;[\s\S]*?\}/
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
