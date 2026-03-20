import { describe, expect, it } from 'vitest';

import extensionConnectionListSource from '@/lib/soraneo-wallet/src/components/Connection/List/Extension.vue?raw';

describe('ExtensionConnectionList source', () => {
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
    expect(extensionConnectionListSource).toContain(
      'class="connection-state" size="small" @click.stop="handleDisconnect(wallet)"'
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
