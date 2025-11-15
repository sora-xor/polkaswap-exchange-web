import { FPNumber } from '@sora-substrate/math';
import { LiquiditySourceTypes, Consts, Errors, AssetType } from '../../consts';
import { LiquidityRegistry } from './liquidityRegistry';
import { smartSplit, newSmartSplit } from './smartSplit';
import { listLiquiditySources } from '../dexApi';
import { getChameleonPools } from '../../runtime';

import { intersection, matchType, safeDivide } from '../../utils';

import type {
  QuotePayload,
  QuoteResult,
  QuotePaths,
  QuoteIntermediate,
  SwapResult,
  PrimaryMarketsEnabledAssets,
  PathsAndPairLiquiditySources,
} from '../../types';

class PathBuilder {
  public paths!: string[][];
  public inputAssetId!: string;
  public outputAssetId!: string;
  public baseAssetId!: string;
  public syntheticBaseAssetId!: string;
  public baseChameleonAssetId!: string | null;

  constructor(
    inputAssetId: string,
    outputAssetId: string,
    baseAssetId: string,
    syntheticBaseAssetId: string,
    baseChameleonAssetId: string | null
  ) {
    this.paths = [];
    this.inputAssetId = inputAssetId;
    this.outputAssetId = outputAssetId;
    this.baseAssetId = baseAssetId;
    this.syntheticBaseAssetId = syntheticBaseAssetId;
    this.baseChameleonAssetId = baseChameleonAssetId;
  }

  public direct() {
    this.paths.push([this.inputAssetId, this.outputAssetId]);
    return this;
  }

  public viaBase() {
    this.paths.push([this.inputAssetId, this.baseAssetId, this.outputAssetId]);
    return this;
  }

  public viaSyntheticBase() {
    this.paths.push([this.inputAssetId, this.syntheticBaseAssetId, this.outputAssetId]);
    return this;
  }

  public viaBaseAndSyntheticBase() {
    this.paths.push([this.inputAssetId, this.baseAssetId, this.syntheticBaseAssetId, this.outputAssetId]);
    return this;
  }

  public viaSyntheticBaseAndBase() {
    this.paths.push([this.inputAssetId, this.syntheticBaseAssetId, this.baseAssetId, this.outputAssetId]);
    return this;
  }

  public viaBaseChameleon() {
    if (this.baseChameleonAssetId) {
      this.paths.push([this.inputAssetId, this.baseChameleonAssetId, this.outputAssetId]);
    }
    return this;
  }

  public viaBaseAndBaseChameleon() {
    if (this.baseChameleonAssetId) {
      this.paths.push([this.inputAssetId, this.baseAssetId, this.baseChameleonAssetId, this.outputAssetId]);
    }
    return this;
  }

  public viaBaseChameleonAndBase() {
    if (this.baseChameleonAssetId) {
      this.paths.push([this.inputAssetId, this.baseChameleonAssetId, this.baseAssetId, this.outputAssetId]);
    }
    return this;
  }

  public viaBaseChameleonAndBaseAndSyntheticBase() {
    if (this.baseChameleonAssetId) {
      this.paths.push([
        this.inputAssetId,
        this.baseChameleonAssetId,
        this.baseAssetId,
        this.syntheticBaseAssetId,
        this.outputAssetId,
      ]);
    }
    return this;
  }

  public viaSyntheticBaseAndBaseAndBaseChameleon() {
    if (this.baseChameleonAssetId) {
      this.paths.push([
        this.inputAssetId,
        this.syntheticBaseAssetId,
        this.baseAssetId,
        this.baseChameleonAssetId,
        this.outputAssetId,
      ]);
    }
    return this;
  }
}

/**
 * Get asset type in terms of exchange nature
 * @param baseAssetId Dex base asset id
 * @param syntheticBaseAssetId Dex synthetic base asset id
 * @param syntheticAssets collateral synthetic assets
 * @param assetId asset to determine
 */
