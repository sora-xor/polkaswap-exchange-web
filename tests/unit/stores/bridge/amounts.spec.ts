import { FPNumber } from '@sora-substrate/sdk';
import { describe, expect, it, vi } from 'vitest';

import {
  assertPositiveBridgeTransactionAmount,
  calculateBridgeReceivedAmount,
  calculateBridgeOutgoingMaxLimit,
  calculateBridgeSendAmount,
  isPositiveFiniteBridgeAmount,
} from '@/stores/bridge/amounts';

import type { SwapQuote } from '@sora-substrate/liquidity-proxy/build/types';

describe('bridge amount helpers', () => {
  it('accepts only finite positive bridge amounts', () => {
    expect(isPositiveFiniteBridgeAmount('1')).toBe(true);
    expect(isPositiveFiniteBridgeAmount(' 0.000001 ')).toBe(true);
    expect(isPositiveFiniteBridgeAmount()).toBe(false);
    expect(isPositiveFiniteBridgeAmount('')).toBe(false);
    expect(isPositiveFiniteBridgeAmount('0')).toBe(false);
    expect(isPositiveFiniteBridgeAmount('-1')).toBe(false);
    expect(isPositiveFiniteBridgeAmount('NaN')).toBe(false);
    expect(isPositiveFiniteBridgeAmount('Infinity')).toBe(false);
  });

  it('throws before signing zero, negative, or non-finite amounts', () => {
    expect(() => assertPositiveBridgeTransactionAmount('0')).toThrow('TX amount must be greater than zero!');
    expect(() => assertPositiveBridgeTransactionAmount('-1')).toThrow('TX amount must be greater than zero!');
    expect(() => assertPositiveBridgeTransactionAmount('Infinity')).toThrow('TX amount must be greater than zero!');
    expect(() => assertPositiveBridgeTransactionAmount('1')).not.toThrow();
  });

  it('converts USD bridge limits into selected asset limits', () => {
    const quote = vi.fn(() => ({
      result: {
        amount: FPNumber.fromNatural(2).toCodecString(),
      },
    })) as unknown as SwapQuote;

    const limit = calculateBridgeOutgoingMaxLimit(
      'asset-address',
      'usd-reference',
      FPNumber.fromNatural(10).toCodecString(),
      quote
    );

    expect(limit?.toString()).toBe('5');
    expect(quote).toHaveBeenCalledWith('asset-address', 'usd-reference', '1', false, [], false);
  });

  it('returns the USD limit unchanged when the selected asset is the reference asset', () => {
    const quote = vi.fn() as unknown as SwapQuote;
    const usdLimit = FPNumber.fromNatural(10).toCodecString();
    const limit = calculateBridgeOutgoingMaxLimit('usd-reference', 'usd-reference', usdLimit, quote);

    expect(limit?.toString()).toBe('10');
    expect(quote).not.toHaveBeenCalled();
  });

  it('returns null when quote data cannot produce a finite asset price', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const throwingQuote = vi.fn(() => {
      throw new Error('quote failed');
    }) as unknown as SwapQuote;
    const zeroQuote = vi.fn(() => ({
      result: {
        amount: '0',
      },
    })) as unknown as SwapQuote;

    expect(
      calculateBridgeOutgoingMaxLimit(
        'asset-address',
        'usd-reference',
        FPNumber.fromNatural(10).toCodecString(),
        zeroQuote
      )
    ).toBeNull();
    expect(
      calculateBridgeOutgoingMaxLimit(
        'asset-address',
        'usd-reference',
        FPNumber.fromNatural(10).toCodecString(),
        throwingQuote
      )
    ).toBeNull();

    consoleError.mockRestore();
  });

  it('calculates receive amounts from send amounts after external transfer fees', () => {
    const fee = FPNumber.fromNatural(1).toCodecString();

    expect(
      calculateBridgeReceivedAmount({
        value: '10',
        externalTransferFee: fee,
        externalDecimals: 18,
        isEthDenominatedAsset: false,
        isSoraToEvm: true,
        denominator: 100,
      })
    ).toBe('9');
    expect(
      calculateBridgeReceivedAmount({
        value: '0.5',
        externalTransferFee: fee,
        externalDecimals: 18,
        isEthDenominatedAsset: false,
        isSoraToEvm: true,
        denominator: 100,
      })
    ).toBe('0');
    expect(
      calculateBridgeReceivedAmount({
        value: '',
        externalTransferFee: fee,
        externalDecimals: 18,
        isEthDenominatedAsset: false,
        isSoraToEvm: true,
        denominator: 100,
      })
    ).toBe('');
  });

  it('calculates send amounts from receive amounts after external transfer fees', () => {
    const fee = FPNumber.fromNatural(1).toCodecString();

    expect(
      calculateBridgeSendAmount({
        value: '9',
        externalTransferFee: fee,
        externalDecimals: 18,
        isEthDenominatedAsset: false,
        isSoraToEvm: true,
        denominator: 100,
      })
    ).toBe('10');
    expect(
      calculateBridgeSendAmount({
        value: '',
        externalTransferFee: fee,
        externalDecimals: 18,
        isEthDenominatedAsset: false,
        isSoraToEvm: true,
        denominator: 100,
      })
    ).toBe('');
  });

  it('applies ETH bridge denomination when deriving counter amounts', () => {
    const fee = FPNumber.fromNatural(1).toCodecString();

    expect(
      calculateBridgeReceivedAmount({
        value: '10',
        externalTransferFee: fee,
        externalDecimals: 18,
        isEthDenominatedAsset: true,
        isSoraToEvm: true,
        denominator: 100,
      })
    ).toBe('900');
    expect(
      calculateBridgeSendAmount({
        value: '900',
        externalTransferFee: fee,
        externalDecimals: 18,
        isEthDenominatedAsset: true,
        isSoraToEvm: true,
        denominator: 100,
      })
    ).toBe('9.01');
    expect(
      calculateBridgeReceivedAmount({
        value: '901',
        externalTransferFee: fee,
        externalDecimals: 18,
        isEthDenominatedAsset: true,
        isSoraToEvm: false,
        denominator: 100,
      })
    ).toBe('9');
    expect(
      calculateBridgeSendAmount({
        value: '9',
        externalTransferFee: fee,
        externalDecimals: 18,
        isEthDenominatedAsset: true,
        isSoraToEvm: false,
        denominator: 100,
      })
    ).toBe('1000');
  });
});
