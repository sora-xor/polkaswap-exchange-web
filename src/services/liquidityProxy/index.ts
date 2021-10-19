import {
  CodecString,
  LiquiditySourceTypes,
  FPNumber,
  KnownAssets,
  KnownSymbols,
  MaxTotalSupply,
} from '@sora-substrate/util';

const XOR = KnownAssets.get(KnownSymbols.XOR).address;
const PSWAP = KnownAssets.get(KnownSymbols.PSWAP).address;
const VAL = KnownAssets.get(KnownSymbols.VAL).address;

const LP_FEE = new FPNumber(0.003);
const XST_FEE = new FPNumber(0.007);
const TBC_FEE = new FPNumber(0.003);
const MAX = new FPNumber(MaxTotalSupply);

// TBC
const INITIAL_PRICE = new FPNumber(634);
const PRICE_CHANGE_COEFF = new FPNumber(1337);
const SELL_PRICE_COEFF = new FPNumber(0.8);

const DAI = '0x0200060000000000000000000000000000000000000000000000000000000000';
const ETH = '0x0200070000000000000000000000000000000000000000000000000000000000';
const XSTUSD = '0x0200080000000000000000000000000000000000000000000000000000000000';

const ASSETS_HAS_XYK_POOL = [XOR, PSWAP, VAL, DAI, ETH];

interface Distribution {
  market: LiquiditySourceTypes;
  amount: FPNumber;
}

interface QuoteResult {
  amount: FPNumber;
  fee: FPNumber;
  distribution: Array<Distribution>;
}

interface LiquidityProxyQuoteResult {
  amount: FPNumber;
  fee: FPNumber;
  amountWithoutImpact: FPNumber;
}

interface QuotePrimaryMarketResult {
  market: LiquiditySourceTypes;
  result: QuoteResult;
}

const toFp = (item: CodecString): FPNumber => FPNumber.fromCodecValue(item);

// TBC quote
const tbcReferencePrice = (assetId: string, payload): FPNumber => {
  if (assetId === DAI) {
    return new FPNumber(1);
  } else {
    return FPNumber.fromCodecValue(payload.prices[XOR]).div(FPNumber.fromCodecValue(payload.prices[assetId]));
  }
};

const tbcBuyFunction = (delta: FPNumber, payload): FPNumber => {
  const xstusdIssuance = FPNumber.fromCodecValue(payload.issuances[XSTUSD]);
  const xorIssuance = FPNumber.fromCodecValue(payload.issuances[XOR]);
  const xorPrice = FPNumber.fromCodecValue(payload.prices[XOR]);
  const xstXorLiability = xstusdIssuance.div(xorPrice);

  // buy_price_usd = (xor_total_supply + xor_supply_delta) / (price_change_step * price_change_rate) + initial_price_usd`
  return xorIssuance.add(xstXorLiability).add(delta).div(PRICE_CHANGE_COEFF).add(INITIAL_PRICE);
};

const tbcSellFunction = (delta: FPNumber, payload): FPNumber => {
  const buyFunctionResult = tbcBuyFunction(delta, payload);

  return buyFunctionResult.mul(SELL_PRICE_COEFF);
};

const idealReservesReferencePrice = (delta: FPNumber, payload): FPNumber => {
  const xorIssuance = FPNumber.fromCodecValue(payload.issuances[XOR]);
  const currentState = tbcBuyFunction(delta, payload);

  return INITIAL_PRICE.add(currentState).div(new FPNumber(2)).mul(xorIssuance.add(delta));
};

