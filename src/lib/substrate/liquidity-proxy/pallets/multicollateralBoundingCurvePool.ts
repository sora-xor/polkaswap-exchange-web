import { FPNumber } from '@sora-substrate/math';

import { LiquiditySourceTypes, Consts, Errors, PriceVariant, RewardReason, SwapVariant } from '../consts';
import { safeDivide, saturatingSub, getMaxPositive, safeQuoteResult, isAssetAddress, toFp } from '../utils';
import { getAveragePrice } from './priceTools';
import { SwapChunk, DiscreteQuotation, SideAmount } from '../common/primitives';

import type { QuotePayload, QuoteResult, LPRewardsInfo } from '../types';

// can_exchange
export const canExchange = (
  baseAssetId: string,
  _syntheticBaseAssetId: string,
  inputAssetId: string,
  outputAssetId: string,
  payload: QuotePayload
): boolean => {
  if (baseAssetId !== Consts.XOR) return false;

  if (isAssetAddress(inputAssetId, baseAssetId)) {
    return payload.enabledAssets.tbc.includes(outputAssetId);
  } else if (isAssetAddress(outputAssetId, baseAssetId)) {
    return payload.enabledAssets.tbc.includes(inputAssetId);
  } else {
    return false;
  }
};

// step_quote
export const stepQuote = (
  baseAssetId: string,
  _syntheticBaseAssetId: string,
  inputAsset: string,
  outputAsset: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload,
  deduceFee: boolean,
  recommendedSamplesCount: number
): DiscreteQuotation => {
  if (!canExchange(baseAssetId, _syntheticBaseAssetId, inputAsset, outputAsset, payload)) {
    throw new Error(Errors.CantExchange);
  }

  const quotation = new DiscreteQuotation();

  if (amount.isZero()) {
    return quotation;
  }

  const samplesCount = recommendedSamplesCount < 1 ? 1 : recommendedSamplesCount;

  // reduce amount if it exceeds reserves
  if (isAssetAddress(inputAsset, baseAssetId)) {
    const collateralSupply = toFp(payload.reserves.tbc[outputAsset]);

    if (collateralSupply.isZero()) return quotation;

    const [adjustedAmount, maxLimit] = (() => {
      if (!isDesiredInput) {
        // reduce by `IrreducibleReserve` percent, because (reserve - output) must be > 0
        const maxValue = saturatingSub(collateralSupply, Consts.IrreducibleReserve.mul(collateralSupply));
        const value = maxValue.min(amount);

        return [value, new SideAmount(maxValue, SwapVariant.WithDesiredOutput)];
      } else {
        return [amount, null];
      }
    })();

    quotation.limits.maxAmount = maxLimit;

    amount = adjustedAmount;
  }

  const step = safeDivide(amount, new FPNumber(samplesCount));

  const amounts = (() => {
    if (isAssetAddress(inputAsset, baseAssetId)) {
      return decideStepSellAmounts(
        inputAsset,
        outputAsset,
        amount,
        isDesiredInput,
        payload,
        step,
        samplesCount,
        deduceFee
      );
    } else {
      return decideStepBuyAmounts(
        outputAsset,
        inputAsset,
        amount,
        isDesiredInput,
        payload,
        step,
        samplesCount,
        deduceFee
      );
    }
  })();

  let subIn = FPNumber.ZERO;
  let subOut = FPNumber.ZERO;
  let subFee = FPNumber.ZERO;

  for (const [inputAmount, outputAmount, feeAmount] of amounts) {
    const inputChunk = saturatingSub(inputAmount, subIn);
    const outputChunk = saturatingSub(outputAmount, subOut);
    const feeChunk = saturatingSub(feeAmount, subFee); // in XOR

    subIn = inputAmount;
    subOut = outputAmount;
    subFee = feeAmount;

    quotation.chunks.push(new SwapChunk(inputChunk, outputChunk, feeChunk));
  }

  return quotation;
};

// reference_price
const referencePrice = (assetAddress: string, priceVariant: PriceVariant, payload: QuotePayload): FPNumber => {
  const referenceAssetId = payload.consts.tbc.referenceAsset;
  // always treat TBCD as being worth $1
  if ([referenceAssetId, Consts.TBCD].includes(assetAddress)) {
    return FPNumber.ONE;
  } else {
    return getAveragePrice(assetAddress, referenceAssetId, priceVariant, payload);
  }
};

// actual_reserves_reference_price
const actualReservesReferencePrice = (
  collateralAsset: string,
  payload: QuotePayload,
  priceVariant: PriceVariant
): FPNumber => {
  const reserve = toFp(payload.reserves.tbc[collateralAsset]);
  const price = referencePrice(collateralAsset, priceVariant, payload);

  return reserve.mul(price);
};

