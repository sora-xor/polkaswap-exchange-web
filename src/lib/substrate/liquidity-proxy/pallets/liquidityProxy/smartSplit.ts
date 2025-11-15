import { FPNumber } from '@sora-substrate/math';
import { LiquiditySourceTypes, Consts, Errors, SwapVariant } from '../../consts';
import { LiquidityAggregator } from './liquidityAggregator/liquidityAggregator';
import { LiquidityRegistry } from './liquidityRegistry';
import { quote as xykQuote, getActualReserves } from '../poolXyk';
import {
  quote as tbcQuote,
  sellPriceNoVolume as tbcSellPriceNoVolume,
  buyPriceNoVolume as tbcBuyPriceNoVolume,
} from '../multicollateralBoundingCurvePool';
import {
  quote as xstQuote,
  sellPriceNoVolume as xstSellPriceNoVolume,
  buyPriceNoVolume as xstBuyPriceNoVolume,
} from '../xst';

import { isAssetAddress, isBetter, extremum, safeDivide } from '../../utils';

import type { QuotePayload, QuoteResult, Distribution, LPRewardsInfo } from '../../types';

// AGGREGATOR
const quotePrimaryMarket = (
  baseAssetId: string,
  syntheticBaseAssetId: string,
  inputAssetAddress: string,
  outputAssetAddress: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload,
  deduceFee: boolean
): QuoteResult => {
  if ([inputAssetAddress, outputAssetAddress].includes(Consts.XSTUSD)) {
    return xstQuote(
      baseAssetId,
      syntheticBaseAssetId,
      inputAssetAddress,
      outputAssetAddress,
      amount,
      isDesiredInput,
      payload,
      deduceFee
    );
  } else {
    return tbcQuote(
      baseAssetId,
      syntheticBaseAssetId,
      inputAssetAddress,
      outputAssetAddress,
      amount,
      isDesiredInput,
      payload,
      deduceFee
    );
  }
};

/**
 * Determines the share of a swap that should be exchanged in the primary market
 * (i.e. the multi-collateral bonding curve pool) based on the current reserves of
 * the base asset and the collateral asset in the secondary market (e.g. an XYK pool)
 * provided the base asset is being sold.
 */
// prettier-ignore
const primaryMarketAmountSellingBaseAsset = (
  mainAssetId: string,
  collateralAsset: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  xorReserve: FPNumber,
  otherReserve: FPNumber,
  payload: QuotePayload
): FPNumber => { // NOSONAR
  try {
    const secondaryPrice = xorReserve.isGtZero() ? safeDivide(otherReserve, xorReserve) : FPNumber.ZERO;

    const primarySellPrice = isAssetAddress(collateralAsset, Consts.XSTUSD)
      ? xstSellPriceNoVolume(collateralAsset, payload)
      : tbcSellPriceNoVolume(mainAssetId, collateralAsset, payload);

    const k = xorReserve.mul(otherReserve);

    if (isDesiredInput) {
      if (FPNumber.isGreaterThan(secondaryPrice, primarySellPrice)) {
        const amountSecondary = safeDivide(k, primarySellPrice).sqrt().sub(xorReserve);

        if (FPNumber.isGreaterThan(amountSecondary, amount)) {
          return FPNumber.ZERO;
        } else if (amountSecondary.isLteZero()) {
          return amount;
        } else {
          return amount.sub(amountSecondary);
        }
      } else {
        return amount;
      }
    } else {
      // prettier-ignore
      if (FPNumber.isGreaterThan(secondaryPrice, primarySellPrice)) { // NOSONAR
        const amountSecondary = otherReserve.sub(k.mul(primarySellPrice).sqrt());

        if (FPNumber.isGreaterThanOrEqualTo(amountSecondary, amount)) {
          return FPNumber.ZERO;
        } else if (amountSecondary.isLteZero()) {
          return amount;
        } else {
          return amount.sub(amountSecondary);
        }
      } else {
        return amount;
      }
    }
  } catch (error) {
    return FPNumber.ZERO;
  }
};

