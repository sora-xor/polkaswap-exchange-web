// @vitest-environment node
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../../..');
const walletStoreFile = path.join(repoRoot, 'src', 'stores', 'wallet', 'index.ts');
const walletCompatFile = path.join(repoRoot, 'src', 'stores', 'wallet', 'compat.ts');

describe('wallet Pinia store migration', () => {
  it('keeps the Pinia wallet store off direct legacy state and getter access', async () => {
    const source = await readFile(walletStoreFile, 'utf8');

    expect(source).not.toContain("from './runtime'");
    expect(source).not.toContain("from '@/lib/soraneo-wallet/src/store/instance'");
    expect(source).not.toContain("from '@/lib/soraneo-wallet/src/store/");
    expect(source).not.toContain('store.state.wallet');
    expect(source).not.toContain("store.getters['wallet/");
    expect(source).not.toContain('accessWalletStore(');
    expect(source).not.toContain('readWalletRuntimeSnapshot');
    expect(source).not.toContain('subscribeToWalletRuntime');
    expect(source).not.toContain('commitWalletRuntime');
  });

  it('keeps migrated wallet mutations local-first instead of directly syncing through commit helpers', async () => {
    const source = await readFile(walletStoreFile, 'utf8');

    expect(source).not.toContain("commitWalletRuntime('wallet/settings/toggleHideBalance'");
    expect(source).not.toContain("commitWalletRuntime('wallet/settings/setAllowFeePopup'");
    expect(source).not.toContain("commitWalletRuntime('wallet/transactions/addActiveTx'");
    expect(source).not.toContain("commitWalletRuntime('wallet/account/setPinnedAsset'");
    expect(source).not.toContain('syncAfterCommit(');
    expect(source).not.toContain('mirrorWalletCommit(');
  });

  it('keeps migrated wallet actions off direct runtime dispatches where Pinia now owns the flow', async () => {
    const source = await readFile(walletStoreFile, 'utf8');

    expect(source).not.toContain('dispatchWalletRuntime');
    expect(source).not.toContain("dispatchWalletRuntime('wallet/account/renameAccount'");
    expect(source).not.toContain("dispatchWalletRuntime('wallet/account/addAsset'");
    expect(source).not.toContain("dispatchWalletRuntime('wallet/account/notifyOnDeposit'");
    expect(source).not.toContain("dispatchWalletRuntime('wallet/account/loginAccount'");
    expect(source).not.toContain("dispatchWalletRuntime('wallet/account/logout'");
    expect(source).not.toContain("dispatchWalletRuntime('wallet/account/afterLogin'");
    expect(source).not.toContain("dispatchWalletRuntime('wallet/account/resetAccountPassphrase'");
    expect(source).not.toContain("dispatchWalletRuntime('wallet/account/checkConnectedAccountSource'");
    expect(source).not.toContain("dispatchWalletRuntime('wallet/settings/setApiKeys'");
    expect(source).not.toContain("dispatchWalletRuntime('wallet/settings/subscribeOnExchangeRatesApi'");
    expect(source).not.toContain("dispatchWalletRuntime('wallet/settings/setTheme'");
    expect(source).not.toContain("dispatchWalletRuntime('wallet/settings/selectIndexer'");
    expect(source).not.toContain("dispatchWalletRuntime('wallet/subscriptions/resetNetworkSubscriptions'");
    expect(source).not.toContain("dispatchWalletRuntime('wallet/subscriptions/resetInternalSubscriptions'");
    expect(source).not.toContain("dispatchWalletRuntime('wallet/subscriptions/activateNetwokSubscriptions'");
    expect(source).not.toContain("dispatchWalletRuntime('wallet/transactions/trackPendingMstTxs'");
  });

  it('removes the dead wallet compat adapter file from src/', async () => {
    await expect(stat(walletCompatFile)).rejects.toBeDefined();
  });
});
