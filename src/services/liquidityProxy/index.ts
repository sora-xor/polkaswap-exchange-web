// import { CodecString, LiquiditySourceTypes, FPNumber, KnownAssets, KnownSymbols } from '@sora-substrate/util';

// import { ZeroStringValue } from '@/consts';
// import { asZeroValue } from '@/utils';

// const XOR = KnownAssets.get(KnownSymbols.XOR).address;
// const PSWAP = KnownAssets.get(KnownSymbols.PSWAP).address;
// const VAL = KnownAssets.get(KnownSymbols.VAL).address;

// const LP_FEE = new FPNumber(0.003);
// const XST_FEE = new FPNumber(0.007);
// const TBC_FEE = new FPNumber(0.003);

// // TBC
// const INITIAL_PRICE = new FPNumber(634);
// const PRICE_CHANGE_COEFF = new FPNumber(1337);
// const SELL_PRICE_COEFF = new FPNumber(0.8);

// const FP_FEE = new FPNumber(1).sub(LP_FEE);

// const DAI = '0x0200060000000000000000000000000000000000000000000000000000000000';
// const ETH = '0x0200070000000000000000000000000000000000000000000000000000000000';
// const XSTUSD = '0x0200080000000000000000000000000000000000000000000000000000000000';

// const ASSETS_HAS_XYK_POOL = [
//   XOR,
//   PSWAP,
//   VAL,
//   DAI,
//   ETH
// ];

// interface QuoteOptions {
//   amount: CodecString;
// }

// interface XykQuoteOptions extends QuoteOptions {
//   inputReserves: CodecString;
//   outputReserves: CodecString;
// }

// interface XstQuoteOptions extends QuoteOptions{
//   inputAssetId: string;
//   outputAssetId: string;
// }

// interface PriceImpactOptions extends QuoteOptions{
//   isDesiredInput: boolean;
// }

// interface LiquiditySourcePriceImpactOptions extends PriceImpactOptions {
//   liquiditySource: LiquiditySourceTypes | string;
// }

// // TBC quote

// // not XOR?
// const tbcReferencePrice = (assetId, reserves): FPNumber => {
//   if (assetId === DAI) {
//     return new FPNumber(1);
//   } else {
//     return FPNumber.fromCodecValue(reserves.prices[XOR])
//       .div(FPNumber.fromCodecValue(reserves.prices[assetId]));
//   }
// };

// // totalSupply - XOR, XSTUSD total supply
// const tbcBuyFunction = (delta: FPNumber, totalSupply, reserves): FPNumber => {
//   const xstusdIssuance = FPNumber.fromCodecValue(totalSupply[XSTUSD]);
//   const xorIssuance = FPNumber.fromCodecValue(totalSupply[XOR]);
//   const xorPrice = FPNumber.fromCodecValue(reserves.prices[XOR]);
//   const xstXorLiability = xstusdIssuance.div(xorPrice);

//   return (xorIssuance.add(xstXorLiability).add(delta))
//     .div(PRICE_CHANGE_COEFF.add(INITIAL_PRICE));
// };

// const tbcSellFunction = (delta: FPNumber, totalSupply, reserves): FPNumber  => {
//   const buyFunctionResult = tbcBuyFunction(delta, totalSupply, reserves);

//   return  buyFunctionResult.mul(SELL_PRICE_COEFF);
// }

// const idealReservesReferencePrice = (delta: FPNumber, totalSupply, reserves) => {
//   const xorIssuance = FPNumber.fromCodecValue(totalSupply[XOR]);
//   const currentState = tbcBuyFunction(delta, totalSupply, reserves);

//   return (INITIAL_PRICE.add(currentState))
//     .div(new FPNumber(2))
//     .mul(xorIssuance.add(delta));
// };

// const actualReservesReferencePrice = (collateralAssetId, reserves) => {
//   const reserve = FPNumber.fromCodecValue(reserves.tbc[collateralAssetId]);
//   const price = tbcReferencePrice(collateralAssetId, reserves);

//   return reserve.mul(price);
// };

// const mapCollateralizedFractionToPenalty = (fraction: number) => {
//   if (fraction < 0.05) {
//     return 0.09;
//   } else if (fraction >= 0.05 && fraction < 0.1) {
//     return 0.06;
//   } else if (fraction >= 0.1 && fraction < 0.2) {
//     return 0.03;
//   } else if (fraction >= 0.2 && fraction < 0.3) {
//     return 0.01;
//   } else {
//     return 0;
//   }
// };

