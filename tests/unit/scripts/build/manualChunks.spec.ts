import { describe, expect, it } from 'vitest';

import { getManualChunk, normalizeChunkId } from '@/../scripts/build/manualChunks.mjs';

describe('scripts/build/manualChunks', () => {
  it('normalizes Windows-style paths before matching chunk rules', () => {
    expect(normalizeChunkId('C:\\repo\\src\\lib\\substrate\\sdk\\index.ts')).toBe(
      'C:/repo/src/lib/substrate/sdk/index.ts'
    );
  });

  it('assigns aliased substrate sources to the substrate chunk', () => {
    expect(getManualChunk('/Users/test/repo/src/lib/substrate/sdk/index.ts')).toBe('substrate-sdk');
    expect(getManualChunk('/Users/test/repo/vendor/@polkadot/api/index.js')).toBe('substrate-sdk');
  });

  it('assigns wallet runtime sources to the wallet chunk', () => {
    expect(getManualChunk('/Users/test/repo/src/lib/soraneo-wallet/src/index.ts')).toBe('wallet-stack');
    expect(getManualChunk('/Users/test/repo/src/plugins/wallet.ts')).toBe('wallet-stack');
  });

  it('assigns bridge and EVM dependencies to the bridge-related chunks', () => {
    expect(getManualChunk('/Users/test/repo/src/store/bridge/actions.ts')).toBe('bridge');
    expect(getManualChunk('/Users/test/repo/node_modules/ethers/lib.esm/index.js')).toBe('evm-stack');
  });

  it('assigns order book and charting modules to coarse async chunks', () => {
    expect(getManualChunk('/Users/test/repo/src/components/pages/OrderBook/BookWidget.vue')).toBe('order-book');
    expect(getManualChunk('/Users/test/repo/node_modules/echarts/core.js')).toBe('charts');
  });

  it('leaves unrelated application files in the default chunk', () => {
    expect(getManualChunk('/Users/test/repo/src/main.ts')).toBeUndefined();
    expect(getManualChunk('\0vite/preload-helper')).toBeUndefined();
  });
});
