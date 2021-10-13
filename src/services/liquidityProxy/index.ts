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
// const tbcBuyFunction = (delta, totalSupply, reserves): FPNumber => {
//   const fpDelta = new FPNumber(delta);
//   const xstusdIssuance = FPNumber.fromCodecValue(totalSupply[XSTUSD]);
//   const xorIssuance = FPNumber.fromCodecValue(totalSupply[XOR]);
//   const xorPrice = FPNumber.fromCodecValue(reserves.prices[XOR]);
//   const xstXorLiability = xstusdIssuance.div(xorPrice);

//   return (xorIssuance.add(xstXorLiability).add(fpDelta))
//     .div(PRICE_CHANGE_COEFF.add(INITIAL_PRICE));
// };

// const idealReservesReferencePrice = (delta, totalSupply, reserves) => {
//   const fpDelta = new FPNumber(delta);
//   const xorIssuance = FPNumber.fromCodecValue(totalSupply[XOR]);
//   const currentState = tbcBuyFunction(delta, totalSupply, reserves);

//   return (INITIAL_PRICE.add(currentState))
//     .div(new FPNumber(2))
//     .mul(xorIssuance.add(fpDelta));
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

// const tbcSellPrice = (collateralAssetId, amount: FPNumber) => {
//   //   collateral_supply = free_balance(collateral_asset, reserves_account)
//   //   xor_price = sell_function(0)
//   //   collateral_price = reference_price(collateral_asset)
//   //   xor_supply = collateral_supply * collateral_price / xor_price
//   //   if amount.is_desired_input()
//   //     output_collateral = (amount * collateral_supply) / (xor_supply + amount)
//   //     assert(output_collateral < collateral_supply, "Not enough reserves")
//   //     return output_collateral
//   //   else
//   //     assert(amount < collateral_supply, "Not enough reserves")
//   //     output_xor = (xor_supply * amount) / (collateral_supply - amount)
//   //     return output_xor
// };

// const tbcSellPriceWithFee = (collateralAssetId, amount: CodecString, isDesiredInput, totalSupply, reserves) => {
//   if (isDesiredInput) {
//     const fpAmount = FPNumber.fromCodecValue(amount);
//     const newFee = TBC_FEE.add(sellPenalty(collateralAssetId, totalSupply, reserves));
//     const feeAmount = fpAmount.mul(newFee);
//     const outputAmount = tbcSellPrice(collateralAssetId, fpAmount.sub(feeAmount));

//     return {
//       input: amount,
//       output: outputAmount.toCodecString(),
//       fee: feeAmount.toCodecString()
//     };
//   } else {
//     //   input_amount = sell_price(collateral_asset, amount)
//     //   new_fee = fee + sell_penalty(collateral_asset)
//     //   input_amount_with_fee = input_amount / (1 - new_fee)
//     //   return {
//     //     input: input_amount_with_fee,
//     //     output: amount,
//     //     fee: input_amount_with_fee - input_amount
//     //   }
//   }
// };

// const tbcQuote = ({ inputAssetId, outputAssetId, amount }) => {
//   if (inputAssetId === XOR) {
//     return tbcSellPriceWithFee(output_asset, amount)
//   } else {
//     return tbcBuyPriceWithFee(input_asset, amount)
//   }
// };

// // XST quote
// const xstBuyPrice = (amount: FPNumber, isDesiredInput: boolean, reserves): FPNumber => {
//   const xorPrice = FPNumber.fromCodecValue(reserves.prices[XOR])

//   if (isDesiredInput) {
//     return amount.div(xorPrice);
//   } else {
//     return amount.mul(xorPrice);
//   }
// };

// const xstSellPrice = (amount: FPNumber, isDesiredInput: boolean, reserves): FPNumber => {
//   const xorPrice = FPNumber.fromCodecValue(reserves.prices[XOR]);

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
// const quotePrimaryMarket = ({ inputAssetId, outputAssetId, amount, isDesiredInput, reserves }) => {
//   if ([inputAssetId, outputAssetId].includes(XSTUSD)) {
//     return xstQuote({ inputAssetId, amount, isDesiredInput, reserves })
//   } else {
//     // return tbcQuote(input_asset, output_asset, amount)
//   }
// };

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