// const sellPenalty = (collateralAssetId, totalSupply, reserves): FPNumber => {
//   const idealReservesPrice = idealReservesReferencePrice(0, totalSupply, reserves);
//   const collateralReservesPrice = actualReservesReferencePrice(collateralAssetId, reserves);

//   if (collateralReservesPrice.isZero()) {
//     console.warn("Not enough reserves", collateralAssetId);
//   }

//   const collateralizedFraction = collateralReservesPrice.div(idealReservesPrice);
//   const penalty = mapCollateralizedFractionToPenalty(collateralizedFraction.toNumber());

//   return new FPNumber(penalty);
// };

// const tbcSellPrice = (collateralAssetId, amount: FPNumber, isDesiredInput, totalSupply, reserves) => {
//   const collateralSupply = FPNumber.fromCodecValue(reserves.tbc[collateralAssetId]);
//   const xorPrice = tbcSellFunction(0, totalSupply, reserves);
//   const collateralPrice = tbcReferencePrice(collateralAssetId, reserves);
//   const xorSupply = collateralSupply.mul(collateralPrice).div(xorPrice);

//   if (isDesiredInput) {
//     const outputCollateral = (amount.add(collateralSupply)).div((xorSupply.add(amount)));
//     if (FPNumber.isGreaterThan(outputCollateral, collateralSupply)) {
//       console.error("Not enough reserves");
//     }
//     return outputCollateral;
//   } else {
//     if (FPNumber.isGreaterThan(amount, collateralSupply)) {
//       console.error("Not enough reserves");
//     }
//     const outputXor = (xorSupply.mul(amount)).div((collateralSupply.sub(amount)));
//     return outputXor;
//   }
// };

// const tbcBuyPrice = (collateralAssetId, amount: FPNumber, isDesiredInput, totalSupply, reserves) => {
//   const currentState = tbcBuyFunction(FPNumber.ZERO, totalSupply, reserves);
//   const collateralPrice = tbcReferencePrice(collateralAssetId, reserves);

//   if (isDesiredInput) {
//     const collateralReferenceIn = collateralPrice.mul(amount);
//     const underPow = currentState.mul(PRICE_CHANGE_COEFF).mul(new FPNumber(2));
//     const underSqrt = underPow.mul(underPow).add(SELL_PRICE_COEFF.mul(PRICE_CHANGE_COEFF).mul(collateralReferenceIn));
//     const xorOut = underSqrt.sqrt().div(new FPNumber(2)).sub(PRICE_CHANGE_COEFF.mul(currentState));
//     return FPNumber.max(xorOut, FPNumber.ZERO);
//   } else {
//     const newState = tbcBuyFunction(amount, totalSupply, reserves);
//     const collateralReferenceIn = (currentState.add(newState)).div(new FPNumber(2)).mul(amount);
//     const collateralQuantity = collateralReferenceIn.div(collateralPrice);
//     return FPNumber.max(collateralQuantity, FPNumber.ZERO);
//   }
// };

// const tbcSellPriceWithFee = (collateralAssetId, amount: FPNumber, isDesiredInput, totalSupply, reserves) => {
//   const newFee = TBC_FEE.add(sellPenalty(collateralAssetId, totalSupply, reserves));

//   if (isDesiredInput) {
//     const feeAmount = amount.mul(newFee);
//     const outputAmount = tbcSellPrice(collateralAssetId, amount.sub(feeAmount), isDesiredInput, totalSupply, reserves);

//     return {
//       input: amount,
//       output: outputAmount.toCodecString(),
//       fee: feeAmount.toCodecString()
//     };
//   } else {
//     const inputAmount = tbcSellPrice(collateralAssetId, amount, isDesiredInput, totalSupply, reserves);
//     const inputAmountWithFee = inputAmount.div((new FPNumber(1)).sub(newFee));

//     return {
//       input: inputAmountWithFee.toCodecString(),
//       output: amount,
//       fee: inputAmountWithFee.sub(inputAmount).toCodecString()
//     };
//   }
// };

