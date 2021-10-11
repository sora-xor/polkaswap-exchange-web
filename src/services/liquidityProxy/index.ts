import { CodecString, LiquiditySourceTypes, FPNumber, KnownAssets, KnownSymbols } from '@sora-substrate/util';

import { ZeroStringValue } from '@/consts';
import { asZeroValue } from '@/utils';

const XOR = KnownAssets.get(KnownSymbols.XOR);
const PSWAP = KnownAssets.get(KnownSymbols.PSWAP);
const VAL = KnownAssets.get(KnownSymbols.VAL);

const ASSETS_HAS_XYK_POOL = [
  XOR.address,
  PSWAP.address,
  VAL.address,
  '0x0200060000000000000000000000000000000000000000000000000000000000', // DAI
  '0x0200070000000000000000000000000000000000000000000000000000000000', // ETH
];

interface PriceImpactOptions {
  inputAssetReserves: CodecString;
  outputAssetReserves: CodecString;
  amount: CodecString;
  fee: number;
  isDesiredInput: boolean;
}

interface LiquiditySourcePriceImpactOptions extends PriceImpactOptions {
  inputAssetId: string;
  outputAssetId: string;
  liquiditySource: LiquiditySourceTypes | string;
}

// ROUTER
const isDirectExchange = (inputAssetId: string, outputAssetId: string): boolean => {
  return [inputAssetId, outputAssetId].includes(XOR.address);
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

const quoteSingle = (
  inputAssetId: string,
  outputAssetId: string,
  amount: CodecString,
  selectedSources: Array<LiquiditySourceTypes>,
  availableSources: Array<LiquiditySourceTypes>
) => {
  const sources = listLiquiditySources(inputAssetId, outputAssetId, selectedSources, availableSources);

  if (!sources.length) {
    throw new Error("Path doesn't exist");
  }

  if (sources.length === 1) {
    switch (sources[0]) {
      case LiquiditySourceTypes.XYKPool: {
        return xyk_quote(inputAssetId, outputAssetId, amount);
      }
      case LiquiditySourceTypes.MulticollateralBondingCurvePool: {
        return tbc_quote(inputAssetId, outputAssetId, amount);
      }
      case LiquiditySourceTypes.XSTPool: {
        return xst_quote(inputAssetId, outputAssetId, amount);
      }
      default: {
        throw new Error(`Unexpected liquidity source: ${sources[0]}`);
      }
    }
  } else if (sources.length === 2) {
    if (
      sources.includes(LiquiditySourceTypes.MulticollateralBondingCurvePool) &&
      sources.includes(LiquiditySourceTypes.XYKPool)
    ) {
      return smart_split(
        LiquiditySourceTypes.MulticollateralBondingCurvePool,
        LiquiditySourceTypes.XYKPool,
        inputAssetId,
        outputAssetId,
        amount
      );
    } else if (sources.includes(LiquiditySourceTypes.XSTPool) && sources.includes(LiquiditySourceTypes.XYKPool)) {
      return smart_split(
        LiquiditySourceTypes.XSTPool,
        LiquiditySourceTypes.XYKPool,
        inputAssetId,
        outputAssetId,
        amount
      );
    } else {
      throw new Error('Unsupported operation');
    }
  } else {
    throw new Error('Unsupported operation');
  }
};

const quote = (
  inputAssetId: string,
  outputAssetId: string,
  amount: CodecString,
  selectedSources: Array<LiquiditySourceTypes>,
  availableSources: Array<LiquiditySourceTypes>
) => {
  if (isDirectExchange(inputAssetId, outputAssetId)) {
    const result = quoteSingle(inputAssetId, outputAssetId, amount, selectedSources, availableSources);
  } else {
  }
};

// fn quote(input_asset, output_asset, amount, selected_sources, filter_mode)
//   if is_direct_exchange(input_asset, output_asset)
//     result = quote_single(input_asset, output_asset, amount, selected_sources, filter_mode)
//     amount_without_impact = quote_without_impact_single(input_asset, output_asset, result.best_distribution)
//     return {
//       amount: result.amount,
//       fee: result.fee,
//       amount_without_impact
//     }
//   else
//     if amount.is_desired_input()
//       first_quote = quote_single(input_asset, XOR, amount, selected_sources, filter_mode)
//       second_quote = quote_single(XOR, output_asset, first_quote.amount, selected_sources, filter_mode)

//       first_quote_without_impact = quote_without_impact_single(input_asset, XOR, first_quote.best_distribution)
//       ratio_to_actual = first_quote_without_impact / first_quote.amount
//       # multiply all amounts in second distribution to adjust to first quote without impact:
//       second_quote_distribution = second_quote.best_distribution.map(|(source, part_amount)| return (source, part_amount * ratio_to_actual))
//       second_quote_without_impact = quote_without_impact_single(XOR, output_asset, second_quote_distribution )

//       return {
//         amount: second_quote.amount,
//         fee: first_quote.fee + second_quote.fee
//         amount_without_impact: second_quote_without_impact
//       }
//     else
//       second_quote = quote_single(XOR, output_asset, amount, selected_sources, filter_mode)
//       first_quote = quote_single(input_asset, XOR, second_quote.amount, selected_sources, filter_mode)

//       second_quote_without_impact = quote_without_impact_single(XOR, output_asset, second_quote.best_distribution)
//       ratio_to_actual = second_quote_without_impact / second_quote.amount
//       # multiply all amounts in first distribution to adjust to second quote without impact:
//       first_quote_distribution = second_quote.best_distribution.map(|(source, part_amount)| return (source, part_amount * ratio_to_actual))
//       first_quote_without_impact = quote_without_impact_single(input_asset, XOR, first_quote_distribution )

//       return {
//         amount: first_quote.amount,
//         fee: first_quote.fee + second_quote.fee
//         amount_without_impact:  first_quote_without_impact
//       }

// PRICE IMPACT
export const xykQuoteWithoutImpact = (options: PriceImpactOptions) => {
  const { amount, fee, inputAssetReserves, outputAssetReserves, isDesiredInput } = options;

  if ([amount, inputAssetReserves, outputAssetReserves].some(asZeroValue)) {
    return ZeroStringValue;
  }

  const fpAmount = FPNumber.fromCodecValue(amount);
  const fpInputReserves = FPNumber.fromCodecValue(inputAssetReserves);
  const fpOutputReserves = FPNumber.fromCodecValue(outputAssetReserves);

  const fpPrice = fpOutputReserves.div(fpInputReserves);
  const fpFee = new FPNumber(1 - fee);
  const priceWithFee = fpPrice.mul(fpFee);

  const result = isDesiredInput ? fpAmount.mul(priceWithFee) : fpAmount.div(priceWithFee);

  return result.toCodecString();
};

const quoteWithoutImpact = (options: LiquiditySourcePriceImpactOptions) => {
  switch (options.liquiditySource) {
    case LiquiditySourceTypes.XYKPool: {
      return xykQuoteWithoutImpact(options);
    }
    default: {
      return ZeroStringValue;
    }
  }
};
