import {
  CodecString,
  LiquiditySourceTypes,
  FPNumber,
  KnownAssets,
  KnownSymbols,
  MaxTotalSupply,
  RewardReason,
  LPRewardsInfo,
  QuotePayload,
} from '@sora-substrate/util';

const XOR = KnownAssets.get(KnownSymbols.XOR).address;
const PSWAP = KnownAssets.get(KnownSymbols.PSWAP).address;
const VAL = KnownAssets.get(KnownSymbols.VAL).address;
const DAI = KnownAssets.get(KnownSymbols.DAI).address;
const ETH = KnownAssets.get(KnownSymbols.ETH).address;
const XSTUSD = KnownAssets.get(KnownSymbols.XSTUSD).address;

const XYK_FEE = new FPNumber(0.003);
const XST_FEE = new FPNumber(0.007);
const TBC_FEE = new FPNumber(0.003);

const MAX = new FPNumber(MaxTotalSupply);

// TBC
const INITIAL_PRICE = new FPNumber(634);
const PRICE_CHANGE_COEFF = new FPNumber(1337);
const SELL_PRICE_COEFF = new FPNumber(0.8);

// 4 registered - pswap and val which are not incentivized
const incentivizedCurrenciesNum = new FPNumber(2);
// 2.5 billion pswap reserved for tbc rewards
const initialPswapTbcRewardsAmount = new FPNumber(2500000000);

const ASSETS_HAS_XYK_POOL = [XOR, PSWAP, VAL, DAI, ETH];

interface Distribution {
  market: LiquiditySourceTypes;
  amount: FPNumber;
}

interface QuoteResult {
  amount: FPNumber;
  fee: FPNumber;
  distribution: Array<Distribution>;
  rewards: Array<LPRewardsInfo>;
}

interface LiquidityProxyQuoteResult {
  amount: FPNumber;
  fee: FPNumber;
  amountWithoutImpact: FPNumber;
  rewards: Array<LPRewardsInfo>;
}

interface QuotePrimaryMarketResult {
  market: LiquiditySourceTypes;
  result: QuoteResult;
}

// UTILS
const toFp = (item: CodecString): FPNumber => FPNumber.fromCodecValue(item);

const getXykReservesPositioned = (
  isXorInput: boolean,
  reserves: QuotePayload['reserves']['xyk']
): [CodecString, CodecString] => {
  if (!isXorInput) {
    return [reserves[0][1], reserves[0][0]];
  } else if (reserves.length === 2) {
    return [reserves[1][0], reserves[1][1]];
  } else {
    return [reserves[0][0], reserves[0][1]];
  }
};

const getXykReserves = (inputAssetId: string, payload: QuotePayload): [FPNumber, FPNumber] => {
  const [input, output] = getXykReservesPositioned(inputAssetId === XOR, payload.reserves.xyk);

  return [toFp(input), toFp(output)];
};

const safeDivide = (value: FPNumber, divider: FPNumber): FPNumber => {
  if (divider.isZero() || divider.isNaN()) {
    throw new Error(`Division error: incorrect divider: ${divider.toString()}`);
  } else {
    return value.div(divider);
  }
};

// TBC quote
const tbcReferencePrice = (assetId: string, payload: QuotePayload): FPNumber => {
  if (assetId === DAI) {
    return new FPNumber(1);
  } else {
    const xorPrice = FPNumber.fromCodecValue(payload.prices[XOR]);
    const assetPrice = FPNumber.fromCodecValue(payload.prices[assetId]);

    return safeDivide(xorPrice, assetPrice);
  }
};

const tbcBuyFunction = (delta: FPNumber, payload: QuotePayload): FPNumber => {
  const xstusdIssuance = FPNumber.fromCodecValue(payload.issuances[XSTUSD]);
  const xorIssuance = FPNumber.fromCodecValue(payload.issuances[XOR]);
  const xorPrice = FPNumber.fromCodecValue(payload.prices[XOR]);
  const xstXorLiability = safeDivide(xstusdIssuance, xorPrice);

  // buy_price_usd = (xor_total_supply + xor_supply_delta) / (price_change_step * price_change_rate) + initial_price_usd`
  return safeDivide(xorIssuance.add(xstXorLiability).add(delta), PRICE_CHANGE_COEFF).add(INITIAL_PRICE);
};

const tbcSellFunction = (delta: FPNumber, payload: QuotePayload): FPNumber => {
  const buyFunctionResult = tbcBuyFunction(delta, payload);

  return buyFunctionResult.mul(SELL_PRICE_COEFF);
};

const idealReservesReferencePrice = (delta: FPNumber, payload: QuotePayload): FPNumber => {
  const xorIssuance = FPNumber.fromCodecValue(payload.issuances[XOR]);
  const currentState = tbcBuyFunction(delta, payload);

  return safeDivide(INITIAL_PRICE.add(currentState), new FPNumber(2).mul(xorIssuance.add(delta)));
};