const determine = (
  baseAssetId: string,
  syntheticBaseAssetId: string,
  syntheticAssets: string[],
  assetId: string
): AssetType => {
  const [baseChameleonAssetId, chameleonTargets] = getChameleonPools(baseAssetId);

  if (assetId === baseAssetId) {
    return AssetType.Base;
  } else if (assetId === syntheticBaseAssetId) {
    return AssetType.SyntheticBase;
  } else if (syntheticAssets.includes(assetId)) {
    return AssetType.Synthetic;
  } else if (baseChameleonAssetId) {
    if (assetId === baseChameleonAssetId) {
      return AssetType.ChameleonBase;
    } else if (chameleonTargets.includes(assetId)) {
      return AssetType.ChameleonPoolAsset;
    } else {
      return AssetType.Basic;
    }
  } else {
    return AssetType.Basic;
  }
};

/**
 * Get possible exchange routes between two assets
 * @param baseAssetId Dex base asset id
 * @param syntheticBaseAssetId Dex synthetic base asset id
 * @param syntheticAssets collateral synthetic assets
 * @param inputAssetId input asset id
 * @param outputAssetId output asset id
 */
export const newTrivial = (
  baseAssetId: string,
  syntheticBaseAssetId: string,
  syntheticAssets: string[],
  inputAssetId: string,
  outputAssetId: string
) => {
  if (inputAssetId === outputAssetId) return [];

  const iType = determine(baseAssetId, syntheticBaseAssetId, syntheticAssets, inputAssetId);
  const oType = determine(baseAssetId, syntheticBaseAssetId, syntheticAssets, outputAssetId);
  const [baseChameleonAssetId] = getChameleonPools(baseAssetId);

  const pathBuilder = new PathBuilder(
    inputAssetId,
    outputAssetId,
    baseAssetId,
    syntheticBaseAssetId,
    baseChameleonAssetId
  );

  if (
    matchType(iType, oType)(AssetType.Base, AssetType.Basic, true) ||
    matchType(iType, oType)(AssetType.Base, AssetType.SyntheticBase, true) ||
    matchType(iType, oType)(AssetType.Base, AssetType.ChameleonBase, true)
  ) {
    pathBuilder.direct();
  } else if (matchType(iType, oType)(AssetType.SyntheticBase, AssetType.Synthetic, true)) {
    pathBuilder.direct().viaBase();
  } else if (
    matchType(iType, oType)(AssetType.Basic, AssetType.Basic) ||
    matchType(iType, oType)(AssetType.SyntheticBase, AssetType.Basic, true) ||
    matchType(iType, oType)(AssetType.ChameleonBase, AssetType.SyntheticBase, true) ||
    matchType(iType, oType)(AssetType.Basic, AssetType.ChameleonBase, true)
  ) {
    pathBuilder.viaBase();
  } else if (matchType(iType, oType)(AssetType.Synthetic, AssetType.Synthetic)) {
    pathBuilder.viaSyntheticBase().viaBase();
  } else if (matchType(iType, oType)(AssetType.Base, AssetType.Synthetic, true)) {
    pathBuilder.direct().viaSyntheticBase();
  } else if (
    matchType(iType, oType)(AssetType.Basic, AssetType.Synthetic) ||
    matchType(iType, oType)(AssetType.ChameleonBase, AssetType.Synthetic)
  ) {
    pathBuilder.viaBase().viaBaseAndSyntheticBase();
  } else if (
    matchType(iType, oType)(AssetType.Synthetic, AssetType.Basic) ||
    matchType(iType, oType)(AssetType.Synthetic, AssetType.ChameleonBase)
  ) {
    pathBuilder.viaBase().viaSyntheticBaseAndBase();
  } else if (matchType(iType, oType)(AssetType.ChameleonPoolAsset, AssetType.ChameleonBase, true)) {
    pathBuilder.direct().viaBase();
  } else if (matchType(iType, oType)(AssetType.Base, AssetType.ChameleonPoolAsset, true)) {
    pathBuilder.direct().viaBaseChameleon();
  } else if (
    matchType(iType, oType)(AssetType.SyntheticBase, AssetType.ChameleonPoolAsset) ||
    matchType(iType, oType)(AssetType.Basic, AssetType.ChameleonPoolAsset) // VAL - ETH
  ) {
    pathBuilder.viaBase().viaBaseAndBaseChameleon();
  } else if (
    matchType(iType, oType)(AssetType.ChameleonPoolAsset, AssetType.SyntheticBase) ||
    matchType(iType, oType)(AssetType.ChameleonPoolAsset, AssetType.Basic)
  ) {
    pathBuilder.viaBase().viaBaseChameleonAndBase();
  } else if (matchType(iType, oType)(AssetType.Synthetic, AssetType.ChameleonPoolAsset)) {
    pathBuilder.viaBase().viaSyntheticBaseAndBase().viaBaseAndBaseChameleon().viaSyntheticBaseAndBaseAndBaseChameleon();
  } else if (matchType(iType, oType)(AssetType.ChameleonPoolAsset, AssetType.Synthetic)) {
    pathBuilder.viaBase().viaBaseAndSyntheticBase().viaBaseChameleonAndBase().viaBaseChameleonAndBaseAndSyntheticBase();
  } else if (matchType(iType, oType)(AssetType.ChameleonPoolAsset, AssetType.ChameleonPoolAsset)) {
    pathBuilder.viaBase().viaBaseChameleonAndBase().viaBaseAndBaseChameleon();
  } else if (
    matchType(iType, oType)(AssetType.Base, AssetType.Base) ||
    matchType(iType, oType)(AssetType.SyntheticBase, AssetType.SyntheticBase) ||
    matchType(iType, oType)(AssetType.ChameleonBase, AssetType.ChameleonBase)
  ) {
    pathBuilder;
  }

  return pathBuilder.paths;
};