/**
 * Determines the share of a swap that should be exchanged in the primary market
 * (i.e., the multi-collateral bonding curve pool) based on the current reserves of
 * the base asset and the collateral asset in the secondary market (e.g., an XYK pool)
 * provided the base asset is being bought.
 */
// prettier-ignore
const primaryMarketAmountBuyingBaseAsset = (
  mainAssetId: string,
  collateralAsset: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  baseReserve: FPNumber,
  otherReserve: FPNumber,
  payload: QuotePayload
): FPNumber => { // NOSONAR
  try {
    const secondaryPrice = baseReserve.isGtZero() ? safeDivide(otherReserve, baseReserve) : Consts.MAX;

    const primaryBuyPrice = isAssetAddress(collateralAsset, Consts.XSTUSD)
      ? xstBuyPriceNoVolume(collateralAsset, payload)
      : tbcBuyPriceNoVolume(mainAssetId, collateralAsset, payload);

    const k = baseReserve.mul(otherReserve);

    if (isDesiredInput) {
      if (FPNumber.isLessThan(secondaryPrice, primaryBuyPrice)) {
        const amountSecondary = k.mul(primaryBuyPrice).sqrt().sub(otherReserve);

        if (FPNumber.isGreaterThanOrEqualTo(amountSecondary, amount)) {
          return FPNumber.ZERO;
        } else if (amountSecondary.isLteZero()) {
          return amount;
        } else {
          return amount.sub(amountSecondary);
        }
      } else {
        return amount;
      }
    } else {
      // prettier-ignore
      if (FPNumber.isLessThan(secondaryPrice, primaryBuyPrice)) { // NOSONAR
        const amountSecondary = baseReserve.sub(safeDivide(k, primaryBuyPrice).sqrt());

        if (FPNumber.isGreaterThanOrEqualTo(amountSecondary, amount)) {
          return FPNumber.ZERO;
        } else if (amountSecondary.isLteZero()) {
          return amount;
        } else {
          return amount.sub(amountSecondary);
        }
      } else {
        return amount;
      }
    }
  } catch (error) {
    return FPNumber.ZERO;
  }
};

/**
 * Implements the "smart" split algorithm.
 */