const actualReservesReferencePrice = (collateralAssetId: string, payload): FPNumber => {
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

const sellPenalty = (collateralAssetId: string, payload): FPNumber => {
  const idealReservesPrice = idealReservesReferencePrice(FPNumber.ZERO, payload);
  const collateralReservesPrice = actualReservesReferencePrice(collateralAssetId, payload);

  if (collateralReservesPrice.isZero()) {
    console.warn('sellPenalty: Not enough reserves', collateralAssetId);
    return FPNumber.ZERO;
  }

  const collateralizedFraction = collateralReservesPrice.div(idealReservesPrice);
  const penalty = mapCollateralizedFractionToPenalty(collateralizedFraction.toNumber());

  return new FPNumber(penalty);
};

const tbcSellPrice = (collateralAssetId: string, amount: FPNumber, isDesiredInput: boolean, payload): FPNumber => {
  const collateralSupply = FPNumber.fromCodecValue(payload.reserves.tbc[collateralAssetId]);
  const xorPrice = tbcSellFunction(FPNumber.ZERO, payload);
  const collateralPrice = tbcReferencePrice(collateralAssetId, payload);
  const xorSupply = collateralSupply.mul(collateralPrice).div(xorPrice);

  if (isDesiredInput) {
    const outputCollateral = amount.mul(collateralSupply).div(xorSupply.add(amount));

    if (FPNumber.isGreaterThan(outputCollateral, collateralSupply)) {
      console.warn('Not enough reserves', collateralAssetId);
      return FPNumber.ZERO;
    }

    return outputCollateral;
  } else {
    if (FPNumber.isGreaterThan(amount, collateralSupply)) {
      console.warn('Not enough reserves', collateralAssetId);
      return FPNumber.ZERO;
    }

    const outputXor = xorSupply.mul(amount).div(collateralSupply.sub(amount));

    return outputXor;
  }
};

const tbcBuyPrice = (collateralAssetId: string, amount: FPNumber, isDesiredInput: boolean, payload): FPNumber => {
  const currentState = tbcBuyFunction(FPNumber.ZERO, payload);
  const collateralPrice = tbcReferencePrice(collateralAssetId, payload);

  if (isDesiredInput) {
    const collateralReferenceIn = collateralPrice.mul(amount);
    const underPow = currentState.mul(PRICE_CHANGE_COEFF).mul(new FPNumber(2));
    const underSqrt = underPow.mul(underPow).add(new FPNumber(8).mul(PRICE_CHANGE_COEFF).mul(collateralReferenceIn));
    const xorOut = underSqrt.sqrt().div(new FPNumber(2)).sub(PRICE_CHANGE_COEFF.mul(currentState));
    return FPNumber.max(xorOut, FPNumber.ZERO);
  } else {
    const newState = tbcBuyFunction(amount, payload);
    const collateralReferenceIn = currentState.add(newState).div(new FPNumber(2)).mul(amount);
    const collateralQuantity = collateralReferenceIn.div(collateralPrice);
    return FPNumber.max(collateralQuantity, FPNumber.ZERO);
  }
};

const tbcSellPriceWithFee = (
  collateralAssetId: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload
): QuoteResult => {
  const newFee = TBC_FEE.add(sellPenalty(collateralAssetId, payload));

  if (isDesiredInput) {
    const feeAmount = amount.mul(newFee);
    const outputAmount = tbcSellPrice(collateralAssetId, amount.sub(feeAmount), isDesiredInput, payload);

    return {
      amount: outputAmount,
      fee: feeAmount,
      distribution: [
        {
          market: LiquiditySourceTypes.MulticollateralBondingCurvePool,
          amount,
        },
      ],
    };
  } else {
    const inputAmount = tbcSellPrice(collateralAssetId, amount, isDesiredInput, payload);
    const inputAmountWithFee = inputAmount.div(new FPNumber(1).sub(newFee));

    return {
      amount: inputAmountWithFee,
      fee: inputAmountWithFee.sub(inputAmount),
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
  payload
): QuoteResult => {
  if (isDesiredInput) {
    const outputAmount = tbcBuyPrice(collateralAssetId, amount, isDesiredInput, payload);
    const feeAmount = TBC_FEE.mul(outputAmount);
    const output = outputAmount.sub(feeAmount);
    return {
      amount: output,
      fee: feeAmount,
      distribution: [
        {
          market: LiquiditySourceTypes.MulticollateralBondingCurvePool,
          amount,
        },
      ],
    };
  } else {
    const amountWithFee = amount.div(new FPNumber(1).sub(TBC_FEE));
    const inputAmount = tbcBuyPrice(collateralAssetId, amountWithFee, isDesiredInput, payload);
    return {
      amount: inputAmount,
      fee: amountWithFee.sub(amount),
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
  payload
): QuoteResult => {
  if (inputAssetId === XOR) {
    return tbcSellPriceWithFee(outputAssetId, amount, isDesiredInput, payload);
  } else {
    return tbcBuyPriceWithFee(inputAssetId, amount, isDesiredInput, payload);
  }
};

// XST quote
const xstReferencePrice = (assetId: string, payload): FPNumber => {
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

const xstBuyPriceNoVolume = (syntheticAssetId: string, payload): FPNumber => {
  const xorPrice = xstReferencePrice(XOR, payload);
  const syntheticPrice = xstReferencePrice(syntheticAssetId, payload);

  return xorPrice.div(syntheticPrice);
};

const xstSellPriceNoVolume = (syntheticAssetId: string, payload): FPNumber => {
  const xorPrice = xstReferencePrice(XOR, payload);
  const syntheticPrice = xstReferencePrice(syntheticAssetId, payload);

  return xorPrice.div(syntheticPrice);
};

const xstBuyPrice = (amount: FPNumber, isDesiredInput: boolean, payload): FPNumber => {
  const xorPrice = xstReferencePrice(XOR, payload);

  if (isDesiredInput) {
    return amount.div(xorPrice);
  } else {
    return amount.mul(xorPrice);
  }
};

const xstSellPrice = (amount: FPNumber, isDesiredInput: boolean, payload): FPNumber => {
  const xorPrice = xstReferencePrice(XOR, payload);

  if (isDesiredInput) {
    return amount.mul(xorPrice);
  } else {
    return amount.div(xorPrice);
  }
};

const xstBuyPriceWithFee = (amount: FPNumber, isDesiredInput: boolean, payload): QuoteResult => {
  if (isDesiredInput) {
    const outputAmount = xstBuyPrice(amount, isDesiredInput, payload);
    const feeAmount = XST_FEE.mul(outputAmount);
    const output = outputAmount.sub(feeAmount);

    return {
      amount: output,
      fee: feeAmount,
      distribution: [
        {
          market: LiquiditySourceTypes.XSTPool,
          amount,
        },
      ],
    };
  } else {
    const fpFee = new FPNumber(1).sub(XST_FEE);
    const amountWithFee = amount.div(fpFee);
    const input = xstBuyPrice(amountWithFee, isDesiredInput, payload);

    return {
      amount: input,
      fee: amountWithFee.sub(amount),
      distribution: [
        {
          market: LiquiditySourceTypes.XSTPool,
          amount,
        },
      ],
    };
  }
};

const xstSellPriceWithFee = (amount: FPNumber, isDesiredInput: boolean, payload): QuoteResult => {
  if (isDesiredInput) {
    const feeAmount = amount.mul(XST_FEE);
    const output = xstSellPrice(amount.sub(feeAmount), isDesiredInput, payload);

    return {
      amount: output,
      fee: feeAmount,
      distribution: [
        {
          market: LiquiditySourceTypes.XSTPool,
          amount,
        },
      ],
    };
  } else {
    const inputAmount = xstSellPrice(amount, isDesiredInput, payload);
    const inputAmountWithFee = inputAmount.div(new FPNumber(1).sub(XST_FEE));

    return {
      amount: inputAmountWithFee,
      fee: inputAmountWithFee.sub(inputAmount),
      distribution: [
        {
          market: LiquiditySourceTypes.XSTPool,
          amount,
        },
      ],
    };
  }
};

const xstQuote = (inputAssetId: string, amount: FPNumber, isDesiredInput: boolean, payload): QuoteResult => {
  if (inputAssetId === XOR) {
    return xstSellPriceWithFee(amount, isDesiredInput, payload);
  } else {
    return xstBuyPriceWithFee(amount, isDesiredInput, payload);
  }
};

// XYK quote
const getXykReserves = (inputAssetId: string, payload): Array<FPNumber> => {
  const isXorInput = inputAssetId === XOR;

  if (!isXorInput) {
    return [payload.reserves.xyk[0][1], payload.reserves.xyk[0][0]].map(toFp);
  } else if (payload.reserves.xyk.length === 2) {
    return [payload.reserves.xyk[1][0], payload.reserves.xyk[1][1]].map(toFp);
  } else {
    return [payload.reserves.xyk[0][0], payload.reserves.xyk[0][1]].map(toFp);
  }
};

// input token is xor, user indicates desired input amount
// x - xor reserve
// y - other token reserve
// x_in - desired input amount (xor)
const xykQuoteA = (x: FPNumber, y: FPNumber, xIn: FPNumber): QuoteResult => {
  const x1 = xIn.mul(new FPNumber(1).sub(LP_FEE));
  const yOut = x1.mul(y).div(x.add(x1));

  return {
    amount: yOut,
    fee: xIn.mul(LP_FEE),
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
  const y1 = xIn.mul(y).div(x.add(xIn));
  const yOut = y1.mul(new FPNumber(1).sub(LP_FEE));

  return {
    amount: yOut,
    fee: y1.sub(yOut),
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
      distribution: [
        {
          market: LiquiditySourceTypes.XYKPool,
          amount: yOut,
        },
      ],
    };
  }

  const x1 = x.mul(yOut).div(y.sub(yOut));
  const xIn = x1.div(new FPNumber(1).sub(LP_FEE));

  return {
    amount: xIn,
    fee: xIn.sub(x1),
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
  const y1 = yOut.div(new FPNumber(1).sub(LP_FEE));

  if (FPNumber.isGreaterThanOrEqualTo(y1, y)) {
    return {
      amount: FPNumber.ZERO,
      fee: FPNumber.ZERO,
      distribution: [
        {
          market: LiquiditySourceTypes.XYKPool,
          amount: yOut,
        },
      ],
    };
  }

  const xIn = x.mul(y1).div(y.sub(y1));

  return {
    amount: xIn,
    fee: y1.sub(yOut),
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
  payload
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
  payload
): FPNumber => {
  const secondaryPrice = FPNumber.isGreaterThan(xorReserve, FPNumber.ZERO) ? otherReserve.div(xorReserve) : MAX;

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
      const amountSecondary = xorReserve.sub(k.div(primaryBuyPrice).sqrt());

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
  payload
): FPNumber => {
  const secondaryPrice = FPNumber.isGreaterThan(xorReserve, FPNumber.ZERO)
    ? otherReserve.div(xorReserve)
    : FPNumber.ZERO;

  const primarySellPrice =
    collateralAssetId === XSTUSD
      ? xstSellPriceNoVolume(collateralAssetId, payload)
      : xstSellPriceNoVolume(collateralAssetId, payload);

  const k = xorReserve.mul(otherReserve);

  if (isDesiredInput) {
    if (FPNumber.isGreaterThan(secondaryPrice, primarySellPrice)) {
      const amountSecondary = k.div(primarySellPrice).sqrt().sub(xorReserve);

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
    if (FPNumber.isLessThan(secondaryPrice, primarySellPrice)) {
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
    return FPNumber.isLessThan(amountA, amountB);
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
  payload
): QuoteResult => {
  let bestOutcome: FPNumber = extremum(isDesiredInput);
  let bestFee: FPNumber = FPNumber.ZERO;
  let bestDistribution: Array<any> = [];

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

  if (bestOutcome.isZero() || isBetter(isDesiredInput, outcomeSecondary.amount, bestOutcome)) {
    bestOutcome = outcomeSecondary.amount;
    bestFee = outcomeSecondary.fee;
    bestDistribution = [
      {
        market: LiquiditySourceTypes.XYKPool,
        amount,
      },
    ];
  }

  return {
    amount: bestOutcome,
    fee: bestFee,
    distribution: bestDistribution,
  };
};

const quoteSingle = (
  inputAssetId: string,
  outputAssetId: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  sources: Array<LiquiditySourceTypes>,
  payload
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
  payload
): LiquidityProxyQuoteResult => {
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

      const ratioToActual = firstQuoteWithoutImpact.div(firstQuote.amount);

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

      const ratioToActual = secondQuoteWithoutImpact.div(secondQuote.amount);

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
        amountWithoutImpact: firstQuoteWithoutImpact,
      };
    }
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

  const price = outputReserves.div(inputReserves);

  if (isDesiredInput) {
    if (isXorInput) {
      const amountWithoutFee = amount.mul(new FPNumber(1).sub(LP_FEE));

      return amountWithoutFee.mul(price);
    } else {
      const amountWithFee = amount.mul(price);

      return amountWithFee.mul(new FPNumber(1).sub(LP_FEE));
    }
  } else {
    if (isXorInput) {
      const amountWithoutFee = amount.div(price);

      return amountWithoutFee.div(new FPNumber(1).sub(LP_FEE));
    } else {
      const amountWithFee = amount.div(new FPNumber(1).sub(LP_FEE));

      return amountWithFee.div(price);
    }
  }
};

const tbcBuyPriceNoVolume = (collateralAssetId: string, payload): FPNumber => {
  const xorPrice = tbcBuyFunction(FPNumber.ZERO, payload);
  const collateralPrice = tbcReferencePrice(collateralAssetId, payload);

  return xorPrice.div(collateralPrice);
};

const tbcSellPriceNoVolume = (collateralAssetId: string, payload): FPNumber => {
  const xorPrice = tbcSellFunction(FPNumber.ZERO, payload);
  const collateralPrice = tbcReferencePrice(collateralAssetId, payload);

  return xorPrice.div(collateralPrice);
};

const tbcQuoteWithoutImpact = (
  inputAssetId: string,
  outputAssetId: string,
  amount: FPNumber,
  isDesiredinput: boolean,
  payload
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
      const xorIn = amount.div(xorPrice);
      const inputAmountWithFee = xorIn.div(new FPNumber(1).sub(newFee));

      return inputAmountWithFee;
    }
  } else {
    const xorPrice = tbcBuyPriceNoVolume(inputAssetId, payload);

    if (isDesiredinput) {
      const xorOut = amount.div(xorPrice);
      const feeAmount = xorOut.mul(TBC_FEE);

      return xorOut.sub(feeAmount);
    } else {
      const outputAmountWithFee = amount.div(new FPNumber(1).sub(TBC_FEE));
      const collateralIn = outputAmountWithFee.mul(xorPrice);

      return collateralIn;
    }
  }
};

const xstQuoteWithoutImpact = (inputAssetId: string, amount: FPNumber, isDesiredInput: boolean, payload): FPNumber => {
  // no impact already
  const quoteResult = xstQuote(inputAssetId, amount, isDesiredInput, payload);

  return quoteResult.amount;
};

const quoteWithoutImpactSingle = (
  inputAssetId: string,
  outputAssetId: string,
  isDesiredInput: boolean,
  distribution: Array<Distribution>,
  payload
): FPNumber => {
  return distribution.reduce((result, item, index) => {
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