const actualReservesReferencePrice = (collateralAssetId: string, payload: QuotePayload): FPNumber => {
  const reserve = FPNumber.fromCodecValue(payload.reserves.tbc[collateralAssetId]);
  const price = tbcReferencePrice(collateralAssetId, payload);

  return reserve.mul(price);
};

const mapCollateralizedFractionToPenalty = (fraction: number): number => {
  if (fraction < 0.05) {
    return 0.09;
  } else if (fraction >= 0.05 && fraction < 0.1) {
    return 0.06;
  } else if (fraction >= 0.1 && fraction < 0.2) {
    return 0.03;
  } else if (fraction >= 0.2 && fraction < 0.3) {
    return 0.01;
  } else {
    return 0;
  }
};

const sellPenalty = (collateralAssetId: string, payload: QuotePayload): FPNumber => {
  const idealReservesPrice = idealReservesReferencePrice(FPNumber.ZERO, payload);
  const collateralReservesPrice = actualReservesReferencePrice(collateralAssetId, payload);

  if (collateralReservesPrice.isZero()) {
    console.warn('sellPenalty: Not enough reserves', collateralAssetId);
    return FPNumber.ZERO;
  }

  const collateralizedFraction = safeDivide(collateralReservesPrice, idealReservesPrice);
  const penalty = mapCollateralizedFractionToPenalty(collateralizedFraction.toNumber());

  return new FPNumber(penalty);
};

const tbcSellPrice = (
  collateralAssetId: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload
): FPNumber => {
  const collateralSupply = FPNumber.fromCodecValue(payload.reserves.tbc[collateralAssetId]);
  const xorPrice = tbcSellFunction(FPNumber.ZERO, payload);
  const collateralPrice = tbcReferencePrice(collateralAssetId, payload);
  const xorSupply = safeDivide(collateralSupply.mul(collateralPrice), xorPrice);

  if (isDesiredInput) {
    const outputCollateral = safeDivide(amount.mul(collateralSupply), xorSupply.add(amount));

    if (FPNumber.isGreaterThan(outputCollateral, collateralSupply)) {
      console.warn('tbcSellPrice: Not enough reserves:', collateralAssetId);
      return FPNumber.ZERO;
    }

    return outputCollateral;
  } else {
    if (FPNumber.isGreaterThan(amount, collateralSupply)) {
      console.warn('tbcSellPrice: Not enough reserves:', collateralAssetId);
      return FPNumber.ZERO;
    }

    const outputXor = safeDivide(xorSupply.mul(amount), collateralSupply.sub(amount));

    return outputXor;
  }
};

const tbcBuyPrice = (
  collateralAssetId: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload
): FPNumber => {
  const currentState = tbcBuyFunction(FPNumber.ZERO, payload);
  const collateralPrice = tbcReferencePrice(collateralAssetId, payload);

  if (isDesiredInput) {
    const collateralReferenceIn = collateralPrice.mul(amount);
    const underPow = currentState.mul(PRICE_CHANGE_COEFF).mul(new FPNumber(2));
    const underSqrt = underPow.mul(underPow).add(new FPNumber(8).mul(PRICE_CHANGE_COEFF).mul(collateralReferenceIn));
    const xorOut = safeDivide(underSqrt.sqrt(), new FPNumber(2).sub(PRICE_CHANGE_COEFF.mul(currentState)));
    return FPNumber.max(xorOut, FPNumber.ZERO);
  } else {
    const newState = tbcBuyFunction(amount, payload);
    const collateralReferenceIn = safeDivide(currentState.add(newState).mul(amount), new FPNumber(2));
    const collateralQuantity = safeDivide(collateralReferenceIn, collateralPrice);
    return FPNumber.max(collateralQuantity, FPNumber.ZERO);
  }
};

const tbcSellPriceWithFee = (
  collateralAssetId: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload
): QuoteResult => {
  const newFee = TBC_FEE.add(sellPenalty(collateralAssetId, payload));

  if (isDesiredInput) {
    const feeAmount = amount.mul(newFee);
    const outputAmount = tbcSellPrice(collateralAssetId, amount.sub(feeAmount), isDesiredInput, payload);

    return {
      amount: outputAmount,
      fee: feeAmount,
      rewards: [],
      distribution: [
        {
          market: LiquiditySourceTypes.MulticollateralBondingCurvePool,
          amount,
        },
      ],
    };
  } else {
    const inputAmount = tbcSellPrice(collateralAssetId, amount, isDesiredInput, payload);
    const inputAmountWithFee = safeDivide(inputAmount, new FPNumber(1).sub(newFee));

    return {
      amount: inputAmountWithFee,
      fee: inputAmountWithFee.sub(inputAmount),
      rewards: [],
      distribution: [
        {
          market: LiquiditySourceTypes.MulticollateralBondingCurvePool,
          amount,
        },
      ],
    };
  }
};

