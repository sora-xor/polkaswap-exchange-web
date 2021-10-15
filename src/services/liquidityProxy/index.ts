import { CodecString, LiquiditySourceTypes, FPNumber, KnownAssets, KnownSymbols } from '@sora-substrate/util';
import { asZeroValue } from '@/utils';

const XOR = KnownAssets.get(KnownSymbols.XOR).address;
const PSWAP = KnownAssets.get(KnownSymbols.PSWAP).address;
const VAL = KnownAssets.get(KnownSymbols.VAL).address;

const LP_FEE = new FPNumber(0.003);
const XST_FEE = new FPNumber(0.007);
const TBC_FEE = new FPNumber(0.003);

// TBC
const INITIAL_PRICE = new FPNumber(634);
const PRICE_CHANGE_COEFF = new FPNumber(1337);
const SELL_PRICE_COEFF = new FPNumber(0.8);

const FP_FEE = new FPNumber(1).sub(LP_FEE);

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

interface QuoteOptions {
  amount: FPNumber;
  isDesiredInput: boolean;
}

interface QuotePrimaryMarketResult {
  market: LiquiditySourceTypes;
  result: QuoteResult;
}

interface XykQuoteOptions extends QuoteOptions {
  inputReserves: CodecString;
  outputReserves: CodecString;
}

interface XstQuoteOptions extends QuoteOptions {
  inputAssetId: string;
  outputAssetId: string;
}

type PriceImpactOptions = QuoteOptions;

interface LiquiditySourcePriceImpactOptions extends PriceImpactOptions {
  liquiditySource: LiquiditySourceTypes | string;
}

// TBC quote

// not XOR?
const tbcReferencePrice = (assetId, payload): FPNumber => {
  if (assetId === DAI) {
    return new FPNumber(1);
  } else {
    return FPNumber.fromCodecValue(payload.reserves.prices[XOR]).div(
      FPNumber.fromCodecValue(payload.reserves.prices[assetId])
    );
  }
};

