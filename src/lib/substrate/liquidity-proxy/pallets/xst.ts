import { FPNumber } from '@sora-substrate/math';

import { LiquiditySourceTypes, Consts, Errors, PriceVariant, SwapVariant } from '../consts';
import { safeDivide, isAssetAddress, safeQuoteResult, toFp } from '../utils';
import { getAveragePrice } from './priceTools';
import { oracleProxyQuoteUnchecked } from './oracleProxy';
import { SwapChunk, DiscreteQuotation, SideAmount } from '../common/primitives';

import type { QuotePayload, QuoteResult } from '../types';

// can_exchange
export const canExchange = (
  baseAssetId: string,
  syntheticBaseAssetId: string,
  inputAssetId: string,
  outputAssetId: string,
  payload: QuotePayload
): boolean => {
  if (!isAssetAddress(baseAssetId, Consts.XOR)) return false;

  if (isAssetAddress(inputAssetId, syntheticBaseAssetId)) {
    return outputAssetId in payload.enabledAssets.xst;
  } else if (isAssetAddress(outputAssetId, syntheticBaseAssetId)) {
    return inputAssetId in payload.enabledAssets.xst;
  } else {
    return false;
  }
};

export const stepQuote = (
  baseAssetId: string,
  syntheticBaseAssetId: string,
  inputAsset: string,
  outputAsset: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload,
  deduceFee: boolean,
  recommendedSamplesCount: number
): DiscreteQuotation => {
  if (!canExchange(baseAssetId, syntheticBaseAssetId, inputAsset, outputAsset, payload)) {
    throw new Error(Errors.CantExchange);
  }

  const quotation = new DiscreteQuotation();

  if (amount.isZero()) {
    return quotation;
  }

  const samplesCount = recommendedSamplesCount < 1 ? 1 : recommendedSamplesCount;

  // Get max amount for the limit
  const limit = toFp(payload.consts.xst.syntheticBaseBuySellLimit);

  if (limit.isZero()) return quotation;

  quotation.limits.maxAmount = isAssetAddress(inputAsset, syntheticBaseAssetId)
    ? new SideAmount(limit, SwapVariant.WithDesiredInput)
    : new SideAmount(limit, SwapVariant.WithDesiredOutput);

  // Get the price without checking the limit, because even if it exceeds the limit it will be rounded below.
  // It is necessary to use as much liquidity from the source as we can.
  const { amount: resultAmount, fee: feeAmount } = isAssetAddress(inputAsset, syntheticBaseAssetId)
    ? decideSellAmounts(baseAssetId, syntheticBaseAssetId, outputAsset, amount, isDesiredInput, payload, deduceFee)
    : decideBuyAmounts(baseAssetId, syntheticBaseAssetId, inputAsset, amount, isDesiredInput, payload, deduceFee);

  const [inputAmount, outputAmount] = isDesiredInput ? [amount, resultAmount] : [resultAmount, amount];

  let monolith = new SwapChunk(inputAmount, outputAmount, feeAmount);

  // If amount exceeds the limit, it is necessary to round the amount to the limit.
  if (isAssetAddress(inputAsset, syntheticBaseAssetId)) {
    if (FPNumber.isGreaterThan(inputAmount, limit)) {
      monolith = monolith.rescaleByInput(limit);
    }
  } else {
    if (FPNumber.isGreaterThan(outputAmount, limit)) {
      monolith = monolith.rescaleByOutput(limit);
    }
  }

  const ratio = safeDivide(FPNumber.ONE, new FPNumber(samplesCount));
  const chunk = monolith.rescaleByRatio(ratio);

  quotation.chunks = new Array(samplesCount - 1).fill(chunk);

  // add remaining values as the last chunk to not loss the liquidity on the rounding
  quotation.chunks.push(
    new SwapChunk(
      monolith.input.sub(chunk.input.mul(FPNumber.fromNatural(samplesCount - 1))),
      monolith.output.sub(chunk.output.mul(FPNumber.fromNatural(samplesCount - 1))),
      monolith.fee.sub(chunk.fee.mul(FPNumber.fromNatural(samplesCount - 1)))
    )
  );

  return quotation;
};