const tbcBuyPriceWithFee = (
  collateralAssetId: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload
): QuoteResult => {
  if (isDesiredInput) {
    const outputAmount = tbcBuyPrice(collateralAssetId, amount, isDesiredInput, payload);
    const feeAmount = TBC_FEE.mul(outputAmount);
    const output = outputAmount.sub(feeAmount);
    const rewards = checkRewards(collateralAssetId, output, payload);

    return {
      amount: output,
      fee: feeAmount,
      rewards,
      distribution: [
        {
          market: LiquiditySourceTypes.MulticollateralBondingCurvePool,
          amount,
        },
      ],
    };
  } else {
    const amountWithFee = safeDivide(amount, new FPNumber(1).sub(TBC_FEE));
    const inputAmount = tbcBuyPrice(collateralAssetId, amountWithFee, isDesiredInput, payload);
    const rewards = checkRewards(collateralAssetId, amount, payload);

    return {
      amount: inputAmount,
      fee: amountWithFee.sub(amount),
      rewards,
      distribution: [
        {
          market: LiquiditySourceTypes.MulticollateralBondingCurvePool,
          amount,
        },
      ],
    };
  }
};

const tbcQuote = (
  inputAssetId: string,
  outputAssetId: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload
): QuoteResult => {
  if (inputAssetId === XOR) {
    return tbcSellPriceWithFee(outputAssetId, amount, isDesiredInput, payload);
  } else {
    return tbcBuyPriceWithFee(inputAssetId, amount, isDesiredInput, payload);
  }
};

// XST quote
const xstReferencePrice = (assetId: string, payload: QuotePayload): FPNumber => {
  if (assetId === DAI || assetId === XSTUSD) {
    return new FPNumber(1);
  } else {
    const avgPrice = FPNumber.fromCodecValue(payload.prices[assetId]);

    if (assetId === XOR) {
      return FPNumber.max(avgPrice, new FPNumber(100));
    }

    return avgPrice;
  }
};

const xstBuyPriceNoVolume = (syntheticAssetId: string, payload: QuotePayload): FPNumber => {
  const xorPrice = xstReferencePrice(XOR, payload);
  const syntheticPrice = xstReferencePrice(syntheticAssetId, payload);

  return safeDivide(xorPrice, syntheticPrice);
};

const xstSellPriceNoVolume = (syntheticAssetId: string, payload: QuotePayload): FPNumber => {
  const xorPrice = xstReferencePrice(XOR, payload);
  const syntheticPrice = xstReferencePrice(syntheticAssetId, payload);

  return safeDivide(xorPrice, syntheticPrice);
};

const xstBuyPrice = (amount: FPNumber, isDesiredInput: boolean, payload: QuotePayload): FPNumber => {
  const xorPrice = xstReferencePrice(XOR, payload);

  if (isDesiredInput) {
    return safeDivide(amount, xorPrice);
  } else {
    return amount.mul(xorPrice);
  }
};

const xstSellPrice = (amount: FPNumber, isDesiredInput: boolean, payload: QuotePayload): FPNumber => {
  const xorPrice = xstReferencePrice(XOR, payload);

  if (isDesiredInput) {
    return amount.mul(xorPrice);
  } else {
    return safeDivide(amount, xorPrice);
  }
};

const xstBuyPriceWithFee = (amount: FPNumber, isDesiredInput: boolean, payload: QuotePayload): QuoteResult => {
  if (isDesiredInput) {
    const outputAmount = xstBuyPrice(amount, isDesiredInput, payload);
    const feeAmount = XST_FEE.mul(outputAmount);
    const output = outputAmount.sub(feeAmount);

    return {
      amount: output,
      fee: feeAmount,
      rewards: [],
      distribution: [
        {
          market: LiquiditySourceTypes.XSTPool,
          amount,
        },
      ],
    };
  } else {
    const fpFee = new FPNumber(1).sub(XST_FEE);
    const amountWithFee = safeDivide(amount, fpFee);
    const input = xstBuyPrice(amountWithFee, isDesiredInput, payload);

    return {
      amount: input,
      fee: amountWithFee.sub(amount),
      rewards: [],
      distribution: [
        {
          market: LiquiditySourceTypes.XSTPool,
          amount,
        },
      ],
    };
  }
};