// const tbcBuyPriceWithFee = (collateralAssetId, amount: FPNumber, isDesiredInput, totalSupply, reserves) => {
//   if (isDesiredInput) {
//     const outputAmount = tbcBuyPrice(collateralAssetId, amount, isDesiredInput, totalSupply, reserves);
//     const feeAmount = TBC_FEE.mul(outputAmount);
//     return {
//       input: amount.toCodecString(),
//       ouput: outputAmount.sub(feeAmount).toCodecString(),
//       fee: feeAmount.toCodecString()
//     }
//   } else {
//     const amountWithFee = amount.div((new FPNumber(1)).sub(TBC_FEE));
//     const inputAmount = tbcBuyPrice(collateralAssetId, amountWithFee, isDesiredInput, totalSupply, reserves);
//     return {
//       input: inputAmount.toCodecString(),
//       output: amount.toCodecString(),
//       fee: amountWithFee.sub(amount).toCodecString()
//     }
//   }
// };

// const tbcQuote = ({ inputAssetId, outputAssetId, amount, isDesiredInput, totalSupply, reserves }) => {
//   if (inputAssetId === XOR) {
//     return tbcSellPriceWithFee(outputAssetId, amount, isDesiredInput, totalSupply, reserves);
//   } else {
//     return tbcBuyPriceWithFee(inputAssetId, amount, isDesiredInput, totalSupply, reserves);
//   }
// };

// // XST quote
// const xstReferencePrice = (assetId, reserves): FPNumber => {
//   if (assetId === DAI || assetId === XSTUSD) {
//     return new FPNumber(1);
//   } else {
//     const avgPrice = FPNumber.fromCodecValue(reserves.prices[assetId]);

//     if (assetId === XOR) {
//       return FPNumber.max(avgPrice, new FPNumber(100));
//     }

//     return avgPrice;
//   }
// };

// const xstBuyPrice = (amount: FPNumber, isDesiredInput: boolean, reserves): FPNumber => {
//   const xorPrice = xstReferencePrice(XOR, reserves);

//   if (isDesiredInput) {
//     return amount.div(xorPrice);
//   } else {
//     return amount.mul(xorPrice);
//   }
// };

// const xstSellPrice = (amount: FPNumber, isDesiredInput: boolean, reserves): FPNumber => {
//   const xorPrice = xstReferencePrice(XOR, reserves);

//   if (isDesiredInput) {
//     return amount.mul(xorPrice);
//   } else {
//     return amount.div(xorPrice);
//   }
// };

// const xstBuyPriceWithFee = (amount: CodecString, isDesiredInput: boolean, reserves) => {
//   const fpAmount = FPNumber.fromCodecValue(amount);

//   if (isDesiredInput) {
//     const output = xstBuyPrice(fpAmount, isDesiredInput, reserves);
//     const feeAmount = XST_FEE.mul(output);

//     return {
//       input: amount,
//       output: output.sub(feeAmount).toCodecString(),
//       fee: feeAmount.toCodecString()
//     }
//   } else {
//     const fpFee = (new FPNumber(1)).sub(XST_FEE);
//     const amountWithFee = fpAmount.div(fpFee)
//     const input = xstBuyPrice(amountWithFee, isDesiredInput, reserves);

//     return {
//       input: input.toCodecString(),
//       output: amount,
//       fee: amountWithFee.sub(fpAmount).toCodecString()
//     }
//   }
// };

// const xstSellPriceWithFee = (amount: CodecString, isDesiredInput: boolean, reserves) => {
//   const fpAmount = FPNumber.fromCodecValue(amount);

//   if (isDesiredInput) {
//     const feeAmount = fpAmount.mul(XST_FEE);
//     const output = xstSellPrice(fpAmount.sub(feeAmount), isDesiredInput, reserves);

//     return {
//       input: amount,
//       output: output.toCodecString(),
//       fee: feeAmount.toCodecString()
//     }
//   } else {
//     const inputAmount = xstSellPrice(fpAmount, isDesiredInput, reserves);
//     const inputAmountWithFee = inputAmount.div((new FPNumber(1)).sub(XST_FEE));

//     return {
//       input: inputAmountWithFee.toCodecString(),
//       output: amount,
//       fee: inputAmountWithFee.sub(inputAmount).toCodecString()
//     }
//   }
// };

// const xstQuote = ({ inputAssetId, amount, isDesiredInput, reserves }) => {
//   if (inputAssetId === XOR) {
//     return xstSellPriceWithFee(amount, isDesiredInput, reserves);
//   } else {
//     return xstBuyPriceWithFee(amount, isDesiredInput, reserves);
//   }
// };

// // XYK quote
// const xykQuoteOutput = ({ inputReserves, outputReserves, amount }: XykQuoteOptions) => {
//   const fpInputReserves = FPNumber.fromCodecValue(inputReserves);
//   const fpOutputReserves = FPNumber.fromCodecValue(outputReserves);
//   const fpAmount = FPNumber.fromCodecValue(amount);

