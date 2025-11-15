import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CodecString } from '@sora-substrate/sdk';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

const assetStub = {
  address: 'asset',
  symbol: 'AST',
  decimals: 12,
  externalDecimals: 18,
} as unknown as RegisteredAccountAsset;

const nativeStub = {
  address: 'native',
  symbol: 'NAT',
  decimals: 12,
  externalDecimals: 18,
} as unknown as RegisteredAccountAsset;

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    formatStringValue: (value: CodecString) => `formatted:${value}`,
    getFiatAmountByString: (value: CodecString) => `fiat:${value}`,
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    TranslationConsts: { Max: 'Max' },
  }),
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      InfoLine: {
        name: 'InfoLine',
        props: ['label', 'labelTooltip', 'value'],
        template: '<div><slot /></div>',
      },
    },
  });
});

vi.mock('@/router', () => ({
  lazyComponent: () => ({
    name: 'TransactionDetails',
    template: '<div><slot /></div>',
  }),
}));

let TransactionDetails: typeof import('@/components/pages/Bridge/TransactionDetails.vue').default;

describe('BridgeTransactionDetails', () => {
  beforeEach(async () => {
    ({ default: TransactionDetails } = await import('@/components/pages/Bridge/TransactionDetails.vue'));
  });

  it('formats labels and exposes asset metadata', () => {
    const wrapper = mount(TransactionDetails, {
      props: {
        asset: assetStub,
        nativeToken: nativeStub,
        externalNetworkFee: '1',
        soraNetworkFee: '2',
        externalTransferFee: '3',
        externalMinBalance: '4',
        networkName: 'Ethereum',
      },
    });

    expect(wrapper.vm.assetSymbol).toBe('AST');
    expect(wrapper.vm.nativeTokenSymbol).toBe('NAT');
    expect(wrapper.vm.formattedNetworkFeeLabel).toBe('Max Ethereum networkFeeText');
    expect(wrapper.vm.isNotZero('0')).toBe(false);
    expect(wrapper.vm.isNotZero('123')).toBe(true);
  });
});