const xstSellPriceWithFee = (amount: FPNumber, isDesiredInput: boolean, payload: QuotePayload): QuoteResult => {
  if (isDesiredInput) {
    const feeAmount = amount.mul(XST_FEE);
    const output = xstSellPrice(amount.sub(feeAmount), isDesiredInput, payload);

    return {
      amount: output,
      fee: feeAmount,
      rewards: [],
      distribution: [
        {
          market: LiquiditySourceTypes.XSTPool,
          amount,
        },
      ],
    };
  } else {
    const inputAmount = xstSellPrice(amount, isDesiredInput, payload);
    const inputAmountWithFee = safeDivide(inputAmount, new FPNumber(1).sub(XST_FEE));

    return {
      amount: inputAmountWithFee,
      fee: inputAmountWithFee.sub(inputAmount),
      rewards: [],
      distribution: [
        {
          market: LiquiditySourceTypes.XSTPool,
          amount,
        },
      ],
    };
  }
};

const xstQuote = (
  inputAssetId: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload
): QuoteResult => {
  if (inputAssetId === XOR) {
    return xstSellPriceWithFee(amount, isDesiredInput, payload);
  } else {
    return xstBuyPriceWithFee(amount, isDesiredInput, payload);
  }
};

// XYK quote

// input token is xor, user indicates desired input amount
// x - xor reserve
// y - other token reserve
// x_in - desired input amount (xor)
const xykQuoteA = (x: FPNumber, y: FPNumber, xIn: FPNumber): QuoteResult => {
  const x1 = xIn.mul(new FPNumber(1).sub(XYK_FEE));
  const yOut = safeDivide(x1.mul(y), x.add(x1));

  return {
    amount: yOut,
    fee: xIn.mul(XYK_FEE),
    rewards: [],
    distribution: [
      {
        market: LiquiditySourceTypes.XYKPool,
        amount: xIn,
      },
    ],
  };
};

// output token is xor, user indicates desired input amount
// x - other token reserve
// y - xor reserve
// x_in - desired input amount (other token)
const xykQuoteB = (x: FPNumber, y: FPNumber, xIn: FPNumber): QuoteResult => {
  const y1 = safeDivide(xIn.mul(y), x.add(xIn));
  const yOut = y1.mul(new FPNumber(1).sub(XYK_FEE));

  return {
    amount: yOut,
    fee: y1.sub(yOut),
    rewards: [],
    distribution: [
      {
        market: LiquiditySourceTypes.XYKPool,
        amount: xIn,
      },
    ],
  };
};

// input token is xor, user indicates desired output amount
// x - xor reserve
// y - other token reserve
// y_out - desired output amount (other token)
const xykQuoteC = (x: FPNumber, y: FPNumber, yOut: FPNumber): QuoteResult => {
  if (FPNumber.isGreaterThanOrEqualTo(yOut, y)) {
    return {
      amount: FPNumber.ZERO,
      fee: FPNumber.ZERO,
      rewards: [],
      distribution: [
        {
          market: LiquiditySourceTypes.XYKPool,
          amount: yOut,
        },
      ],
    };
  }

  const x1 = safeDivide(x.mul(yOut), y.sub(yOut));
  const xIn = safeDivide(x1, new FPNumber(1).sub(XYK_FEE));

  return {
    amount: xIn,
    fee: xIn.sub(x1),
    rewards: [],
    distribution: [
      {
        market: LiquiditySourceTypes.XYKPool,
        amount: yOut,
      },
    ],
  };
};

// output token is xor, user indicates desired output amount
// x - other token reserve
// y - xor reserve
// y_out - desired output amount (xor)
const xykQuoteD = (x: FPNumber, y: FPNumber, yOut: FPNumber): QuoteResult => {
  const y1 = safeDivide(yOut, new FPNumber(1).sub(XYK_FEE));

  if (FPNumber.isGreaterThanOrEqualTo(y1, y)) {
    return {
      amount: FPNumber.ZERO,
      fee: FPNumber.ZERO,
      rewards: [],
      distribution: [
        {
          market: LiquiditySourceTypes.XYKPool,
          amount: yOut,
        },
      ],
    };
  }

  const xIn = safeDivide(x.mul(y1), y.sub(y1));

  return {
    amount: xIn,
    fee: y1.sub(yOut),
    rewards: [],
    distribution: [
      {
        market: LiquiditySourceTypes.XYKPool,
        amount: yOut,
      },
    ],
  };
};

const xykQuote = (
  inputReserves: FPNumber,
  outputReserves: FPNumber,
  amount: FPNumber,
  isDesiredInput: boolean,
  isXorInput: boolean
): QuoteResult => {
  if (isDesiredInput) {
    if (isXorInput) {
      return xykQuoteA(inputReserves, outputReserves, amount);
    } else {
      return xykQuoteB(inputReserves, outputReserves, amount);
    }
  } else {
    if (isXorInput) {
      return xykQuoteC(inputReserves, outputReserves, amount);
    } else {
      return xykQuoteD(inputReserves, outputReserves, amount);
    }
  }
};