//   const fee = LP_FEE.mul(fpAmount);
//   const output = FP_FEE.mul(fpAmount).mul(fpOutputReserves).div(fpInputReserves.add(fpAmount));

//   return {
//     amount: output.toCodecString(),
//     fee: fee.toCodecString(),
//   };
// };

// const xykQuoteInput = ({ inputReserves, outputReserves, amount }: XykQuoteOptions) => {
//   const fpInputReserves = FPNumber.fromCodecValue(inputReserves);
//   const fpOutputReserves = FPNumber.fromCodecValue(outputReserves);
//   const fpAmount = FPNumber.fromCodecValue(amount);

//   const fee = LP_FEE.mul(fpAmount);
//   const input = FP_FEE.mul(fpAmount).mul(fpInputReserves).div(fpOutputReserves.sub(fpAmount));

//   return {
//     amount: input.toCodecString(),
//     fee: fee.toCodecString(),
//   };
// };

// const getXykReserves = (inputAssetId: string, reserves) => {
//   const isXorInput = inputAssetId === XOR;

//   if (!isXorInput) {
//     return [reserves.xyk[0][1], reserves.xyk[0][0]];
//   } else if (reserves.xyk.length === 2) {
//     return [reserves.xyk[1][0], reserves.xyk[1][1]];
//   } else {
//     return [reserves.xyk[0][0], reserves.xyk[0][1]];
//   }
// };

// const xykQuote = (options: XykQuoteOptions, isDesiredInput: boolean) => {
//   if (isDesiredInput) {
//     return xykQuoteOutput(options);
//   } else {
//     return xykQuoteInput(options);
//   }
// };

// // AGGREGATOR
// const quotePrimaryMarket = ({ inputAssetId, outputAssetId, amount, isDesiredInput, totalSupply, reserves }) => {
//   if ([inputAssetId, outputAssetId].includes(XSTUSD)) {
//     return xstQuote({ inputAssetId, amount, isDesiredInput, reserves })
//   } else {
//     return tbcQuote({ inputAssetId, outputAssetId, amount, isDesiredInput, totalSupply, reserves })
//   }
// };

// const primaryMarketAmountBuyingXor = (collateralAssetId, amount: FPNumber, isDesiredInput, xorReserve: CodecString, otherReserve: CodecString, totalSupply, reserves) => {
//   const fpXorReserve = FPNumber.fromCodecValue(xorReserve);
//   const fpOtherReserve = FPNumber.fromCodecValue(otherReserve);

//   const secondaryPrice = FPNumber.isGreaterThan(fpXorReserve, FPNumber.ZERO)
//     ? fpOtherReserve.div(fpXorReserve)
//     : new FPNumber(Infinity);

//   const primaryBuyPrice = collateralAssetId === XSTUSD
//     ? xstBuyPrice(amount, isDesiredInput, reserves)
//     : tbcBuyPrice(collateralAssetId, amount, isDesiredInput, totalSupply, reserves);

//   const k = fpXorReserve.mul(fpOtherReserve);

//   const amountSecondary = isDesiredInput
//     ? ((k.mul(primaryBuyPrice)).sqrt()).sub(fpOtherReserve)
//     : fpXorReserve.sub((k.div(primaryBuyPrice)).sqrt());

//   if (FPNumber.isLessThan(secondaryPrice, primaryBuyPrice)) {
//     if (FPNumber.isGreaterThanOrEqualTo(amountSecondary, amount)) {
//       return FPNumber.ZERO;
//     } else if (FPNumber.isLessThanOrEqualTo(amountSecondary, FPNumber.ZERO)) {
//       return amount;
//     } else {
//       return amount.sub(amountSecondary);
//     }
//   } else {
//     return amount;
//   }
// }

// // ROUTER
// const isDirectExchange = (inputAssetId: string, outputAssetId: string): boolean => {
//   return [inputAssetId, outputAssetId].includes(XOR);
// };

// const listLiquiditySources = (
//   inputAssetId: string,
//   outputAssetId: string,
//   selectedSources: Array<LiquiditySourceTypes>,
//   availableSources: Array<LiquiditySourceTypes>
// ): Array<LiquiditySourceTypes> => {
//   if (selectedSources.length) return selectedSources;

