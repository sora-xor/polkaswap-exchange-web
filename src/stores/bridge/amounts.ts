import { FPNumber } from '@sora-substrate/sdk';

import type { CodecString } from '@sora-substrate/sdk';
import type { SwapQuote } from '@sora-substrate/liquidity-proxy/build/types';
import type { Nullable } from '@/types/common';

export type BridgeCounterAmountParams = {
  value?: Nullable<string>;
  externalTransferFee: CodecString;
  externalDecimals?: number;
  isEthDenominatedAsset: boolean;
  isSoraToEvm: boolean;
  denominator: string | number;
};

/**
 * Checks whether a user-entered bridge amount is finite and greater than zero.
 */
export const isPositiveFiniteBridgeAmount = (amount?: Nullable<string>): boolean => {
  const normalized = amount?.trim();

  if (!normalized) return false;

  const value = new FPNumber(normalized);

  return value.isFinity() && value.isGtZero();
};

/**
 * Rejects invalid transaction amounts before they reach wallet signing helpers.
 */
export const assertPositiveBridgeTransactionAmount = (amount: string): void => {
  const value = new FPNumber(amount);

  if (!value.isFinity() || !value.isGtZero()) {
    throw new Error('TX amount must be greater than zero!');
  }
};

/**
 * Converts the USD transfer limit into the selected bridge asset amount.
 */
export const calculateBridgeOutgoingMaxLimit = (
  limitAsset: string,
  referenceAsset: string,
  usdLimit: CodecString,
  quote: SwapQuote
): Nullable<FPNumber> => {
  const outgoingLimitUSD = FPNumber.fromCodecValue(usdLimit);

  if (outgoingLimitUSD.isZero() || limitAsset === referenceAsset) return outgoingLimitUSD;

  try {
    const quoteAmount = FPNumber.ONE;
    const {
      result: { amount },
    } = quote(limitAsset, referenceAsset, quoteAmount.toString(), false, [], false);
    const assetPriceUSD = FPNumber.fromCodecValue(amount);

    if (!assetPriceUSD.isFinity() || assetPriceUSD.isZero()) return null;

    return outgoingLimitUSD.div(assetPriceUSD);
  } catch (error) {
    console.error(error);
    return null;
  }
};

const positiveOrZero = (value: FPNumber): FPNumber => {
  return FPNumber.isGreaterThan(value, FPNumber.ZERO) ? value : FPNumber.ZERO;
};

const resolveExternalTransferFee = (externalTransferFee: CodecString, externalDecimals?: number): FPNumber => {
  return FPNumber.fromCodecValue(externalTransferFee, externalDecimals);
};

const resolveDenominator = (denominator: string | number): FPNumber => {
  return new FPNumber(denominator || 1);
};

/**
 * Calculates the receive field after the user edits the send field.
 */
export const calculateBridgeReceivedAmount = ({
  value,
  externalTransferFee,
  externalDecimals,
  isEthDenominatedAsset,
  isSoraToEvm,
  denominator,
}: BridgeCounterAmountParams): string => {
  if (!value) return '';

  const sent = new FPNumber(value);
  const fee = resolveExternalTransferFee(externalTransferFee, externalDecimals);
  let received = positiveOrZero(sent.sub(fee));

  if (isEthDenominatedAsset) {
    const denomination = resolveDenominator(denominator);
    received = isSoraToEvm ? received.mul(denomination) : received.div(denomination);
  }

  return received.toString();
};

/**
 * Calculates the send field after the user edits the receive field.
 */
export const calculateBridgeSendAmount = ({
  value,
  externalTransferFee,
  externalDecimals,
  isEthDenominatedAsset,
  isSoraToEvm,
  denominator,
}: BridgeCounterAmountParams): string => {
  if (!value) return '';

  const received = new FPNumber(value);
  const fee = resolveExternalTransferFee(externalTransferFee, externalDecimals);
  let sent = positiveOrZero(received.add(fee));

  if (isEthDenominatedAsset) {
    const denomination = resolveDenominator(denominator);
    sent = isSoraToEvm ? sent.div(denomination) : sent.mul(denomination);
  }

  return sent.toString();
};