// ideal_reserves_reference_price
const idealReservesReferencePrice = (
  mainAssetId: string,
  collateralAssetId: string,
  priceVariant: PriceVariant,
  delta: FPNumber,
  payload: QuotePayload
): FPNumber => {
  const baseTotalSupply = toFp(payload.issuances[mainAssetId]);
  const initialPrice = toFp(payload.consts.tbc.initialPrice);
  const currentState = buyFunction(mainAssetId, collateralAssetId, priceVariant, delta, payload);

  return safeDivide(initialPrice.add(currentState), FPNumber.TWO).mul(baseTotalSupply.add(delta));
};

// map_collateralized_fraction_to_penalty
const mapCollateralizedFractionToPenalty = (fraction: FPNumber): FPNumber => {
  if (FPNumber.isLessThan(fraction, new FPNumber(0.05))) {
    return new FPNumber(0.09);
  } else if (
    FPNumber.isGreaterThanOrEqualTo(fraction, new FPNumber(0.05)) &&
    FPNumber.isLessThan(fraction, new FPNumber(0.1))
  ) {
    return new FPNumber(0.06);
  } else if (
    FPNumber.isGreaterThanOrEqualTo(fraction, new FPNumber(0.1)) &&
    FPNumber.isLessThan(fraction, new FPNumber(0.2))
  ) {
    return new FPNumber(0.03);
  } else if (
    FPNumber.isGreaterThanOrEqualTo(fraction, new FPNumber(0.2)) &&
    FPNumber.isLessThan(fraction, new FPNumber(0.3))
  ) {
    return new FPNumber(0.01);
  } else {
    return FPNumber.ZERO;
  }
};

// sell_penalty
const sellPenalty = (mainAssetId: string, collateralAssetId: string, payload: QuotePayload): FPNumber => {
  const idealReservesPrice = idealReservesReferencePrice(
    mainAssetId,
    collateralAssetId,
    PriceVariant.Sell,
    FPNumber.ZERO,
    payload
  );
  const collateralReservesPrice = actualReservesReferencePrice(collateralAssetId, payload, PriceVariant.Sell);

  if (collateralReservesPrice.isZero()) {
    throw new Error(Errors.NotEnoughReserves);
  }

  const collateralizedFraction = safeDivide(collateralReservesPrice, idealReservesPrice);
  const penalty = mapCollateralizedFractionToPenalty(collateralizedFraction);

  return penalty;
};

// collateral_is_incentivised
const collateralIsIncentivised = (collateralAssetId: string) => {
  return ![Consts.PSWAP, Consts.VAL, Consts.XST, Consts.TBCD].includes(collateralAssetId);
};

const calculateBuyReward = (
  mainAssetId: string,
  collateralAssetId: string,
  mainAssetAmount: FPNumber,
  _collateralAssetAmount: FPNumber,
  payload: QuotePayload
): FPNumber => {
  if (!collateralIsIncentivised(collateralAssetId)) {
    return FPNumber.ZERO;
  }

  const idealBefore = idealReservesReferencePrice(
    mainAssetId,
    collateralAssetId,
    PriceVariant.Buy,
    FPNumber.ZERO,
    payload
  );

  const idealAfter = idealReservesReferencePrice(
    mainAssetId,
    collateralAssetId,
    PriceVariant.Buy,
    mainAssetAmount,
    payload
  );

  const actualBefore = actualReservesReferencePrice(collateralAssetId, payload, PriceVariant.Buy);
  const unfundedLiabilities = idealBefore.sub(actualBefore);

  const a = safeDivide(unfundedLiabilities, idealBefore);
  const b = safeDivide(unfundedLiabilities, idealAfter);

  const mean = safeDivide(a.add(b), FPNumber.TWO);
  const amount = safeDivide(
    a.sub(b).mul(Consts.initialPswapTbcRewardsAmount).mul(mean),
    Consts.incentivizedCurrenciesNum
  );

  return amount;
};

// check_rewards
export const checkRewards = (
  baseAssetId: string,
  _syntheticBaseAssetId: string,
  inputAsset: string,
  outputAsset: string,
  inputAmount: FPNumber,
  outputAmount: FPNumber,
  payload: QuotePayload
): Array<LPRewardsInfo> => {
  if (!canExchange(baseAssetId, _syntheticBaseAssetId, inputAsset, outputAsset, payload)) {
    throw new Error(Errors.CantExchange);
  }

  if (isAssetAddress(outputAsset, baseAssetId)) {
    const pswapAmount = calculateBuyReward(outputAsset, inputAsset, outputAmount, inputAmount, payload);

    // no multiplier

    if (pswapAmount.isZero()) {
      return [];
    }

    return [
      {
        amount: pswapAmount.toCodecString(),
        currency: Consts.PSWAP,
        reason: RewardReason.BuyOnBondingCurve,
      },
    ];
  } else {
    return []; // no rewards on sell
  }
};