//   const uniqueAddresses = new Set([...ASSETS_HAS_XYK_POOL, inputAssetId, outputAssetId]);
//   const shouldHaveXYK =
//     uniqueAddresses.size === ASSETS_HAS_XYK_POOL.length && !availableSources.includes(LiquiditySourceTypes.XYKPool);
//   const sources = shouldHaveXYK ? [...availableSources, LiquiditySourceTypes.XYKPool] : availableSources;

//   return sources;
// };

// const quoteSingle = (
//   inputAssetId: string,
//   outputAssetId: string,
//   amount: CodecString,
//   isDesiredInput: boolean,
//   sources: Array<LiquiditySourceTypes>,
//   reserves
// ) => {
//   if (!sources.length) {
//     throw new Error("Path doesn't exist");
//   }

//   if (sources.length === 1) {
//     switch (sources[0]) {
//       case LiquiditySourceTypes.XYKPool: {
//         const [inputReserves, outputReserves] = getXykReserves(inputAssetId, reserves);
//         const options: XykQuoteOptions = { inputReserves, outputReserves, amount };

//         return xykQuote(options, isDesiredInput);
//       }
//       case LiquiditySourceTypes.MulticollateralBondingCurvePool: {
//         return tbc_quote(inputAssetId, outputAssetId, amount);
//       }
//       case LiquiditySourceTypes.XSTPool: {
//         return xst_quote(inputAssetId, outputAssetId, amount);
//       }
//       default: {
//         throw new Error(`Unexpected liquidity source: ${sources[0]}`);
//       }
//     }
//   } else if (sources.length === 2) {
//     if (
//       sources.includes(LiquiditySourceTypes.MulticollateralBondingCurvePool) &&
//       sources.includes(LiquiditySourceTypes.XYKPool)
//     ) {
//       return smart_split(
//         LiquiditySourceTypes.MulticollateralBondingCurvePool,
//         LiquiditySourceTypes.XYKPool,
//         inputAssetId,
//         outputAssetId,
//         amount
//       );
//     } else if (sources.includes(LiquiditySourceTypes.XSTPool) && sources.includes(LiquiditySourceTypes.XYKPool)) {
//       return smart_split(
//         LiquiditySourceTypes.XSTPool,
//         LiquiditySourceTypes.XYKPool,
//         inputAssetId,
//         outputAssetId,
//         amount
//       );
//     } else {
//       throw new Error('Unsupported operation');
//     }
//   } else {
//     throw new Error('Unsupported operation');
//   }
// };

// const quote = (
//   inputAssetId: string,
//   outputAssetId: string,
//   amount: CodecString,
//   isDesiredInput: boolean,
//   selectedSources: Array<LiquiditySourceTypes>,
//   availableSources: Array<LiquiditySourceTypes>,
//   reserves
// ) => {
//   const sources = listLiquiditySources(inputAssetId, outputAssetId, selectedSources, availableSources);

//   if (isDirectExchange(inputAssetId, outputAssetId)) {
//     const result = quoteSingle(inputAssetId, outputAssetId, amount, isDesiredInput, sources, reserves);
//   } else {
//   }
// };

// // PRICE IMPACT
// const xykQuoteWithoutImpact = ({ amount, inputReserves, outputReserves, isDesiredInput }: PriceImpactOptions) => {
//   if ([amount, inputReserves, outputReserves].some(asZeroValue)) {
//     return ZeroStringValue;
//   }

//   const fpAmount = FPNumber.fromCodecValue(amount);
//   const fpInputReserves = FPNumber.fromCodecValue(inputReserves);
//   const fpOutputReserves = FPNumber.fromCodecValue(outputReserves);

//   const fpPrice = fpOutputReserves.div(fpInputReserves);
//   const priceWithFee = fpPrice.mul(FP_FEE);

//   const result = isDesiredInput ? fpAmount.mul(priceWithFee) : fpAmount.div(priceWithFee);

//   return result.toCodecString();
// };

// const xstQuoteWithoutImpact = (options: PriceImpactOptions) => {
//   // no impact already
//   return xstQuote(options);
// }

// const quoteWithoutImpactSingle = (options: LiquiditySourcePriceImpactOptions) => {
//   switch (options.liquiditySource) {
//     case LiquiditySourceTypes.XYKPool: {
//       return xykQuoteWithoutImpact(options);
//     }
//     case LiquiditySourceTypes.XSTPool: {
//       return xstQuoteWithoutImpact(options);
//     }
//     default: {
//       return ZeroStringValue;
//     }
//   }
// };
