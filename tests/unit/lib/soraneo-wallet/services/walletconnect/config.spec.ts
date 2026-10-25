import { beforeEach, describe, expect, it } from 'vitest';

import {
  getWalletConnectProjectId,
  setWalletConnectProjectId,
} from '@/lib/soraneo-wallet/src/services/walletconnect/config';

describe('walletconnect config', () => {
  beforeEach(() => {
    setWalletConnectProjectId('');
  });

  it('stores the configured WalletConnect project id without loading the provider runtime', () => {
    expect(getWalletConnectProjectId()).toBe('');

    setWalletConnectProjectId('project-id');

    expect(getWalletConnectProjectId()).toBe('project-id');
  });
});