// buy_function
const buyFunction = (
  mainAssetId: string,
  collateralAssetId: string,
  priceVariant: PriceVariant,
  delta: FPNumber,
  payload: QuotePayload
): FPNumber => {
  if (isAssetAddress(collateralAssetId, Consts.TBCD)) {
    // Handle TBCD
    const xp = referencePrice(mainAssetId, priceVariant, payload);
    // get the XOR price in USD (DAI) and add $1 to it
    const xorPrice = xp.add(FPNumber.ONE);

    return xorPrice;
  } else {
    // Everything other than TBCD
    const totalSupply = toFp(payload.issuances[mainAssetId]);
    const initialPrice = toFp(payload.consts.tbc.initialPrice);
    const priceChangeStep = toFp(payload.consts.tbc.priceChangeStep);
    const priceChangeRate = toFp(payload.consts.tbc.priceChangeRate);

    return safeDivide(totalSupply.add(delta), priceChangeStep.mul(priceChangeRate)).add(initialPrice);
  }
};

// sell_function
const sellFunction = (
  mainAssetId: string,
  collateralAssetId: string,
  delta: FPNumber,
  payload: QuotePayload
): FPNumber => {
  const buyFunctionResult = buyFunction(mainAssetId, collateralAssetId, PriceVariant.Sell, delta, payload);
  const sellPriceCoefficient = toFp(payload.consts.tbc.sellPriceCoefficient);

  return buyFunctionResult.mul(sellPriceCoefficient);
};

// decide_step_sell_amounts
const decideStepSellAmounts = (
  mainAssetId: string,
  collateralAssetAd: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload,
  stepAmount: FPNumber,
  steps: number,
  deduceFee: boolean
): Array<[FPNumber, FPNumber, FPNumber]> => {
  const res: Array<[FPNumber, FPNumber, FPNumber]> = [];

  for (let step = 1; step < steps; step++) {
    res.push(
      decideSellAmounts(
        mainAssetId,
        collateralAssetAd,
        stepAmount.mul(new FPNumber(step)),
        isDesiredInput,
        payload,
        deduceFee
      )
    );
  }

  res.push(decideSellAmounts(mainAssetId, collateralAssetAd, amount, isDesiredInput, payload, deduceFee));

  return res;
};

// decide_step_buy_amounts
const decideStepBuyAmounts = (
  mainAssetId: string,
  collateralAssetId: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload,
  stepAmount: FPNumber,
  steps: number,
  deduceFee: boolean
): Array<[FPNumber, FPNumber, FPNumber]> => {
  const res: Array<[FPNumber, FPNumber, FPNumber]> = [];

  if (isAssetAddress(collateralAssetId, Consts.TBCD)) {
    const [stepInput, stepOutput, stepFee] = decideBuyAmounts(
      mainAssetId,
      collateralAssetId,
      stepAmount,
      isDesiredInput,
      payload,
      deduceFee
    );

    for (let step = 1; step < steps; step++) {
      res.push([
        stepInput.mul(new FPNumber(step)),
        stepOutput.mul(new FPNumber(step)),
        stepFee.mul(new FPNumber(step)),
      ]);
    }
  } else {
    for (let step = 1; step < steps; step++) {
      const [stepInput, stepOutput, stepFee] = decideBuyAmounts(
        mainAssetId,
        collateralAssetId,
        stepAmount.mul(new FPNumber(step)),
        isDesiredInput,
        payload,
        deduceFee
      );

      res.push([stepInput, stepOutput, stepFee]);
    }
  }

  res.push(decideBuyAmounts(mainAssetId, collateralAssetId, amount, isDesiredInput, payload, deduceFee));

  return res;
};