const ensureBaseAssetAmountWithinLimit = (amount: FPNumber, payload: QuotePayload, checkLimits = true) => {
  if (!checkLimits) return;

  const limit = toFp(payload.consts.xst.syntheticBaseBuySellLimit);

  if (FPNumber.isGreaterThan(amount, limit)) {
    throw new Error(Errors.SyntheticBaseBuySellLimitExceeded);
  }
};

const getAggregatedFee = (syntheticAssetId: string, payload: QuotePayload): FPNumber => {
  const asset = payload.enabledAssets.xst[syntheticAssetId];

  if (!asset) throw new Error(Errors.SyntheticDoesNotExist);

  const { feeRatio, referenceSymbol } = asset;
  const rate = oracleProxyQuoteUnchecked(referenceSymbol, payload);
  const dynamicFeeRatio = toFp(rate?.dynamicFee ?? '0');
  const resultingFeeRatio = feeRatio.add(dynamicFeeRatio);

  if (!FPNumber.isLessThan(resultingFeeRatio, FPNumber.ONE)) throw new Error(Errors.InvalidFeeRatio);

  return resultingFeeRatio;
};

// Used for converting XST fee to XOR
const convertFee = (
  baseAssetId: string,
  syntheticBaseAssetId: string,
  feeAmount: FPNumber,
  payload: QuotePayload
): FPNumber => {
  const outputToBase = getAveragePrice(
    syntheticBaseAssetId,
    baseAssetId,
    // Since `Buy` is more expensive in case if we are buying XOR
    // (x XST -> y XOR; y XOR -> x' XST, x' < x),
    // it seems logical to show this amount in order
    // to not accidentally lie about the price.
    PriceVariant.Buy,
    payload
  );
  const fee = feeAmount.mul(outputToBase);

  return fee;
};

const referencePrice = (
  syntheticBaseAssetId: string,
  assetAddress: string,
  priceVariant: PriceVariant,
  payload: QuotePayload
): FPNumber => {
  const referenceAssetId = payload.consts.xst.referenceAsset;

  // XSTUSD is a special case because it is equal to the reference asset, DAI
  if ([referenceAssetId, Consts.XSTUSD].includes(assetAddress)) {
    return FPNumber.ONE;
  } else if (isAssetAddress(assetAddress, syntheticBaseAssetId)) {
    const averagePrice = getAveragePrice(assetAddress, referenceAssetId, priceVariant, payload);
    const floorPrice = toFp(payload.consts.xst.floorPrice);

    return averagePrice.max(floorPrice);
  } else {
    const symbol = payload.enabledAssets.xst[assetAddress].referenceSymbol;
    const rate = oracleProxyQuoteUnchecked(symbol, payload);
    const price = toFp(rate.value);

    return price;
  }
};

/**
 * Buys the main asset (e.g., XST).
 * Calculates and returns the current buy price, assuming that input is the synthetic asset and output is the main asset.
 */
const buyPrice = (
  syntheticBaseAssetId: string,
  syntheticAsset: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload
): FPNumber => {
  const mainAssetPrice = referencePrice(syntheticBaseAssetId, syntheticBaseAssetId, PriceVariant.Buy, payload);
  const syntheticAssetPrice = referencePrice(syntheticBaseAssetId, syntheticAsset, PriceVariant.Sell, payload);

  if (isDesiredInput) {
    // Input target amount of synthetic asset (e.g. XSTUSD) to get some synthetic base asset (e.g. XST)
    return safeDivide(amount.mul(syntheticAssetPrice), mainAssetPrice);
  } else {
    // Input some synthetic asset (e.g. XSTUSD) to get a target amount of synthetic base asset (e.g. XST)
    return safeDivide(amount.mul(mainAssetPrice), syntheticAssetPrice);
  }
};

