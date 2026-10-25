// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../../..');
const bridgeStoreFile = path.join(repoRoot, 'src', 'stores', 'bridge', 'index.ts');

describe('bridge store migration', () => {
  it('keeps wallet-linked bridge hooks on the Pinia wallet facade', async () => {
    const source = await readFile(bridgeStoreFile, 'utf8');

    expect(source).toContain('useWalletStore().apiKeys');
    expect(source).toContain('useMoonpayStore().setAccountRecord');
    expect(source).toContain('getPassword: walletStore.getPassword');
    expect(source).toContain('isSignTxDialogDisabled: walletStore.isSignTxDialogDisabled');
    expect(source).not.toContain('rootState?.wallet');
    expect(source).not.toContain('rootState?.moonpay');
    expect(source).not.toContain('getRootStore()');
    expect(source).not.toContain('beforeTransactionSign(runtimeStore');
  });
});