/**
 * Get available list of liquidity sources for the selected asset
 * @param baseAssetId Dex base asset id
 * @param syntheticBaseAssetId Dex synthetic base asset id
 * @param address Asset ID
 * @param enabledAssets Primary markets enabled assets
 * @param xykReserves Xyk reserves of assets in exchange paths
 * @param orderBookReserves Order Book reserves of assets in exchange paths
 *
 */
const getAssetLiquiditySources = (
  baseAssetId: string,
  syntheticBaseAssetId: string,
  address: string,
  enabledAssets: PrimaryMarketsEnabledAssets,
  xykReserves: QuotePayload['reserves']['xyk'],
  orderBookReserves: QuotePayload['reserves']['orderBook']
): Array<LiquiditySourceTypes> => {
  const [baseChameleonAssetId] = getChameleonPools(baseAssetId);

  const rules = {
    [LiquiditySourceTypes.XYKPool]: () =>
      baseAssetId === address || baseChameleonAssetId === address || !!xykReserves[address],
    [LiquiditySourceTypes.MulticollateralBondingCurvePool]: () =>
      baseAssetId === Consts.XOR && [...enabledAssets.tbc, Consts.XOR].includes(address),
    [LiquiditySourceTypes.XSTPool]: () =>
      baseAssetId === Consts.XOR && (address === syntheticBaseAssetId || !!enabledAssets.xst[address]),
    [LiquiditySourceTypes.OrderBook]: () =>
      (baseAssetId === Consts.XOR || baseAssetId === Consts.KUSD) &&
      (address === baseAssetId || !!orderBookReserves[address]),
  };

  return Object.entries(rules).reduce((acc: LiquiditySourceTypes[], [source, rule]) => {
    if (rule()) {
      acc.push(source as LiquiditySourceTypes);
    }
    return acc;
  }, []);
};

/**
 * Get available liquidity sources for the assets exchange paths
 * @param baseAssetId Dex base asset id
 * @param syntheticBaseAssetId Dex synthetic base asset id
 * @param exchangePaths Assets exchange paths
 * @param enabledAssets Primary markets enabled assets
 * @param xykReserves Xyk reserves of assets in exchange paths
 * @param orderBookReserves Order Book reserves of assets in exchange paths
 */