const sellPrice = (
  syntheticBaseAssetId: string,
  syntheticAsset: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload
): FPNumber => {
  const mainAssetPrice = referencePrice(syntheticBaseAssetId, syntheticBaseAssetId, PriceVariant.Sell, payload);
  const syntheticAssetPrice = referencePrice(syntheticBaseAssetId, syntheticAsset, PriceVariant.Buy, payload);

  if (isDesiredInput) {
    // Sell desired amount of synthetic base asset (e.g. XST) for some synthetic asset (e.g. XSTUSD)
    return safeDivide(amount.mul(mainAssetPrice), syntheticAssetPrice);
  } else {
    // Sell some amount of synthetic base asset (e.g. XST) for desired amount of synthetic asset (e.g. XSTUSD)
    return safeDivide(amount.mul(syntheticAssetPrice), mainAssetPrice);
  }
};

// decide_buy_amounts
const decideBuyAmounts = (
  baseAssetId: string,
  syntheticBaseAssetId: string,
  syntheticAsset: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload,
  deduceFee: boolean,
  checkLimits = true // check on XST buy-sell limit (no need for price impact)
): QuoteResult => {
  if (!FPNumber.isGreaterThan(amount, FPNumber.ZERO)) throw new Error(Errors.PriceCalculationFailed);

  const feeRatio = deduceFee ? getAggregatedFee(syntheticAsset, payload) : FPNumber.ZERO;

  if (isDesiredInput) {
    const outputAmount = buyPrice(syntheticBaseAssetId, syntheticAsset, amount, isDesiredInput, payload);
    const feeAmount = feeRatio.mul(outputAmount);
    const output = outputAmount.sub(feeAmount);
    ensureBaseAssetAmountWithinLimit(output, payload, checkLimits);
    const fee = convertFee(baseAssetId, syntheticBaseAssetId, feeAmount, payload); // in XOR

    return {
      amount: output,
      fee,
      rewards: [],
      distribution: [
        {
          input: syntheticAsset,
          output: syntheticBaseAssetId,
          market: LiquiditySourceTypes.XSTPool,
          income: amount,
          outcome: output,
          fee,
        },
      ],
    };
  } else {
    ensureBaseAssetAmountWithinLimit(amount, payload, checkLimits);
    const amountWithFee = safeDivide(amount, FPNumber.ONE.sub(feeRatio));
    const feeAmount = amountWithFee.sub(amount);
    const input = buyPrice(syntheticBaseAssetId, syntheticAsset, amountWithFee, isDesiredInput, payload);
    const fee = convertFee(baseAssetId, syntheticBaseAssetId, feeAmount, payload); // in XOR

    return {
      amount: input,
      fee,
      rewards: [],
      distribution: [
        {
          input: syntheticAsset,
          output: syntheticBaseAssetId,
          market: LiquiditySourceTypes.XSTPool,
          income: input,
          outcome: amount,
          fee,
        },
      ],
    };
  }
};
// decide_sell_amounts
const decideSellAmounts = (
  baseAssetId: string,
  syntheticBaseAssetId: string,
  syntheticAsset: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload,
  deduceFee: boolean,
  checkLimits = true // check on XST buy-sell limit (no need for price impact)
): QuoteResult => {
  if (!FPNumber.isGreaterThan(amount, FPNumber.ZERO)) throw new Error(Errors.PriceCalculationFailed);

  const feeRatio = deduceFee ? getAggregatedFee(syntheticAsset, payload) : FPNumber.ZERO;

  if (isDesiredInput) {
    ensureBaseAssetAmountWithinLimit(amount, payload, checkLimits);
    const feeAmount = amount.mul(feeRatio);
    const output = sellPrice(syntheticBaseAssetId, syntheticAsset, amount.sub(feeAmount), isDesiredInput, payload);
    const fee = convertFee(baseAssetId, syntheticBaseAssetId, feeAmount, payload); // in XOR

    return {
      amount: output,
      fee,
      rewards: [],
      distribution: [
        {
          input: syntheticBaseAssetId,
          output: syntheticAsset,
          market: LiquiditySourceTypes.XSTPool,
          income: amount,
          outcome: output,
          fee,
        },
      ],
    };
  } else {
    const inputAmount = sellPrice(syntheticBaseAssetId, syntheticAsset, amount, isDesiredInput, payload);
    const inputAmountWithFee = safeDivide(inputAmount, FPNumber.ONE.sub(feeRatio));
    ensureBaseAssetAmountWithinLimit(inputAmountWithFee, payload, checkLimits);
    const feeAmount = inputAmountWithFee.sub(inputAmount);
    const fee = convertFee(baseAssetId, syntheticBaseAssetId, feeAmount, payload); // in XOR

    return {
      amount: inputAmountWithFee,
      fee,
      rewards: [],
      distribution: [
        {
          input: syntheticBaseAssetId,
          output: syntheticAsset,
          market: LiquiditySourceTypes.XSTPool,
          income: inputAmountWithFee,
          outcome: amount,
          fee,
        },
      ],
    };
  }
};