// AGGREGATOR
const quotePrimaryMarket = (
  inputAssetId: string,
  outputAssetId: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload
): QuotePrimaryMarketResult => {
  if ([inputAssetId, outputAssetId].includes(XSTUSD)) {
    return {
      result: xstQuote(inputAssetId, amount, isDesiredInput, payload),
      market: LiquiditySourceTypes.XSTPool,
    };
  } else {
    return {
      result: tbcQuote(inputAssetId, outputAssetId, amount, isDesiredInput, payload),
      market: LiquiditySourceTypes.MulticollateralBondingCurvePool,
    };
  }
};

// xor is output
const primaryMarketAmountBuyingXor = (
  collateralAssetId: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  xorReserve: FPNumber,
  otherReserve: FPNumber,
  payload: QuotePayload
): FPNumber => {
  const secondaryPrice = FPNumber.isGreaterThan(xorReserve, FPNumber.ZERO) ? safeDivide(otherReserve, xorReserve) : MAX;

  const primaryBuyPrice =
    collateralAssetId === XSTUSD
      ? xstBuyPriceNoVolume(collateralAssetId, payload)
      : tbcBuyPriceNoVolume(collateralAssetId, payload);

  const k = xorReserve.mul(otherReserve);

  if (isDesiredInput) {
    if (FPNumber.isLessThan(secondaryPrice, primaryBuyPrice)) {
      const amountSecondary = k.mul(primaryBuyPrice).sqrt().sub(otherReserve);

      if (FPNumber.isGreaterThanOrEqualTo(amountSecondary, amount)) {
        return FPNumber.ZERO;
      } else if (FPNumber.isLessThanOrEqualTo(amountSecondary, FPNumber.ZERO)) {
        return amount;
      } else {
        return amount.sub(amountSecondary);
      }
    } else {
      return amount;
    }
  } else {
    if (FPNumber.isLessThan(secondaryPrice, primaryBuyPrice)) {
      const amountSecondary = xorReserve.sub(safeDivide(k, primaryBuyPrice).sqrt());

      if (FPNumber.isGreaterThanOrEqualTo(amountSecondary, amount)) {
        return FPNumber.ZERO;
      } else if (FPNumber.isLessThanOrEqualTo(amountSecondary, FPNumber.ZERO)) {
        return amount;
      } else {
        return amount.sub(amountSecondary);
      }
    } else {
      return amount;
    }
  }
};

// xor is input
const primaryMarketAmountSellingXor = (
  collateralAssetId: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  xorReserve: FPNumber,
  otherReserve: FPNumber,
  payload: QuotePayload
): FPNumber => {
  const secondaryPrice = FPNumber.isGreaterThan(xorReserve, FPNumber.ZERO)
    ? safeDivide(otherReserve, xorReserve)
    : FPNumber.ZERO;

  const primarySellPrice =
    collateralAssetId === XSTUSD
      ? xstSellPriceNoVolume(collateralAssetId, payload)
      : tbcSellPriceNoVolume(collateralAssetId, payload);

  const k = xorReserve.mul(otherReserve);

  if (isDesiredInput) {
    if (FPNumber.isGreaterThan(secondaryPrice, primarySellPrice)) {
      const amountSecondary = safeDivide(k, primarySellPrice).sqrt().sub(xorReserve);

      if (FPNumber.isGreaterThan(amountSecondary, amount)) {
        return FPNumber.ZERO;
      } else if (FPNumber.isLessThanOrEqualTo(amountSecondary, FPNumber.ZERO)) {
        return amount;
      } else {
        return amount.sub(amountSecondary);
      }
    } else {
      return amount;
    }
  } else {
    if (FPNumber.isGreaterThan(secondaryPrice, primarySellPrice)) {
      const amountSecondary = otherReserve.sub(k.mul(primarySellPrice).sqrt());

      if (FPNumber.isGreaterThanOrEqualTo(amountSecondary, amount)) {
        return FPNumber.ZERO;
      } else if (FPNumber.isLessThanOrEqualTo(amountSecondary, FPNumber.ZERO)) {
        return amount;
      } else {
        return amount.sub(amountSecondary);
      }
    } else {
      return amount;
    }
  }
};

const isBetter = (isDesiredInput: boolean, amountA: FPNumber, amountB: FPNumber): boolean => {
  if (isDesiredInput) {
    return FPNumber.isGreaterThan(amountA, amountB);
  } else {
    return (
      FPNumber.isGreaterThan(amountA, FPNumber.ZERO) && (amountB.isZero() || FPNumber.isLessThan(amountA, amountB))
    );
  }
};

const extremum = (isDesiredInput: boolean): FPNumber => {
  if (isDesiredInput) {
    return FPNumber.ZERO;
  } else {
    return MAX;
  }
};