export const getAssetsLiquiditySources = (
  baseAssetId: string,
  syntheticBaseAssetId: string,
  exchangePaths: string[][],
  enabledAssets: PrimaryMarketsEnabledAssets,
  xykReserves: QuotePayload['reserves']['xyk'],
  orderBookReserves: QuotePayload['reserves']['orderBook']
): PathsAndPairLiquiditySources => {
  const assetPaths: QuotePaths = {};
  let liquiditySources: Array<LiquiditySourceTypes> = [];

  for (const exchangePath of exchangePaths) {
    let exchangePathSources: Array<LiquiditySourceTypes> = [];

    exchangePath.forEach((asset, index) => {
      const assetSources = (assetPaths[asset] =
        assetPaths[asset] ||
        getAssetLiquiditySources(
          baseAssetId,
          syntheticBaseAssetId,
          asset,
          enabledAssets,
          xykReserves,
          orderBookReserves
        ));

      exchangePathSources = index === 0 ? assetSources : intersection(exchangePathSources, assetSources);
    });

    liquiditySources = [...new Set([...liquiditySources, ...exchangePathSources])];
  }

  const isAvailable = !!Object.keys(assetPaths).length && Object.values(assetPaths).every((paths) => !!paths.length);

  return { isAvailable, liquiditySources };
};

/**
 * Computes the optimal distribution across available liquidity sources to exectute the requested trade
 * given the input and output assets, the trade amount and a liquidity sources filter.
 */
// prettier-ignore
const quoteSingle = (
  baseAssetId: string,
  syntheticBaseAssetId: string,
  inputAsset: string,
  outputAsset: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  selectedSources: Array<LiquiditySourceTypes>,
  payload: QuotePayload,
  deduceFee: boolean,
  isALT = false,
): QuoteResult => { // NOSONAR
  let sources = listLiquiditySources(
    baseAssetId,
    syntheticBaseAssetId,
    inputAsset,
    outputAsset,
    selectedSources,
    payload
  );

  if (!sources.length) {
    throw new Error(Errors.UnavailableExchangePath);
  }

  // The temp solution is to exclude OrderBook source if there are multiple sources.
  // Will be removed in ALT implementation
  if (!isALT && sources.length > 1) {
    sources = sources.filter((source) => source !== LiquiditySourceTypes.OrderBook);
  }

  if (sources.length === 1) {
    const {
      amount: resultAmount,
      fee,
      distribution,
    } = LiquidityRegistry.quote(sources[0])(
      baseAssetId,
      syntheticBaseAssetId,
      inputAsset,
      outputAsset,
      amount,
      isDesiredInput,
      payload,
      deduceFee
    );
    const [inputAmount, outputAmount] = isDesiredInput ? [amount, resultAmount] : [resultAmount, amount];
    const rewards = LiquidityRegistry.checkRewards(sources[0])(
      baseAssetId,
      syntheticBaseAssetId,
      inputAsset,
      outputAsset,
      inputAmount,
      outputAmount,
      payload
    );

    return {
      amount: resultAmount,
      fee,
      distribution,
      rewards,
    };
  }

  if (!isALT) {
    if (sources.length === 2) {
      if (
        sources.includes(LiquiditySourceTypes.XYKPool) &&
        // We can't use XST as primary market for smart split, because it use XST asset as base
        sources.includes(LiquiditySourceTypes.MulticollateralBondingCurvePool)
      ) {
        return smartSplit(baseAssetId, syntheticBaseAssetId, inputAsset, outputAsset, amount, isDesiredInput, payload, deduceFee);
      }
    }
  
    throw new Error('[liquidityProxy] Unsupported operation');
  } else {
    return newSmartSplit(
      baseAssetId,
      syntheticBaseAssetId,
      sources,
      inputAsset,
      outputAsset,
      amount,
      isDesiredInput,
      payload,
      deduceFee
    );
  }
};