export const smartSplit = (
  baseAssetId: string,
  syntheticBaseAssetId: string,
  inputAsset: string,
  outputAsset: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload,
  deduceFee: boolean
): QuoteResult => {
  let bestOutcome: FPNumber = extremum(isDesiredInput);
  let bestFee: FPNumber = FPNumber.ZERO;
  let bestDistribution: Array<Distribution> = [];
  let bestRewards: Array<LPRewardsInfo> = [];

  const isBaseAssetInput = isAssetAddress(inputAsset, baseAssetId);
  const [inputReserves, outputReserves] = getActualReserves(baseAssetId, inputAsset, outputAsset, payload);
  const [baseReserve, otherReserve] = isBaseAssetInput
    ? [inputReserves, outputReserves]
    : [outputReserves, inputReserves];

  const primaryAmount = isBaseAssetInput
    ? primaryMarketAmountSellingBaseAsset(
        inputAsset,
        outputAsset,
        amount,
        isDesiredInput,
        baseReserve,
        otherReserve,
        payload
      )
    : primaryMarketAmountBuyingBaseAsset(
        outputAsset,
        inputAsset,
        amount,
        isDesiredInput,
        baseReserve,
        otherReserve,
        payload
      );

  if (primaryAmount.isGtZero()) {
    const outcomePrimary = quotePrimaryMarket(
      baseAssetId,
      syntheticBaseAssetId,
      inputAsset,
      outputAsset,
      primaryAmount,
      isDesiredInput,
      payload,
      deduceFee
    );
    // check that outcomePrimary is not zero
    if (FPNumber.isLessThan(primaryAmount, amount) && !outcomePrimary.amount.isZero()) {
      const incomeSecondary = amount.sub(primaryAmount);
      const outcomeSecondary = xykQuote(
        baseAssetId,
        syntheticBaseAssetId,
        inputAsset,
        outputAsset,
        incomeSecondary,
        isDesiredInput,
        payload,
        deduceFee
      );

      bestOutcome = outcomePrimary.amount.add(outcomeSecondary.amount);
      bestFee = outcomePrimary.fee.add(outcomeSecondary.fee);
      bestRewards = [...outcomePrimary.rewards, ...outcomeSecondary.rewards];
      bestDistribution = [...outcomeSecondary.distribution, ...outcomePrimary.distribution];
    } else {
      bestOutcome = outcomePrimary.amount;
      bestFee = outcomePrimary.fee;
      bestRewards = outcomePrimary.rewards;
      bestDistribution = outcomePrimary.distribution;
    }
  }

  // check xyk only result regardless of split, because it might be better
  const outcomeSecondary = xykQuote(
    baseAssetId,
    syntheticBaseAssetId,
    inputAsset,
    outputAsset,
    amount,
    isDesiredInput,
    payload,
    deduceFee
  );

  if (isBetter(isDesiredInput, outcomeSecondary.amount, bestOutcome)) {
    bestOutcome = outcomeSecondary.amount;
    bestFee = outcomeSecondary.fee;
    bestRewards = outcomeSecondary.rewards;
    bestDistribution = outcomeSecondary.distribution;
  }

  if (FPNumber.isEqualTo(bestOutcome, Consts.MAX)) {
    bestOutcome = FPNumber.ZERO;
    bestFee = FPNumber.ZERO;
    bestRewards = [];
  }

  return {
    amount: bestOutcome,
    fee: bestFee,
    rewards: bestRewards,
    distribution: bestDistribution,
  };
};

// [ALT] new_smart_split
export const newSmartSplit = (
  baseAssetId: string,
  syntheticBaseAssetId: string,
  sources: LiquiditySourceTypes[],
  inputAsset: string,
  outputAsset: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload,
  deduceFee: boolean
): QuoteResult => {
  if (isAssetAddress(inputAsset, outputAsset)) {
    throw new Error(Errors.UnavailableExchangePath);
  }
  if (!isAssetAddress(inputAsset, baseAssetId) && !isAssetAddress(outputAsset, baseAssetId)) {
    throw new Error(Errors.UnavailableExchangePath);
  }

  const variant = isDesiredInput ? SwapVariant.WithDesiredInput : SwapVariant.WithDesiredOutput;
  const aggregator = new LiquidityAggregator(variant);

  for (const source of sources) {
    try {
      const discreteQuotation = LiquidityRegistry.stepQuote(source)(
        baseAssetId,
        syntheticBaseAssetId,
        inputAsset,
        outputAsset,
        amount,
        isDesiredInput,
        payload,
        deduceFee,
        Consts.GetNumSamples
      );

      // skip the source if it returns bad liquidity
      if (discreteQuotation.verify()) {
        aggregator.addSource(source, discreteQuotation);
      }
    } catch {
      continue;
    }
  }

  const aggregationResult = aggregator.aggregateLiquidity(amount);

  const rewards = [];

  for (const [source, [income, outcome]] of aggregationResult.swapInfo.entries()) {
    const sourceRewards = LiquidityRegistry.checkRewards(source)(
      baseAssetId,
      syntheticBaseAssetId,
      inputAsset,
      outputAsset,
      income,
      outcome,
      payload
    );
    rewards.push(...sourceRewards);
  }

  return {
    amount: aggregationResult.resultAmount,
    fee: aggregationResult.fee,
    distribution: aggregationResult.distribution.map((item) => ({ ...item, input: inputAsset, output: outputAsset })),
    rewards,
  };
};