const tbcBuyFunction = (delta: FPNumber, payload): FPNumber => {
  const xstusdIssuance = FPNumber.fromCodecValue(payload.issuances[XSTUSD]);
  const xorIssuance = FPNumber.fromCodecValue(payload.issuances[XOR]);
  const xorPrice = FPNumber.fromCodecValue(payload.prices[XOR]);
  const xstXorLiability = xstusdIssuance.div(xorPrice);

  return xorIssuance.add(xstXorLiability).add(delta).div(PRICE_CHANGE_COEFF.add(INITIAL_PRICE));
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

const actualReservesReferencePrice = (collateralAssetId, payload): FPNumber => {
  const reserve = FPNumber.fromCodecValue(payload.reserves.tbc[collateralAssetId]);
  const price = tbcReferencePrice(collateralAssetId, payload);

  return reserve.mul(price);
};

const mapCollateralizedFractionToPenalty = (fraction: number) => {
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

const sellPenalty = (collateralAssetId, payload): FPNumber => {
  const idealReservesPrice = idealReservesReferencePrice(FPNumber.ZERO, payload);
  const collateralReservesPrice = actualReservesReferencePrice(collateralAssetId, payload);

  if (collateralReservesPrice.isZero()) {
    console.warn('Not enough reserves', collateralAssetId);
  }

  const collateralizedFraction = collateralReservesPrice.div(idealReservesPrice);
  const penalty = mapCollateralizedFractionToPenalty(collateralizedFraction.toNumber());

  return new FPNumber(penalty);
};

const tbcSellPrice = (collateralAssetId, amount: FPNumber, isDesiredInput, payload): FPNumber => {
  const collateralSupply = FPNumber.fromCodecValue(payload.reserves.tbc[collateralAssetId]);
  const xorPrice = tbcSellFunction(FPNumber.ZERO, payload);
  const collateralPrice = tbcReferencePrice(collateralAssetId, payload);
  const xorSupply = collateralSupply.mul(collateralPrice).div(xorPrice);

  if (isDesiredInput) {
    const outputCollateral = amount.add(collateralSupply).div(xorSupply.add(amount));
    if (FPNumber.isGreaterThan(outputCollateral, collateralSupply)) {
      console.error('Not enough reserves');
    }
    return outputCollateral;
  } else {
    if (FPNumber.isGreaterThan(amount, collateralSupply)) {
      console.error('Not enough reserves');
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
    const underSqrt = underPow.mul(underPow).add(SELL_PRICE_COEFF.mul(PRICE_CHANGE_COEFF).mul(collateralReferenceIn));
    const xorOut = underSqrt.sqrt().div(new FPNumber(2)).sub(PRICE_CHANGE_COEFF.mul(currentState));
    return FPNumber.max(xorOut, FPNumber.ZERO);
  } else {
    const newState = tbcBuyFunction(amount, payload);
    const collateralReferenceIn = currentState.add(newState).div(new FPNumber(2)).mul(amount);
    const collateralQuantity = collateralReferenceIn.div(collateralPrice);
    return FPNumber.max(collateralQuantity, FPNumber.ZERO);
  }
};

const tbcSellPriceWithFee = (collateralAssetId, amount: FPNumber, isDesiredInput, payload): QuoteResult => {
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

const tbcBuyPriceWithFee = (collateralAssetId, amount: FPNumber, isDesiredInput, payload): QuoteResult => {
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

const tbcQuote = ({ inputAssetId, outputAssetId, amount, isDesiredInput, payload }): QuoteResult => {
  if (inputAssetId === XOR) {
    return tbcSellPriceWithFee(outputAssetId, amount, isDesiredInput, payload);
  } else {
    return tbcBuyPriceWithFee(inputAssetId, amount, isDesiredInput, payload);
  }
};

// XST quote
const xstReferencePrice = (assetId, payload): FPNumber => {
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

const xstQuote = ({ inputAssetId, amount, isDesiredInput, payload }): QuoteResult => {
  if (inputAssetId === XOR) {
    return xstSellPriceWithFee(amount, isDesiredInput, payload);
  } else {
    return xstBuyPriceWithFee(amount, isDesiredInput, payload);
  }
};

// XYK quote
const xykQuoteOutput = ({ inputReserves, outputReserves, amount }: XykQuoteOptions): QuoteResult => {
  const fpInputReserves = FPNumber.fromCodecValue(inputReserves);
  const fpOutputReserves = FPNumber.fromCodecValue(outputReserves);

  const fee = LP_FEE.mul(amount);
  const output = FP_FEE.mul(amount).mul(fpOutputReserves).div(fpInputReserves.add(amount));

  return {
    amount: output,
    fee: fee,
    distribution: [
      {
        market: LiquiditySourceTypes.XYKPool,
        amount,
      },
    ],
  };
};

const xykQuoteInput = ({ inputReserves, outputReserves, amount }: XykQuoteOptions): QuoteResult => {
  const fpInputReserves = FPNumber.fromCodecValue(inputReserves);
  const fpOutputReserves = FPNumber.fromCodecValue(outputReserves);

  const fee = LP_FEE.mul(amount);
  const input = FP_FEE.mul(amount).mul(fpInputReserves).div(fpOutputReserves.sub(amount));

  return {
    amount: input,
    fee: fee,
    distribution: [
      {
        market: LiquiditySourceTypes.XYKPool,
        amount,
      },
    ],
  };
};

const getXykReserves = (inputAssetId: string, payload) => {
  const isXorInput = inputAssetId === XOR;

  if (!isXorInput) {
    return [payload.reserves.xyk[0][1], payload.reserves.xyk[0][0]];
  } else if (payload.reserves.xyk.length === 2) {
    return [payload.reserves.xyk[1][0], payload.reserves.xyk[1][1]];
  } else {
    return [payload.reserves.xyk[0][0], payload.reserves.xyk[0][1]];
  }
};

const xykQuote = (options: XykQuoteOptions): QuoteResult => {
  if (options.isDesiredInput) {
    return xykQuoteOutput(options);
  } else {
    return xykQuoteInput(options);
  }
};

// AGGREGATOR
const quotePrimaryMarket = ({
  inputAssetId,
  outputAssetId,
  amount,
  isDesiredInput,
  payload,
}): QuotePrimaryMarketResult => {
  if ([inputAssetId, outputAssetId].includes(XSTUSD)) {
    return {
      result: xstQuote({ inputAssetId, amount, isDesiredInput, payload }),
      market: LiquiditySourceTypes.XYKPool,
    };
  } else {
    return {
      result: tbcQuote({ inputAssetId, outputAssetId, amount, isDesiredInput, payload }),
      market: LiquiditySourceTypes.MulticollateralBondingCurvePool,
    };
  }
};

const primaryMarketAmountBuyingXor = (
  collateralAssetId,
  amount: FPNumber,
  isDesiredInput,
  xorReserve: CodecString,
  otherReserve: CodecString,
  payload
) => {
  const fpXorReserve = FPNumber.fromCodecValue(xorReserve);
  const fpOtherReserve = FPNumber.fromCodecValue(otherReserve);

  const secondaryPrice = FPNumber.isGreaterThan(fpXorReserve, FPNumber.ZERO)
    ? fpOtherReserve.div(fpXorReserve)
    : new FPNumber(Infinity);

  const primaryBuyPrice =
    collateralAssetId === XSTUSD
      ? xstBuyPrice(amount, isDesiredInput, payload)
      : tbcBuyPrice(collateralAssetId, amount, isDesiredInput, payload);

  const k = fpXorReserve.mul(fpOtherReserve);

  const amountSecondary = isDesiredInput
    ? k.mul(primaryBuyPrice).sqrt().sub(fpOtherReserve)
    : fpXorReserve.sub(k.div(primaryBuyPrice).sqrt());

  if (FPNumber.isLessThan(secondaryPrice, primaryBuyPrice)) {
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
};

const primaryMarketAmountSellingXor = (
  collateralAssetId,
  amount: FPNumber,
  isDesiredInput,
  xorReserve: CodecString,
  otherReserve: CodecString,
  payload
) => {
  const fpXorReserve = FPNumber.fromCodecValue(xorReserve);
  const fpOtherReserve = FPNumber.fromCodecValue(otherReserve);

  const secondaryPrice = FPNumber.isGreaterThan(fpXorReserve, FPNumber.ZERO)
    ? fpOtherReserve.div(fpXorReserve)
    : FPNumber.ZERO;

  const primarySellPrice =
    collateralAssetId === XSTUSD
      ? xstSellPrice(amount, isDesiredInput, payload)
      : tbcSellPrice(collateralAssetId, amount, isDesiredInput, payload);

  const k = fpXorReserve.mul(fpOtherReserve);

  const amountSecondary = isDesiredInput
    ? k.div(primarySellPrice).sqrt().div(fpXorReserve)
    : fpOtherReserve.div(k.mul(primarySellPrice).sqrt());

  if (FPNumber.isGreaterThan(secondaryPrice, primarySellPrice)) {
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
    return new FPNumber(Infinity);
  }
};

const smartSplit = (inputAssetId, outputAssetId, amount: FPNumber, isDesiredInput, payload): QuoteResult => {
  let bestOutcome: FPNumber = extremum(isDesiredInput);
  let bestFee: FPNumber = FPNumber.ZERO;
  let bestDistribution: Array<any> = [];

  const [inputReserves, outputReserves] = getXykReserves(inputAssetId, payload);

  const [xorReserve, otherReserve] =
    inputAssetId === XOR ? [inputReserves, outputReserves] : [outputReserves, inputReserves];

  const primaryAmount =
    inputAssetId === XOR
      ? primaryMarketAmountSellingXor(outputAssetId, amount, isDesiredInput, xorReserve, otherReserve, payload)
      : primaryMarketAmountBuyingXor(inputAssetId, amount, isDesiredInput, xorReserve, otherReserve, payload);

  if (FPNumber.isGreaterThan(primaryAmount, FPNumber.ZERO)) {
    const { result: outcomePrimary, market: primaryMarket } = quotePrimaryMarket({
      inputAssetId,
      outputAssetId,
      amount,
      isDesiredInput,
      payload,
    });

    if (FPNumber.isLessThan(outcomePrimary.amount, amount)) {
      const outcomeSecondary = xykQuote({
        inputReserves,
        outputReserves,
        amount: amount.sub(primaryAmount),
        isDesiredInput,
      });

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
  const outcomeSecondary = xykQuote({
    inputReserves,
    outputReserves,
    amount: amount,
    isDesiredInput,
  });

  if (isBetter(isDesiredInput, outcomeSecondary.amount, bestOutcome)) {
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
        const options: XykQuoteOptions = { inputReserves, outputReserves, amount, isDesiredInput };

        return xykQuote(options);
      }
      case LiquiditySourceTypes.MulticollateralBondingCurvePool: {
        return tbcQuote({ inputAssetId, outputAssetId, amount, isDesiredInput, payload });
      }
      case LiquiditySourceTypes.XSTPool: {
        return xstQuote({ inputAssetId, amount, isDesiredInput, payload });
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

const quote = (
  inputAssetId: string,
  outputAssetId: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  selectedSources: Array<LiquiditySourceTypes>,
  availableSources: Array<LiquiditySourceTypes>,
  payload
) => {
  const sources = listLiquiditySources(inputAssetId, outputAssetId, selectedSources, availableSources);

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
      // second_quote = quote_single(XOR, output_asset, amount, selected_sources, filter_mode)
      // first_quote = quote_single(input_asset, XOR, second_quote.amount, selected_sources, filter_mode)
      // second_quote_without_impact = quote_without_impact_single(XOR, output_asset, second_quote.best_distribution)
      // ratio_to_actual = second_quote_without_impact / second_quote.amount
      // # multiply all amounts in first distribution to adjust to second quote without impact:
      // first_quote_distribution = second_quote.best_distribution.map(|(source, part_amount)| return (source, part_amount * ratio_to_actual))
      // first_quote_without_impact = quote_without_impact_single(input_asset, XOR, first_quote_distribution )
      // return {
      //   amount: first_quote.amount,
      //   fee: first_quote.fee + second_quote.fee
      //   amount_without_impact:  first_quote_without_impact
      // }
    }
  }
};

// PRICE IMPACT
const xykQuoteWithoutImpact = (
  amount: FPNumber,
  isDesiredInput: boolean,
  inputReserves: CodecString,
  outputReserves: CodecString
) => {
  if ([inputReserves, outputReserves].some(asZeroValue)) {
    return FPNumber.ZERO;
  }

  const fpInputReserves = FPNumber.fromCodecValue(inputReserves);
  const fpOutputReserves = FPNumber.fromCodecValue(outputReserves);

  const fpPrice = fpOutputReserves.div(fpInputReserves);
  const priceWithFee = fpPrice.mul(FP_FEE);

  return isDesiredInput ? amount.mul(priceWithFee) : amount.div(priceWithFee);
};

const tbcQuoteWithoutImpact = (
  inputAssetId: string,
  outputAssetId: string,
  amount: FPNumber,
  isDesiredinput: boolean,
  payload
): FPNumber => {
  if (inputAssetId === XOR) {
    const xorPrice = tbcSellPrice(outputAssetId, amount, isDesiredinput, payload);

    if (isDesiredinput) {
      const feeAmount = TBC_FEE.mul(amount);
      const collateralOut = amount.sub(feeAmount).mul(xorPrice);

      return collateralOut;
    } else {
      const xorIn = amount.div(xorPrice);
      const inputAmountWithFee = xorIn.div(new FPNumber(1).sub(TBC_FEE));

      return inputAmountWithFee;
    }
  } else {
    const xorPrice = tbcBuyPrice(outputAssetId, amount, isDesiredinput, payload);

    if (isDesiredinput) {
      const xorOut = amount.mul(xorPrice);
      const feeAmount = xorOut.mul(TBC_FEE);

      return xorOut.sub(feeAmount);
    } else {
      const outputAmountWithFee = amount.div(new FPNumber(1).sub(TBC_FEE));
      const collateralIn = outputAmountWithFee.mul(xorPrice);

      return collateralIn;
    }
  }
};

const xstQuoteWithoutImpact = ({ inputAssetId, amount, isDesiredInput, payload }) => {
  // no impact already
  const quoteResult = xstQuote({ inputAssetId, amount, isDesiredInput, payload });

  return quoteResult.amount;
};

const quoteWithoutImpactSingle = (
  inputAssetId,
  outputAssetId,
  isDesiredInput,
  distribution: Array<Distribution>,
  payload
) => {
  return distribution.reduce((result, item) => {
    const { market, amount } = item;

    if (market === LiquiditySourceTypes.XYKPool) {
      const [inputReserves, outputReserves] = getXykReserves(inputAssetId, payload);
      const value = xykQuoteWithoutImpact(amount, isDesiredInput, inputReserves, outputReserves);

      return result.add(value);
    }
    if (market === LiquiditySourceTypes.MulticollateralBondingCurvePool) {
      const value = tbcQuoteWithoutImpact(inputAssetId, outputAssetId, amount, isDesiredInput, payload);

      return result.add(value);
    }
    if (market === LiquiditySourceTypes.XSTPool) {
      const value = xstQuoteWithoutImpact({ inputAssetId, amount, isDesiredInput, payload });
      return result.add(value);
    }

    return result;
  }, FPNumber.ZERO);
};