// prettier-ignore
export const quote = (
  firstAssetAddress: string,
  secondAssetAddress: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  selectedSources: Array<LiquiditySourceTypes>,
  payload: QuotePayload,
  deduceFee: boolean,
  baseAssetId = Consts.XOR,
  syntheticBaseAssetId = Consts.XST,
  isALT = false,
): SwapResult => { // NOSONAR
  let bestQuote: QuoteIntermediate = {
    amount: FPNumber.ZERO,
    amountWithoutImpact: FPNumber.ZERO,
    fee: FPNumber.ZERO,
    rewards: [],
    route: [],
    distribution: [],
  };

  // directed exchange paths
  const exchangePaths = newTrivial(
    baseAssetId,
    syntheticBaseAssetId,
    Object.keys(payload.enabledAssets.xst),
    firstAssetAddress,
    secondAssetAddress
  );

  const results = exchangePaths.map((exchangePath) => {
    // if isDesiredInput = false, we compute the swaps from output asset to input asset
    const directedPath = isDesiredInput ? exchangePath : exchangePath.slice().reverse();

    try {
      const result = directedPath.reduce<QuoteIntermediate>(
        (buffer, currentAsset) => {
          if (buffer.amount.isZero()) {
            throw new Error('[liquidityProxy]: zero amount received while processing exchange path');
          }

          const { route } = buffer;

          if (route.length) {
            const prevAsset = route[route.length - 1];
            const [assetA, assetB] = isDesiredInput ? [prevAsset, currentAsset] : [currentAsset, prevAsset];

            const result = quoteSingle(
              baseAssetId,
              syntheticBaseAssetId,
              assetA,
              assetB,
              buffer.amount,
              isDesiredInput,
              selectedSources,
              payload,
              deduceFee,
              isALT,
            );

            const ratioToActual =
              buffer.amount.isZero() || buffer.amountWithoutImpact.isZero()
                ? FPNumber.ONE
                : safeDivide(buffer.amountWithoutImpact, buffer.amount);

            // multiply all amounts in distribution to adjust prev quote without impact:
            const distributionAmounts = result.distribution.map(({ market, income, outcome }) => ({
              market,
              amount: (isDesiredInput ? income : outcome).mul(ratioToActual),
            }));

            const amountWithoutImpact = quoteWithoutImpactSingle(
              baseAssetId,
              syntheticBaseAssetId,
              assetA,
              assetB,
              isDesiredInput,
              distributionAmounts,
              payload,
              deduceFee,
            );

            buffer.amount = result.amount;
            buffer.amountWithoutImpact = amountWithoutImpact;
            buffer.fee = buffer.fee.add(result.fee);
            buffer.rewards.push(...result.rewards);

            if (isDesiredInput) {
              buffer.distribution.push(result.distribution);
            } else {
              buffer.distribution.unshift(result.distribution);
            }
          }

          buffer.route.push(currentAsset);

          return buffer;
        },
        {
          amount,
          amountWithoutImpact: FPNumber.ZERO,
          fee: FPNumber.ZERO,
          rewards: [],
          route: [],
          distribution: [],
        }
      );

      return {
        ...result,
        // return real exchange route
        route: exchangePath,
      };
    } catch (error) {
      return {
        ...bestQuote,
        // return real exchange route
        route: exchangePath,
      };
    }
  });

  for (const result of results) {
    const currentAmount = result.amount;
    const bestAmount = bestQuote.amount;

    if (currentAmount.isZero()) continue;

    if (
      (FPNumber.isLessThan(bestAmount, currentAmount) && isDesiredInput) ||
      (FPNumber.isLessThan(currentAmount, bestAmount) && !isDesiredInput) ||
      bestAmount.isZero()
    ) {
      bestQuote = result;
    }
  }

  return {
    amount: bestQuote.amount.toCodecString(),
    amountWithoutImpact: bestQuote.amountWithoutImpact.toCodecString(),
    fee: bestQuote.fee.toCodecString(),
    rewards: bestQuote.rewards,
    route: bestQuote.route,
    distribution: bestQuote.distribution,
  };
};

const quoteWithoutImpactSingle = (
  baseAssetId: string,
  syntheticBaseAssetId: string,
  inputAsset: string,
  outputAsset: string,
  isDesiredInput: boolean,
  distribution: Array<{ market: LiquiditySourceTypes; amount: FPNumber }>,
  payload: QuotePayload,
  deduceFee: boolean
): FPNumber => {
  return distribution.reduce((result, { market, amount }) => {
    const value = LiquidityRegistry.quoteWithoutImpact(market)(
      baseAssetId,
      syntheticBaseAssetId,
      inputAsset,
      outputAsset,
      amount,
      isDesiredInput,
      payload,
      deduceFee
    );

    return result.add(value);
  }, FPNumber.ZERO);
};
