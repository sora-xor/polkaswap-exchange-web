import { FPNumber } from '@sora-substrate/math';
import { describe, expect, it, vi } from 'vitest';

import { SoraParachainApi } from '@/lib/substrate/sdk/bridgeProxy/sub/parachain';

const option = <T>(value: T | null) => ({
  isSome: value !== null,
  unwrap: () => value,
});

describe('SoraParachainApi', () => {
  it('reads parachain and relay-chain block numbers from chain queries', async () => {
    const atQuery = vi.fn(async () => ({ toNumber: () => 999 }));
    const api = {
      query: {
        parachainInfo: {
          parachainId: vi.fn(async () => ({ toNumber: () => 2024 })),
        },
      },
      at: vi.fn(async () => ({
        query: {
          parachainSystem: {
            lastRelayChainBlockNumber: atQuery,
          },
        },
      })),
    } as any;
    const parachain = new SoraParachainApi();

    await expect(parachain.getParachainId(api)).resolves.toBe(2024);
    await expect(parachain.getRelayChainBlockNumber('0xblock', api)).resolves.toBe(999);

    expect(api.query.parachainInfo.parachainId).toHaveBeenCalledTimes(1);
    expect(api.at).toHaveBeenCalledWith('0xblock');
  });

  it('returns asset multilocation options and minimum transfer amounts', async () => {
    const multilocation = { parents: 1, interior: 'Here' };
    const api = {
      query: {
        xcmApp: {
          assetIdToMultilocation: vi.fn(async (assetId: string) =>
            assetId === 'known' ? option(multilocation) : option(null)
          ),
          assetMinimumAmount: vi.fn(async () => option({ toString: () => '12345' })),
        },
      },
    } as any;
    const parachain = new SoraParachainApi();

    await expect(parachain.getAssetMulilocation('known', api)).resolves.toBe(multilocation);
    await expect(parachain.getAssetMulilocation('missing', api)).resolves.toBeNull();
    await expect(parachain.getAssetMinimumAmount('missing', api)).resolves.toBe('0');
    await expect(parachain.getAssetMinimumAmount('known', api)).resolves.toBe('12345');

    expect(api.query.xcmApp.assetMinimumAmount).toHaveBeenCalledWith(multilocation);
  });

  it('returns zero when minimum transfer amount is not configured', async () => {
    const multilocation = { parents: 0 };
    const api = {
      query: {
        xcmApp: {
          assetIdToMultilocation: vi.fn(async () => option(multilocation)),
          assetMinimumAmount: vi.fn(async () => option(null)),
        },
      },
    } as any;

    await expect(new SoraParachainApi().getAssetMinimumAmount('asset', api)).resolves.toBe('0');
  });

  it('builds the mainnet transfer extrinsic with codec-denominated amount', () => {
    const account = { id: 'recipient' };
    const sendXorToMainnet = vi.fn(() => ({ tx: 'send' }));
    const api = {
      createType: vi.fn(() => account),
      tx: {
        xcmApp: {
          sendXorToMainnet,
        },
      },
    } as any;
    const asset = { decimals: 2 } as any;
    const amount = '1.23';
    const expectedCodecAmount = new FPNumber(amount, asset.decimals).toCodecString();

    expect(new SoraParachainApi().getTransferExtrinsic(asset, '5recipient', amount, api)).toEqual({ tx: 'send' });
    expect(api.createType).toHaveBeenCalledWith('AccountId32', '5recipient');
    expect(sendXorToMainnet).toHaveBeenCalledWith(account, expectedCodecAmount);
  });
});
