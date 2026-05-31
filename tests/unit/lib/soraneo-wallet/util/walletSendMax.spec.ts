import { FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { describe, expect, it } from 'vitest';

import { getWalletSendMaxAmount, isWalletSendMaxAvailable } from '@/lib/soraneo-wallet/src/util/walletSendMax';

describe('wallet send max helpers', () => {
  it('uses the full transferable balance for non-XOR assets', () => {
    const maxAmount = getWalletSendMaxAmount({
      assetAddress: '0xdai',
      balance: '5000000000000000000',
      decimals: 18,
      fee: FPNumber.ZERO,
    });

    expect(maxAmount.toString()).toBe('5');
  });

  it('subtracts the network fee from XOR balances', () => {
    const maxAmount = getWalletSendMaxAmount({
      assetAddress: XOR.address,
      balance: '1000000000000000000',
      decimals: 18,
      fee: FPNumber.fromCodecValue('100000000000000000'),
    });

    expect(maxAmount.toString()).toBe('0.9');
  });

  it('clamps XOR max amount to zero when the fee is greater than the balance', () => {
    const maxAmount = getWalletSendMaxAmount({
      assetAddress: XOR.address,
      balance: '50000000000000000',
      decimals: 18,
      fee: FPNumber.fromCodecValue('100000000000000000'),
    });

    expect(maxAmount.toString()).toBe('0');
  });

  it('hides MAX for hidden balances and zero spendable balances', () => {
    expect(isWalletSendMaxAvailable({ maxAmount: FPNumber.ONE, shouldBalanceBeHidden: true })).toBe(false);
    expect(isWalletSendMaxAvailable({ maxAmount: FPNumber.ZERO, shouldBalanceBeHidden: false })).toBe(false);
    expect(isWalletSendMaxAvailable({ maxAmount: FPNumber.ONE, shouldBalanceBeHidden: false })).toBe(true);
  });
});