export const buyPriceNoVolume = (syntheticAsset: string, payload: QuotePayload): FPNumber => {
  const basePriceWrtRef = referencePrice(Consts.XST, Consts.XST, PriceVariant.Buy, payload);
  const syntheticPricePerReferenceUnit = referencePrice(Consts.XST, syntheticAsset, PriceVariant.Sell, payload);

  return safeDivide(basePriceWrtRef, syntheticPricePerReferenceUnit);
};

export const sellPriceNoVolume = (syntheticAsset: string, payload: QuotePayload): FPNumber => {
  const basePriceWrtRef = referencePrice(Consts.XST, Consts.XST, PriceVariant.Sell, payload);
  const syntheticPricePerReferenceUnit = referencePrice(Consts.XST, syntheticAsset, PriceVariant.Buy, payload);

  return safeDivide(basePriceWrtRef, syntheticPricePerReferenceUnit);
};

export const quoteWithoutImpact = (
  baseAssetId: string,
  syntheticBaseAssetId: string,
  inputAsset: string,
  outputAsset: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload,
  deduceFee: boolean
): FPNumber => {
  try {
    // no impact already
    const quoteResult = quote(
      baseAssetId,
      syntheticBaseAssetId,
      inputAsset,
      outputAsset,
      amount,
      isDesiredInput,
      payload,
      deduceFee,
      false
    );

    return quoteResult.amount;
  } catch (error) {
    return FPNumber.ZERO;
  }
};

export const quote = (
  baseAssetId: string,
  syntheticBaseAssetId: string,
  inputAsset: string,
  outputAsset: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload,
  deduceFee: boolean,
  checkLimits = true // check on XST buy-sell limit (no need for price impact)
): QuoteResult => {
  try {
    if (!canExchange(baseAssetId, syntheticBaseAssetId, inputAsset, outputAsset, payload)) {
      throw new Error(Errors.CantExchange);
    }

    return isAssetAddress(inputAsset, syntheticBaseAssetId)
      ? decideSellAmounts(
          baseAssetId,
          syntheticBaseAssetId,
          outputAsset,
          amount,
          isDesiredInput,
          payload,
          deduceFee,
          checkLimits
        )
      : decideBuyAmounts(
          baseAssetId,
          syntheticBaseAssetId,
          inputAsset,
          amount,
          isDesiredInput,
          payload,
          deduceFee,
          checkLimits
        );
  } catch (error) {
    return safeQuoteResult(inputAsset, outputAsset, amount, LiquiditySourceTypes.XSTPool);
  }
};

export const checkRewards = (
  _baseAssetId: string,
  _syntheticBaseAssetId: string,
  _inputAsset: string,
  _outputAsset: string,
  _inputAmount: FPNumber,
  _outputAmount: FPNumber,
  _payload: QuotePayload
) => {
  // XST Pool has no rewards currently
  return [];
};
