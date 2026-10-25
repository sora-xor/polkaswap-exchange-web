import { describe, expect, it } from 'vitest';

import { getManualChunk, normalizeChunkId } from '@/../scripts/build/manualChunks.mjs';

describe('scripts/build/manualChunks', () => {
  it('normalizes Windows-style paths before matching chunk rules', () => {
    expect(normalizeChunkId('C:\\repo\\src\\lib\\substrate\\sdk\\index.ts')).toBe(
      'C:/repo/src/lib/substrate/sdk/index.ts'
    );
  });

  it('assigns Polkadot modules to the vendor chunk', () => {
    expect(getManualChunk('/Users/test/repo/vendor/@polkadot/api/index.js')).toBe('polkadot-vendor');
    expect(getManualChunk('/Users/test/repo/node_modules/@polkadot/api/index.js')).toBe('polkadot-vendor');
  });

  it('assigns EVM libraries to dedicated chunks', () => {
    expect(getManualChunk('/Users/test/repo/node_modules/ethers/lib.esm/index.js')).toBe('ethers');
    expect(getManualChunk('/Users/test/repo/node_modules/@walletconnect/modal/dist/index.js')).toBe('walletconnect');
    expect(getManualChunk('/Users/test/repo/node_modules/@cedelabs/widgets-universal/dist/index.js')).toBe('cede');
  });

  it('assigns GraphQL dependencies to a dedicated chunk', () => {
    expect(getManualChunk('/Users/test/repo/node_modules/@urql/core/dist/index.js')).toBe('graphql');
  });

  it('assigns charting modules to the charts chunk', () => {
    expect(getManualChunk('/Users/test/repo/node_modules/echarts/core.js')).toBe('charts');
  });

  it('leaves unrelated application files in the default chunk', () => {
    expect(getManualChunk('/Users/test/repo/src/main.ts')).toBeUndefined();
    expect(getManualChunk('/Users/test/repo/src/lib/substrate/sdk/index.ts')).toBeUndefined();
    expect(getManualChunk('\0vite/preload-helper')).toBeUndefined();
  });
});