// sell_price
const sellPrice = (
  mainAssetId: string,
  collateralAssetId: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload
): FPNumber => {
  const collateralSupply = toFp(payload.reserves.tbc[collateralAssetId]);
  const mainPricePerReferenceUnit = sellFunction(mainAssetId, collateralAssetId, FPNumber.ZERO, payload);
  const collateralPricePerReferenceUnit = referencePrice(collateralAssetId, PriceVariant.Sell, payload);
  const mainSupply = safeDivide(collateralSupply.mul(collateralPricePerReferenceUnit), mainPricePerReferenceUnit);

  if (isDesiredInput) {
    const outputCollateral = safeDivide(amount.mul(collateralSupply), mainSupply.add(amount));

    if (FPNumber.isGreaterThan(outputCollateral, collateralSupply)) {
      throw new Error(Errors.NotEnoughReserves);
    }

    return outputCollateral;
  } else {
    if (FPNumber.isGreaterThan(amount, collateralSupply)) {
      throw new Error(Errors.NotEnoughReserves);
    }

    const outputXor = safeDivide(mainSupply.mul(amount), collateralSupply.sub(amount));

    return outputXor;
  }
};

// buy_price
const buyPrice = (
  mainAssetId: string,
  collateralAssetId: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload
): FPNumber => {
  const priceChangeStep = toFp(payload.consts.tbc.priceChangeStep);
  const priceChangeRate = toFp(payload.consts.tbc.priceChangeRate);
  const priceChangeCoeff = priceChangeStep.mul(priceChangeRate);

  const currentState = buyFunction(mainAssetId, collateralAssetId, PriceVariant.Buy, FPNumber.ZERO, payload);
  const collateralPricePerReferenceUnit = referencePrice(collateralAssetId, PriceVariant.Buy, payload);

  if (isDesiredInput) {
    const collateralReferenceIn = collateralPricePerReferenceUnit.mul(amount);

    let mainOut: FPNumber;

    if (isAssetAddress(collateralAssetId, Consts.TBCD)) {
      mainOut = safeDivide(collateralReferenceIn, currentState);
    } else {
      // multiply_and_sqrt
      const a = currentState
        .mul(currentState)
        .mul(priceChangeCoeff)
        .add(FPNumber.TWO.mul(collateralReferenceIn))
        .sqrt();
      const b = priceChangeCoeff.sqrt();
      const sqrt = a.mul(b);
      mainOut = sqrt.sub(currentState.mul(priceChangeCoeff));
    }
    return getMaxPositive(mainOut);
  } else {
    const newState = buyFunction(mainAssetId, collateralAssetId, PriceVariant.Buy, amount, payload);
    const collateralReferenceIn = safeDivide(currentState.add(newState), FPNumber.TWO).mul(amount);
    const collateralQuantity = safeDivide(collateralReferenceIn, collateralPricePerReferenceUnit);
    return getMaxPositive(collateralQuantity);
  }
};

// decide_sell_amounts
const decideSellAmounts = (
  mainAssetId: string,
  collateralAssetId: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload,
  deduceFee: boolean
): [FPNumber, FPNumber, FPNumber] => {
  if (isDesiredInput) {
    const feeAmount = deduceFee
      ? Consts.TBC_FEE.add(sellPenalty(mainAssetId, collateralAssetId, payload)).mul(amount)
      : FPNumber.ZERO;
    const outputAmount = sellPrice(
      mainAssetId,
      collateralAssetId,
      saturatingSub(amount, feeAmount),
      isDesiredInput,
      payload
    );

    return [amount, outputAmount, feeAmount];
  } else {
    const inputAmount = sellPrice(mainAssetId, collateralAssetId, amount, isDesiredInput, payload);

    if (deduceFee) {
      const feeRatio = Consts.TBC_FEE.add(sellPenalty(mainAssetId, collateralAssetId, payload));
      const inputAmountWithFee = safeDivide(inputAmount, FPNumber.ONE.sub(feeRatio));
      const feeAmount = saturatingSub(inputAmountWithFee, inputAmount);

      return [inputAmountWithFee, amount, feeAmount];
    } else {
      return [inputAmount, amount, FPNumber.ZERO];
    }
  }
};

// decide_buy_amounts
const decideBuyAmounts = (
  mainAssetId: string,
  collateralAssetId: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload,
  deduceFee: boolean
): [FPNumber, FPNumber, FPNumber] => {
  if (isDesiredInput) {
    const output = buyPrice(mainAssetId, collateralAssetId, amount, isDesiredInput, payload);
    const feeAmount = deduceFee ? Consts.TBC_FEE.mul(output) : FPNumber.ZERO;
    const outputAmount = saturatingSub(output, feeAmount);

    return [amount, outputAmount, feeAmount];
  } else {
    if (deduceFee) {
      const desiredAmountOutWithFee = safeDivide(amount, FPNumber.ONE.sub(Consts.TBC_FEE));
      const inputAmount = buyPrice(mainAssetId, collateralAssetId, desiredAmountOutWithFee, isDesiredInput, payload);
      const feeAmount = saturatingSub(desiredAmountOutWithFee, amount);

      return [inputAmount, amount, feeAmount];
    } else {
      const inputAmount = buyPrice(mainAssetId, collateralAssetId, amount, isDesiredInput, payload);

      return [inputAmount, amount, FPNumber.ZERO];
    }
  }
};

