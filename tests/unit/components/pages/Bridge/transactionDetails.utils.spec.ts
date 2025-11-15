import { describe, expect, it, vi } from 'vitest';

import {
  buildFormattedNetworkFeeLabel,
  isNonZeroCodecString,
  resolveAssetSymbol,
  resolveNativeTokenSymbol,
} from '@/components/pages/Bridge/transactionDetails.utils';

import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock();
});

describe('transactionDetails.utils', () => {
  it('resolves asset symbols safely', () => {
    const asset = { symbol: 'ETH' } as unknown as RegisteredAccountAsset;

    expect(resolveAssetSymbol(asset)).toBe('ETH');
    expect(resolveNativeTokenSymbol(asset)).toBe('ETH');
    expect(resolveAssetSymbol(null)).toBe('');
    expect(resolveNativeTokenSymbol(null)).toBe('');
  });

  it('builds descriptive network fee labels', () => {
    const translate = (key: string) => (key === 'networkFeeText' ? 'Network Fee' : key);

    expect(buildFormattedNetworkFeeLabel('Ethereum', translate)).toBe('Max. Ethereum Network Fee');
  });

  it('detects non-zero codec strings', () => {
    expect(isNonZeroCodecString('0')).toBe(false);
    expect(isNonZeroCodecString('0000000000')).toBe(true);
    expect(isNonZeroCodecString('1')).toBe(true);
  });
});