const smartSplit = (
  inputAssetId: string,
  outputAssetId: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload
): QuoteResult => {
  let bestOutcome: FPNumber = extremum(isDesiredInput);
  let bestFee: FPNumber = FPNumber.ZERO;
  let bestDistribution: Array<any> = [];
  let bestRewards: Array<LPRewardsInfo> = [];

  const isXorInput = inputAssetId === XOR;
  const [inputReserves, outputReserves] = getXykReserves(inputAssetId, payload);

  const [xorReserve, otherReserve] = isXorInput ? [inputReserves, outputReserves] : [outputReserves, inputReserves];

  const primaryAmount = isXorInput
    ? primaryMarketAmountSellingXor(outputAssetId, amount, isDesiredInput, xorReserve, otherReserve, payload)
    : primaryMarketAmountBuyingXor(inputAssetId, amount, isDesiredInput, xorReserve, otherReserve, payload);

  if (FPNumber.isGreaterThan(primaryAmount, FPNumber.ZERO)) {
    const { result: outcomePrimary, market: primaryMarket } = quotePrimaryMarket(
      inputAssetId,
      outputAssetId,
      primaryAmount,
      isDesiredInput,
      payload
    );

    if (FPNumber.isLessThan(primaryAmount, amount)) {
      const outcomeSecondary = xykQuote(
        inputReserves,
        outputReserves,
        amount.sub(primaryAmount),
        isDesiredInput,
        isXorInput
      );

      bestOutcome = outcomePrimary.amount.add(outcomeSecondary.amount);
      bestFee = outcomePrimary.fee.add(outcomeSecondary.fee);
      bestRewards = [...outcomePrimary.rewards, ...outcomeSecondary.rewards];
      bestDistribution = [
        {
          market: LiquiditySourceTypes.XYKPool,
          amount: amount.sub(primaryAmount),
        },
        {
          market: primaryMarket,
          amount: primaryAmount,
        },
      ];
    } else {
      bestOutcome = outcomePrimary.amount;
      bestFee = outcomePrimary.fee;
      bestRewards = outcomePrimary.rewards;
      bestDistribution = [
        {
          market: primaryMarket,
          amount,
        },
      ];
    }
  }

  // check xyk only result regardless of split, because it might be better
  const outcomeSecondary = xykQuote(inputReserves, outputReserves, amount, isDesiredInput, isXorInput);

  if (isBetter(isDesiredInput, outcomeSecondary.amount, bestOutcome)) {
    bestOutcome = outcomeSecondary.amount;
    bestFee = outcomeSecondary.fee;
    bestRewards = outcomeSecondary.rewards;
    bestDistribution = [
      {
        market: LiquiditySourceTypes.XYKPool,
        amount,
      },
    ];
  }

  if (FPNumber.isEqualTo(bestOutcome, MAX)) {
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

const quoteSingle = (
  inputAssetId: string,
  outputAssetId: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  sources: Array<LiquiditySourceTypes>,
  payload: QuotePayload
): QuoteResult => {
  if (!sources.length) {
    throw new Error("Path doesn't exist");
  }

  if (sources.length === 1) {
    switch (sources[0]) {
      case LiquiditySourceTypes.XYKPool: {
        const [inputReserves, outputReserves] = getXykReserves(inputAssetId, payload);

        return xykQuote(inputReserves, outputReserves, amount, isDesiredInput, inputAssetId === XOR);
      }
      case LiquiditySourceTypes.MulticollateralBondingCurvePool: {
        return tbcQuote(inputAssetId, outputAssetId, amount, isDesiredInput, payload);
      }
      case LiquiditySourceTypes.XSTPool: {
        return xstQuote(inputAssetId, amount, isDesiredInput, payload);
      }
      default: {
        throw new Error(`Unexpected liquidity source: ${sources[0]}`);
      }
    }
  } else if (sources.length === 2) {
    if (
      sources.includes(LiquiditySourceTypes.XYKPool) &&
      (sources.includes(LiquiditySourceTypes.MulticollateralBondingCurvePool) ||
        sources.includes(LiquiditySourceTypes.XSTPool))
    ) {
      return smartSplit(inputAssetId, outputAssetId, amount, isDesiredInput, payload);
    } else {
      throw new Error('Unsupported operation');
    }
  } else {
    throw new Error('Unsupported operation');
  }
};

// ROUTER
const isDirectExchange = (inputAssetId: string, outputAssetId: string): boolean => {
  return [inputAssetId, outputAssetId].includes(XOR);
};

// Backend excluded "XYKPool" as liquidity sources for pairs with ASSETS_HAS_XYK_POOL
// So we assume, that "XYKPool" is exists for this pairs
// Whether it is possible to make an exchange, it will be clear from the XYK reserves
const listLiquiditySources = (
  inputAssetId: string,
  outputAssetId: string,
  selectedSources: Array<LiquiditySourceTypes>,
  availableSources: Array<LiquiditySourceTypes>
): Array<LiquiditySourceTypes> => {
  if (selectedSources.length) return selectedSources;

  const uniqueAddresses = new Set([...ASSETS_HAS_XYK_POOL, inputAssetId, outputAssetId]);
  const shouldHaveXYK =
    uniqueAddresses.size === ASSETS_HAS_XYK_POOL.length && !availableSources.includes(LiquiditySourceTypes.XYKPool);
  const sources = shouldHaveXYK ? [...availableSources, LiquiditySourceTypes.XYKPool] : availableSources;

  return sources;
};

export const quote = (
  inputAssetId: string,
  outputAssetId: string,
  value: string,
  isDesiredInput: boolean,
  selectedSources: Array<LiquiditySourceTypes>,
  availableSources: Array<LiquiditySourceTypes>,
  payload: QuotePayload
): LiquidityProxyQuoteResult => {
  try {
    const sources = listLiquiditySources(inputAssetId, outputAssetId, selectedSources, availableSources);
    const amount = new FPNumber(value);

    if (isDirectExchange(inputAssetId, outputAssetId)) {
      const result = quoteSingle(inputAssetId, outputAssetId, amount, isDesiredInput, sources, payload);
      const amountWithoutImpact = quoteWithoutImpactSingle(
        inputAssetId,
        outputAssetId,
        isDesiredInput,
        result.distribution,
        payload
      );

      return {
        amount: result.amount,
        fee: result.fee,
        rewards: result.rewards,
        amountWithoutImpact,
      };
    } else {
      if (isDesiredInput) {
        const firstQuote = quoteSingle(inputAssetId, XOR, amount, isDesiredInput, sources, payload);
        const secondQuote = quoteSingle(XOR, outputAssetId, firstQuote.amount, isDesiredInput, sources, payload);

        const firstQuoteWithoutImpact = quoteWithoutImpactSingle(
          inputAssetId,
          XOR,
          isDesiredInput,
          firstQuote.distribution,
          payload
        );

        const ratioToActual = safeDivide(firstQuoteWithoutImpact, firstQuote.amount);

        // multiply all amounts in second distribution to adjust to first quote without impact:
        const secondQuoteDistribution = secondQuote.distribution.map(({ market, amount }) => ({
          market,
          amount: amount.mul(ratioToActual),
        }));

        const secondQuoteWithoutImpact = quoteWithoutImpactSingle(
          XOR,
          outputAssetId,
          isDesiredInput,
          secondQuoteDistribution,
          payload
        );

        return {
          amount: secondQuote.amount,
          fee: firstQuote.fee.add(secondQuote.fee),
          rewards: [...firstQuote.rewards, ...secondQuote.rewards],
          amountWithoutImpact: secondQuoteWithoutImpact,
        };
      } else {
        const secondQuote = quoteSingle(XOR, outputAssetId, amount, isDesiredInput, sources, payload);
        const firstQuote = quoteSingle(inputAssetId, XOR, secondQuote.amount, isDesiredInput, sources, payload);

        const secondQuoteWithoutImpact = quoteWithoutImpactSingle(
          XOR,
          outputAssetId,
          isDesiredInput,
          secondQuote.distribution,
          payload
        );

        const ratioToActual = safeDivide(secondQuoteWithoutImpact, secondQuote.amount);

        // multiply all amounts in first distribution to adjust to second quote without impact:
        const firstQuoteDistribution = firstQuote.distribution.map(({ market, amount }) => ({
          market,
          amount: amount.mul(ratioToActual),
        }));

        const firstQuoteWithoutImpact = quoteWithoutImpactSingle(
          inputAssetId,
          XOR,
          isDesiredInput,
          firstQuoteDistribution,
          payload
        );

        return {
          amount: firstQuote.amount,
          fee: firstQuote.fee.add(secondQuote.fee),
          rewards: [...firstQuote.rewards, ...secondQuote.rewards],
          amountWithoutImpact: firstQuoteWithoutImpact,
        };
      }
    }
  } catch (error) {
    console.error(error);
    return {
      amount: FPNumber.ZERO,
      fee: FPNumber.ZERO,
      rewards: [],
      amountWithoutImpact: FPNumber.ZERO,
    };
  }
};

// PRICE IMPACT
const xykQuoteWithoutImpact = (
  inputReserves: FPNumber,
  outputReserves: FPNumber,
  amount: FPNumber,
  isDesiredInput: boolean,
  isXorInput: boolean
): FPNumber => {
  if ([inputReserves, outputReserves].some((item) => item.isZero())) {
    return FPNumber.ZERO;
  }

  const price = safeDivide(outputReserves, inputReserves);

  if (isDesiredInput) {
    if (isXorInput) {
      const amountWithoutFee = amount.mul(new FPNumber(1).sub(XYK_FEE));

      return amountWithoutFee.mul(price);
    } else {
      const amountWithFee = amount.mul(price);

      return amountWithFee.mul(new FPNumber(1).sub(XYK_FEE));
    }
  } else {
    if (isXorInput) {
      const amountWithoutFee = safeDivide(amount, price);

      return safeDivide(amountWithoutFee, new FPNumber(1).sub(XYK_FEE));
    } else {
      const amountWithFee = safeDivide(amount, new FPNumber(1).sub(XYK_FEE));

      return safeDivide(amountWithFee, price);
    }
  }
};

const tbcBuyPriceNoVolume = (collateralAssetId: string, payload: QuotePayload): FPNumber => {
  const xorPrice = tbcBuyFunction(FPNumber.ZERO, payload);
  const collateralPrice = tbcReferencePrice(collateralAssetId, payload);

  return safeDivide(xorPrice, collateralPrice);
};

const tbcSellPriceNoVolume = (collateralAssetId: string, payload: QuotePayload): FPNumber => {
  const xorPrice = tbcSellFunction(FPNumber.ZERO, payload);
  const collateralPrice = tbcReferencePrice(collateralAssetId, payload);

  return safeDivide(xorPrice, collateralPrice);
};

const tbcQuoteWithoutImpact = (
  inputAssetId: string,
  outputAssetId: string,
  amount: FPNumber,
  isDesiredinput: boolean,
  payload: QuotePayload
): FPNumber => {
  if (inputAssetId === XOR) {
    const xorPrice = tbcSellPriceNoVolume(outputAssetId, payload);
    const penalty = sellPenalty(outputAssetId, payload);
    const newFee = TBC_FEE.add(penalty);

    if (isDesiredinput) {
      const feeAmount = newFee.mul(amount);
      const collateralOut = amount.sub(feeAmount).mul(xorPrice);

      return collateralOut;
    } else {
      const xorIn = safeDivide(amount, xorPrice);
      const inputAmountWithFee = safeDivide(xorIn, new FPNumber(1).sub(newFee));

      return inputAmountWithFee;
    }
  } else {
    const xorPrice = tbcBuyPriceNoVolume(inputAssetId, payload);

    if (isDesiredinput) {
      const xorOut = safeDivide(amount, xorPrice);
      const feeAmount = xorOut.mul(TBC_FEE);

      return xorOut.sub(feeAmount);
    } else {
      const outputAmountWithFee = safeDivide(amount, new FPNumber(1).sub(TBC_FEE));
      const collateralIn = outputAmountWithFee.mul(xorPrice);

      return collateralIn;
    }
  }
};

const xstQuoteWithoutImpact = (
  inputAssetId: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload
): FPNumber => {
  // no impact already
  const quoteResult = xstQuote(inputAssetId, amount, isDesiredInput, payload);

  return quoteResult.amount;
};

const quoteWithoutImpactSingle = (
  inputAssetId: string,
  outputAssetId: string,
  isDesiredInput: boolean,
  distribution: Array<Distribution>,
  payload: QuotePayload
): FPNumber => {
  return distribution.reduce((result, item) => {
    const { market, amount } = item;

    if (market === LiquiditySourceTypes.XYKPool) {
      const [inputReserves, outputReserves] = getXykReserves(inputAssetId, payload);
      const value = xykQuoteWithoutImpact(inputReserves, outputReserves, amount, isDesiredInput, inputAssetId === XOR);

      return result.add(value);
    }
    if (market === LiquiditySourceTypes.MulticollateralBondingCurvePool) {
      const value = tbcQuoteWithoutImpact(inputAssetId, outputAssetId, amount, isDesiredInput, payload);

      return result.add(value);
    }
    if (market === LiquiditySourceTypes.XSTPool) {
      const value = xstQuoteWithoutImpact(inputAssetId, amount, isDesiredInput, payload);
      return result.add(value);
    }

    return result;
  }, FPNumber.ZERO);
};

// REWARDS
const checkRewards = (collateralAssetId: string, xorAmount: FPNumber, payload: QuotePayload): Array<LPRewardsInfo> => {
  if ([PSWAP, VAL].includes(collateralAssetId)) {
    return [];
  }

  const idealBefore = idealReservesReferencePrice(FPNumber.ZERO, payload);
  const idealAfter = idealReservesReferencePrice(xorAmount, payload);

  const actualBefore = actualReservesReferencePrice(collateralAssetId, payload);
  const unfundedLiabilities = idealBefore.sub(actualBefore);

  const a = safeDivide(unfundedLiabilities, idealBefore);
  const b = safeDivide(unfundedLiabilities, idealAfter);

  const mean = safeDivide(a.add(b), new FPNumber(2));
  const amount = safeDivide(a.sub(b).mul(initialPswapTbcRewardsAmount).mul(mean), incentivizedCurrenciesNum);

  if (amount.isZero()) {
    return [];
  }

  return [
    {
      amount: amount.toCodecString(),
      currency: PSWAP,
      reason: RewardReason.BuyOnBondingCurve,
    },
  ];
};