export const buyPriceNoVolume = (mainAssetId: string, collateralAssetId: string, payload: QuotePayload): FPNumber => {
  const basePriceWrtRef = buyFunction(mainAssetId, collateralAssetId, PriceVariant.Buy, FPNumber.ZERO, payload);
  const collateralPricePerReferenceUnit = referencePrice(collateralAssetId, PriceVariant.Sell, payload);

  return safeDivide(basePriceWrtRef, collateralPricePerReferenceUnit);
};

export const sellPriceNoVolume = (mainAssetId: string, collateralAssetId: string, payload: QuotePayload): FPNumber => {
  const basePriceWrtRef = sellFunction(mainAssetId, collateralAssetId, FPNumber.ZERO, payload);
  const collateralPricePerReferenceUnit = referencePrice(collateralAssetId, PriceVariant.Buy, payload);

  return safeDivide(basePriceWrtRef, collateralPricePerReferenceUnit);
};

export const quoteWithoutImpact = (
  baseAssetId: string,
  _syntheticBaseAssetId: string,
  inputAsset: string,
  outputAsset: string,
  amount: FPNumber,
  isDesiredinput: boolean,
  payload: QuotePayload,
  deduceFee: boolean
): FPNumber => {
  try {
    if (!canExchange(baseAssetId, _syntheticBaseAssetId, inputAsset, outputAsset, payload)) {
      throw new Error(Errors.CantExchange);
    }

    if (isAssetAddress(inputAsset, baseAssetId)) {
      const xorPrice = sellPriceNoVolume(inputAsset, outputAsset, payload);
      const feeRatio = deduceFee ? Consts.TBC_FEE.add(sellPenalty(inputAsset, outputAsset, payload)) : FPNumber.ZERO;

      if (isDesiredinput) {
        const feeAmount = feeRatio.mul(amount);
        const collateralOut = saturatingSub(amount, feeAmount).mul(xorPrice);

        return collateralOut;
      } else {
        const xorIn = safeDivide(amount, xorPrice);
        const inputAmountWithFee = safeDivide(xorIn, FPNumber.ONE.sub(feeRatio));

        return inputAmountWithFee;
      }
    } else {
      const xorPrice = buyPriceNoVolume(outputAsset, inputAsset, payload);
      const feeRatio = deduceFee ? Consts.TBC_FEE : FPNumber.ZERO;

      if (isDesiredinput) {
        const xorOut = safeDivide(amount, xorPrice);
        const feeAmount = xorOut.mul(feeRatio);

        return saturatingSub(xorOut, feeAmount);
      } else {
        const outputAmountWithFee = safeDivide(amount, FPNumber.ONE.sub(feeRatio));
        const collateralIn = outputAmountWithFee.mul(xorPrice);

        return collateralIn;
      }
    }
  } catch (error) {
    return FPNumber.ZERO;
  }
};

export const quote = (
  baseAssetId: string,
  _syntheticBaseAssetId: string,
  inputAsset: string,
  outputAsset: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload,
  deduceFee: boolean
): QuoteResult => {
  try {
    if (!canExchange(baseAssetId, _syntheticBaseAssetId, inputAsset, outputAsset, payload)) {
      throw new Error(Errors.CantExchange);
    }

    const [inputAmount, outputAmount, feeAmount] = isAssetAddress(inputAsset, baseAssetId)
      ? decideSellAmounts(inputAsset, outputAsset, amount, isDesiredInput, payload, deduceFee)
      : decideBuyAmounts(outputAsset, inputAsset, amount, isDesiredInput, payload, deduceFee);
    const resultAmount = isDesiredInput ? outputAmount : inputAmount;
    const rewards = checkRewards(
      baseAssetId,
      _syntheticBaseAssetId,
      inputAsset,
      outputAsset,
      inputAmount,
      outputAmount,
      payload
    );

    return {
      amount: resultAmount,
      fee: feeAmount,
      rewards,
      distribution: [
        {
          input: inputAsset,
          output: outputAsset,
          market: LiquiditySourceTypes.MulticollateralBondingCurvePool,
          income: inputAmount,
          outcome: outputAmount,
          fee: feeAmount,
        },
      ],
    };
  } catch (error) {
    return safeQuoteResult(inputAsset, outputAsset, amount, LiquiditySourceTypes.MulticollateralBondingCurvePool);
  }
};
