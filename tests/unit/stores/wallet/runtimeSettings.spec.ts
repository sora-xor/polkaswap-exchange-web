import { describe, expect, it } from 'vitest';

import {
  mergeWalletApiKeys,
  resolveGoogleDriveOptions,
  resolveNftStorageOptions,
  resolveWalletConnectProjectId,
} from '@/stores/wallet/runtimeSettings';

describe('wallet runtime settings helpers', () => {
  it('merges runtime API keys without mutating existing settings', () => {
    const current = Object.freeze({
      moonpay: 'old-moonpay',
      nftStorage: 'nft-token',
    });

    expect(mergeWalletApiKeys(current, { moonpay: 'new-moonpay', walletconnect: 'wc-id' })).toEqual({
      moonpay: 'new-moonpay',
      nftStorage: 'nft-token',
      walletconnect: 'wc-id',
    });
    expect(current).toEqual({
      moonpay: 'old-moonpay',
      nftStorage: 'nft-token',
    });
  });

  it('resolves Google Drive and WalletConnect settings only when keys are complete', () => {
    expect(resolveGoogleDriveOptions({ googleApi: 'api' })).toBeNull();
    expect(resolveGoogleDriveOptions({ googleApi: 'api', googleClientId: 'client' })).toEqual({
      googleApi: 'api',
      googleClientId: 'client',
    });
    expect(resolveWalletConnectProjectId({})).toBeNull();
    expect(resolveWalletConnectProjectId({ walletconnect: 'project-id' })).toBe('project-id');
  });

  it('prefers marketplace UCAN credentials for NFT storage and falls back to API keys', () => {
    expect(
      resolveNftStorageOptions(
        { nftStorage: 'fallback-token' },
        {
          marketplaceDid: 'did:market',
          ucan: 'ucan-token',
        }
      )
    ).toEqual({
      token: 'ucan-token',
      did: 'did:market',
    });
    expect(resolveNftStorageOptions({ nftStorage: 'fallback-token' }, { marketplaceDid: 'did:market' })).toEqual({
      token: 'fallback-token',
    });
  });
});
