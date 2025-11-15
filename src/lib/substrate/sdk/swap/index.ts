import { assert } from '@polkadot/util';
import { combineLatest, map, distinctUntilChanged, Observable } from 'rxjs';
import { NumberLike, FPNumber, CodecString } from '@sora-substrate/math';
import {
  quote,
  LiquiditySourceTypes,
  PriceVariant,
  newTrivial,
  getAssetsLiquiditySources,
  getChameleonPools,
} from '@sora-substrate/liquidity-proxy';
import type {
  PrimaryMarketsEnabledAssets,
  QuotePayload,
  SwapResult,
  SwapQuote,
  OracleRate,
  OrderBookAggregated,
  LPRewardsInfo,
  LiquidityProviderFee,
} from '@sora-substrate/liquidity-proxy';
import type { Balance, LPSwapOutcomeInfo, LiquiditySourceType } from '@sora-substrate/types';
import { Codec } from '@polkadot/types/types';
import type {
  CommonPrimitivesAssetId32,
  FixnumFixedPoint,
  PriceToolsAggregatedPriceInfo,
  BandBandRate,
} from '@polkadot/types/lookup';
import type { Option, BTreeSet } from '@polkadot/types';

import { Consts as SwapConsts } from './consts';
import { toAssetId } from '../assets';
import { XOR, DAI, XSTUSD } from '../assets/consts';
import { DexId } from '../dex/consts';
import { Messages } from '../logger';
import { poolAccountIdFromAssetPair } from '../poolXyk/account';
import { Operation } from '../types';
import { Api } from '../api';
import type { AccountAsset, Asset } from '../assets/types';
import type { SwapTransferBatchData, SwapTransferBatchAdditionalData, SwapQuoteData, FilterMode } from './types';

interface SwapResultWithDexId extends SwapResult {
  dexId: DexId;
}

type SwapResultWithDexIdV2 = Omit<SwapResultWithDexId, 'fee'> & { fee: LiquidityProviderFee[] };

type AnyBalance = NumberLike | Codec | Balance;

const toFP = (value: AnyBalance, decimals = XOR.decimals) => new FPNumber(value, decimals);
const toParamCodecString = (value: AnyBalance, assetA: Asset, assetB: Asset, isExchangeB: boolean) =>
  new FPNumber(value, (!isExchangeB ? assetB : assetA).decimals).toCodecString();

const comparator = <T>(prev: T, curr: T): boolean => JSON.stringify(prev) === JSON.stringify(curr);

const fromCodecToAssetId = (o: Observable<CommonPrimitivesAssetId32>): Observable<string> =>
  o.pipe(
    map((asset) => toAssetId(asset)),
    distinctUntilChanged(comparator)
  );

const toCodec = (o: Observable<any>) =>
  o.pipe(
    map((codec) => {
      return Array.isArray(codec) ? codec.map((item) => item.toString()) : codec.toString();
    }),
    distinctUntilChanged(comparator)
  );

const fromFixnumToCodec = (o: Observable<FixnumFixedPoint>) =>
  o.pipe(
    map((codec) => codec.inner.toString()),
    distinctUntilChanged(comparator)
  );

const toAveragePrice = (o: Observable<Option<PriceToolsAggregatedPriceInfo>>) =>
  o.pipe(
    map((codec) => ({
      [PriceVariant.Buy]: codec.value.buy.averagePrice.toString(),
      [PriceVariant.Sell]: codec.value.sell.averagePrice.toString(),
    })),
    distinctUntilChanged(comparator)
  );

const toBandRate = (o: Observable<Option<BandBandRate>>): Observable<OracleRate> =>
  o.pipe(
    map((codec) => {
      const data = codec.unwrap();
      const value = data.value.toString();
      const lastUpdated = data.lastUpdated.toNumber();
      const dynamicFee = data.dynamicFee.inner.toString();

      return { value, lastUpdated, dynamicFee };
    }),
    distinctUntilChanged(comparator)
  );

const toAssetIds = (data: BTreeSet<CommonPrimitivesAssetId32>): string[] =>
  [...data.values()].map((asset) => toAssetId(asset));

const getAssetAveragePrice = <T>(
  assetAddress: string,
  root: Api<T>
): Observable<{ [PriceVariant.Buy]: string; [PriceVariant.Sell]: string }> => {
  return toAveragePrice(root.apiRx.query.priceTools.priceInfos(assetAddress));
};

const toPoolReserves = <T>(
  baseAssetId: string,
  targetAssetId: string,
  root: Api<T>
): Observable<{ base: string; target: string; chameleon: string }> => {
  const observablePoolReserves = root.apiRx.query.poolXYK.reserves(baseAssetId, targetAssetId).pipe(
    map((reserves) => {
      return {
        base: reserves[0].toString(),
        target: reserves[1].toString(),
      };
    })
  );

  let observableChameleonReserve!: Observable<string>;

  const [baseChameleonAssetId, chameleonTargets] = getChameleonPools(baseAssetId);

  if (baseChameleonAssetId && chameleonTargets.includes(targetAssetId)) {
    const poolAccountId = poolAccountIdFromAssetPair(root, baseAssetId, targetAssetId).toString();

    observableChameleonReserve = root.assets.subscribeOnAssetTransferableBalance(baseChameleonAssetId, poolAccountId);
  } else {
    observableChameleonReserve = new Observable((subscriber) => subscriber.next('0'));
  }

  return combineLatest([observablePoolReserves, observableChameleonReserve]).pipe(
    map(([reserves, chameleonReserve]) => {
      return {
        base: FPNumber.fromCodecValue(reserves.base).sub(FPNumber.fromCodecValue(chameleonReserve)).toCodecString(),
        target: reserves.target,
        chameleon: chameleonReserve,
      };
    }),
    distinctUntilChanged(comparator)
  );
};

const getAggregatedOrderBook = <T>(
  assetAddress: string,
  baseAssetId: string,
  root: Api<T>
): Observable<OrderBookAggregated | null> => {
  return combineLatest([
    root.orderBook.getOrderBookObservable(assetAddress, baseAssetId),
    root.orderBook.subscribeOnAggregatedAsks(assetAddress, baseAssetId),
    root.orderBook.subscribeOnAggregatedBids(assetAddress, baseAssetId),
  ]).pipe(
    map(([book, asks, bids]) => {
      if (!book) return null;

      return {
        ...book,
        aggregated: {
          asks,
          bids,
        },
      };
    }),
    distinctUntilChanged(comparator)
  );
};

const combineValuesWithKeys = <T>(values: Array<T>, keys: Array<string>): { [key: string]: T } =>
  values.reduce(
    (result, value, index) => ({
      ...result,
      [keys[index]]: value,
    }),
    {}
  );

type DexSwapResult = SwapResult;
type DexesSwapResults = Record<number, DexSwapResult>;

export const getBestResult = (isExchangeB: boolean, results: DexesSwapResults) => {
  let bestDexId: number = DexId.XOR;

  for (const currentDexId in results) {
    const currAmount = FPNumber.fromCodecValue(results[currentDexId].amount);
    const bestAmount = FPNumber.fromCodecValue(results[bestDexId].amount);

    if (currAmount.isZero()) continue;

    if (
      (FPNumber.isLessThan(currAmount, bestAmount) && isExchangeB) ||
      (FPNumber.isLessThan(bestAmount, currAmount) && !isExchangeB)
    ) {
      bestDexId = +currentDexId;
    }
  }

  return {
    dexId: bestDexId,
    result: results[bestDexId],
  };
};

const emptySwapResult = { amount: 0, fee: [], rewards: [], amountWithoutImpact: 0, route: [] };

export class SwapModule<T> {
  public enabledAssets!: PrimaryMarketsEnabledAssets;

  public isALT = false;

  constructor(private readonly root: Api<T>) {}

  public async update(): Promise<void> {
    this.enabledAssets = await this.getPrimaryMarketsEnabledAssets();
  }

  private prepareSourcesForSwapParams(liquiditySource: LiquiditySourceTypes): Array<LiquiditySourceTypes> {
    return liquiditySource ? [liquiditySource] : [];
  }

  /**
   * Get min or max value before Swap
   * @param tokenFrom Asset A address
   * @param tokenTo Asset B address
   * @param fromValue Asset A value
   * @param toValue Asset B value
   * @param isExchangeB If `isExchangeB` then Exchange B and it calculates max sold,
   * else - Exchange A and it calculates min received
   * @param slippageTolerance
   */
  public getMinMaxValue(
    tokenFrom: Asset | AccountAsset,
    tokenTo: Asset | AccountAsset,
    fromValue: string,
    toValue: string,
    isExchangeB: boolean,
    slippageTolerance: NumberLike
  ): CodecString {
    const value = isExchangeB ? fromValue : toValue;
    const token = isExchangeB ? tokenFrom : tokenTo;

    if (!token || !value) return SwapConsts.ZERO_STR;

    const resultDecimals = token.decimals;
    const result = new FPNumber(value, resultDecimals);
    const resultMulSlippage = result.mul(new FPNumber(Number(slippageTolerance) / 100, resultDecimals));

    return (!isExchangeB ? result.sub(resultMulSlippage) : result.add(resultMulSlippage)).toCodecString();
  }

  /**
   * Get price impact
   * @param tokenFrom Asset A address
   * @param tokenTo Asset B address
   * @param fromValue Asset A value
   * @param toValue Asset B value
   * @param amountWithoutImpact Amount without impact
   * @param isExchangeB
   */
  public getPriceImpact(
    tokenFrom: Asset | AccountAsset,
    tokenTo: Asset | AccountAsset,
    fromValue: string,
    toValue: string,
    amountWithoutImpact: CodecString,
    isExchangeB: boolean
  ): string {
    const token = isExchangeB ? tokenFrom : tokenTo;
    const value = isExchangeB ? fromValue : toValue;

    if (!token || !value || !amountWithoutImpact) return SwapConsts.ZERO_STR;

    const withoutImpact = FPNumber.fromCodecValue(amountWithoutImpact, token.decimals);

    if (withoutImpact.isZero()) return SwapConsts.ZERO_STR;

    const amount = new FPNumber(value, token.decimals);
    const impact = isExchangeB ? withoutImpact.div(amount) : amount.div(withoutImpact);
    const result = FPNumber.ONE.sub(impact).mul(FPNumber.HUNDRED);

    return FPNumber.lte(result, FPNumber.ZERO) ? SwapConsts.ZERO_STR : FPNumber.ZERO.sub(result).toFixed(2);
  }

  /**
   * Get swap result
   * @param assetAAddress Asset A address
   * @param assetBAddress Asset B address
   * @param value value (Asset A if Exchange A, else - Asset B)
   * @param isExchangeB Exchange A if `isExchangeB=false` else Exchange B
   * @param selectedSources Selected liquidity sources
   * @param payload Quote payload
   */
  // prettier-ignore
  public getResult( // NOSONAR
    assetAAddress: string,
    assetBAddress: string,
    value: NumberLike,
    isExchangeB: boolean,
    payload: QuotePayload,
    selectedSources: Array<LiquiditySourceTypes> = [],
    dexId = DexId.XOR,
    deduceFee = true
  ): SwapResult {
    const amount = new FPNumber(value);
    const baseAssetId = this.root.dex.getBaseAssetId(dexId);
    const syntheticBaseAssetId = this.root.dex.getSyntheticBaseAssetId(dexId);

    return quote(
      assetAAddress,
      assetBAddress,
      amount,
      !isExchangeB,
      selectedSources,
      payload,
      deduceFee,
      baseAssetId,
      syntheticBaseAssetId,
      this.isALT,
    );
  }

  public async getTbcAssets(): Promise<string[]> {
    const assets = await this.root.api.query.multicollateralBondingCurvePool.enabledTargets();
    return toAssetIds(assets);
  }

  public async getXstAssets(): Promise<Record<string, { referenceSymbol: string; feeRatio: FPNumber }>> {
    const entries = await this.root.api.query.xstPool.enabledSynthetics.entries();

    return entries.reduce<Record<string, { referenceSymbol: string; feeRatio: FPNumber }>>((buffer, [key, value]) => {
      const id = toAssetId(key.args[0]);
      const data = value.unwrap();
      const referenceSymbol = new TextDecoder().decode(data.referenceSymbol);
      const feeRatio = FPNumber.fromCodecValue(data.feeRatio.inner.toString());

      buffer[id] = {
        referenceSymbol,
        feeRatio,
      };

      return buffer;
    }, {});
  }

  /**
   * Get primary markets enabled assets observable
   */
  public async getPrimaryMarketsEnabledAssets(): Promise<PrimaryMarketsEnabledAssets> {
    const [tbc, xst] = await Promise.all([this.getTbcAssets(), this.getXstAssets()]);

    return {
      tbc,
      xst,
    };
  }

  /**
   * Get observable reserves for swapped tokens
   * @param firstAssetAddress Asset A address
   * @param secondAssetAddress Asset B address
   * @param selectedSources Selected liquidity sources
   * @param dexId Selected dex id for swap
   */
  // prettier-ignore
  public subscribeOnReserves( // NOSONAR
    firstAssetAddress: string,
    secondAssetAddress: string,
    selectedSources: LiquiditySourceTypes[] = [],
    dexId = DexId.XOR
  ): Observable<QuotePayload> | null {
    const isXorDex = dexId === DexId.XOR;
    const isKusdDex = dexId === DexId.KUSD;
    const isVxorDex = dexId === DexId.VXOR;
    const xor = XOR.address;
    const dai = DAI.address;
    const xstusd = XSTUSD.address;
    const baseAssetId = this.root.dex.getBaseAssetId(dexId);
    const syntheticBaseAssetId = this.root.dex.getSyntheticBaseAssetId(dexId);
    const enabledSources = [...this.root.dex.enabledSources];
    const lockedSources = [...this.root.dex.lockedSources];
    const enabledAssets = isXorDex ? { ...this.enabledAssets } : { tbc: [], xst: {} };

    const tbcAssets = enabledAssets?.tbc ?? [];
    const xstAssets = enabledAssets?.xst ?? {};

    const isSourceUsed = (source: LiquiditySourceTypes): boolean =>
      enabledSources.includes(source) && (!selectedSources.length || selectedSources.includes(source));

    // is [XYK, TBC, XST, OrderBook] sources used
    const xykUsed = isSourceUsed(LiquiditySourceTypes.XYKPool);
    const tbcUsed = isXorDex && isSourceUsed(LiquiditySourceTypes.MulticollateralBondingCurvePool);
    const xstUsed = isXorDex && isSourceUsed(LiquiditySourceTypes.XSTPool);
    const orderBookUsed = (isXorDex || isKusdDex || isVxorDex) && isSourceUsed(LiquiditySourceTypes.OrderBook);

    if ([xykUsed, tbcUsed, xstUsed, orderBookUsed].every((isUsed) => !isUsed)) {
      return null;
    }

    // possible paths for swap (we need to find all possible assets)
    const exchangePaths = newTrivial(
      baseAssetId,
      syntheticBaseAssetId,
      Object.keys(xstAssets),
      firstAssetAddress,
      secondAssetAddress
    );
    // list of all assets what could be used in swap
    const assetsInPaths = [...new Set(exchangePaths.flat(1))];
    // Assets that could have XYK reserves (with baseAssetId)
    const assetsWithXykReserves = assetsInPaths.filter((address) => address !== baseAssetId);
    // Assets that could have TBC collateral reserves (not XOR)
    const assetsWithTbcReserves = assetsInPaths.filter((address) => tbcAssets.includes(address));
    // Assets that could have OrderBook reserves (base: assetId; quote: baseAssetId)
    const assetsWithOrderBookReserves = assetsInPaths.filter((address) => address !== baseAssetId);
    // Assets that have average price data (storage has prices only for collateral TBC assets), DAI required
    const assetsWithAveragePrices = [...new Set([...assetsWithTbcReserves, dai])];
    // Assets for which we need to know the total supply
    const assetsWithIssuances = [xor];
    // Tickers with rates in oracle (except USD ticker, because it is the same as DAI)
    const tickersWithOracleRates = assetsInPaths.reduce<string[]>((buffer, address) => {
      if (address !== xstusd && !!xstAssets[address]) {
        buffer.push(xstAssets[address].referenceSymbol);
      }
      return buffer;
    }, []);

    const xykReserves = xykUsed
      ? assetsWithXykReserves.map((address) => toPoolReserves(baseAssetId, address, this.root))
      : [];

    const orderBookReserves = orderBookUsed
      ? assetsWithOrderBookReserves.map((address) => getAggregatedOrderBook(address, baseAssetId, this.root))
      : [];

    // fill array if TBC source available
    const tbcReserves = tbcUsed
      ? assetsWithTbcReserves.map((address) =>
          toCodec(this.root.apiRx.query.multicollateralBondingCurvePool.collateralReserves(address))
        )
      : [];

    // fill array if TBC or XST source available
    const assetsPrices =
      tbcUsed || xstUsed ? assetsWithAveragePrices.map((address) => getAssetAveragePrice(address, this.root)) : [];

    // if TBC source available
    const assetsIssuances = tbcUsed ? [toCodec(this.root.apiRx.query.balances.totalIssuance())] : [];

    const tickersRates = xstUsed
      ? tickersWithOracleRates.map((symbol) => toBandRate(this.root.apiRx.query.band.symbolRates(symbol)))
      : [];

    const tbcConsts = tbcUsed
      ? [
          fromFixnumToCodec(this.root.apiRx.query.multicollateralBondingCurvePool.initialPrice()),
          fromFixnumToCodec(this.root.apiRx.query.multicollateralBondingCurvePool.priceChangeStep()),
          fromFixnumToCodec(this.root.apiRx.query.multicollateralBondingCurvePool.priceChangeRate()),
          fromFixnumToCodec(this.root.apiRx.query.multicollateralBondingCurvePool.sellPriceCoefficient()),
          fromCodecToAssetId(this.root.apiRx.query.multicollateralBondingCurvePool.referenceAssetId()),
        ]
      : [];

    const xstConsts = xstUsed
      ? [
          toCodec(this.root.apiRx.query.xstPool.syntheticBaseAssetFloorPrice()),
          fromCodecToAssetId(this.root.apiRx.query.xstPool.referenceAssetId()),
        ]
      : [];

    // storage consts
    const bandRateStalePeriod = this.root.api.consts.band.getBandRateStalePeriod.toNumber();
    const syntheticBaseBuySellLimit = this.root.api.consts.xstPool.getSyntheticBaseBuySellLimit.toString();

    return combineLatest([
      ...tickersRates,
      ...assetsIssuances,
      ...assetsPrices,
      ...orderBookReserves,
      ...tbcReserves,
      ...xykReserves,
      ...tbcConsts,
      ...xstConsts,
    ]).pipe(
      map((data) => {
        let position = tickersRates.length;

        const rates = data.slice(0, position);
        const issuances: Array<string> = data.slice(position, (position += assetsIssuances.length));
        const prices: Array<{ [PriceVariant.Buy]: CodecString; [PriceVariant.Sell]: CodecString }> = data.slice(
          position,
          (position += assetsPrices.length)
        );
        const orderBook: Array<OrderBookAggregated> = data.slice(position, (position += orderBookReserves.length));
        const tbc: Array<string> = data.slice(position, (position += tbcReserves.length));
        const xyk = data.slice(position, (position += xykReserves.length));
        const [initialPrice, priceChangeStep, priceChangeRate, sellPriceCoefficient, tbcReferenceAsset] = data.slice(
          position,
          (position += tbcConsts.length)
        );
        const [floorPrice, xstReferenceAsset] = data.slice(position, (position += xstConsts.length));

        const xykData = combineValuesWithKeys(xyk, assetsWithXykReserves);
        const orderBookData = combineValuesWithKeys(orderBook, assetsWithOrderBookReserves);
        const sources = getAssetsLiquiditySources(
          baseAssetId,
          syntheticBaseAssetId,
          exchangePaths,
          enabledAssets,
          xykData,
          orderBookData
        );

        const payload: QuotePayload = {
          enabledAssets,
          enabledSources,
          lockedSources,
          sources,
          rates: combineValuesWithKeys(rates, tickersWithOracleRates),
          reserves: {
            xyk: xykData,
            tbc: combineValuesWithKeys(tbc, assetsWithTbcReserves),
            orderBook: orderBookData,
          },
          prices: combineValuesWithKeys(prices, assetsWithAveragePrices),
          issuances: combineValuesWithKeys(issuances, assetsWithIssuances),
          consts: {
            tbc: {
              initialPrice,
              priceChangeStep,
              priceChangeRate,
              sellPriceCoefficient,
              referenceAsset: tbcReferenceAsset,
            },
            xst: {
              floorPrice,
              referenceAsset: xstReferenceAsset,
              syntheticBaseBuySellLimit,
            },
            band: {
              rateStalePeriod: bandRateStalePeriod,
            },
          },
        };

        return payload;
      })
    );
  }

  /**
   * Get observable liquidity proxy quote function for two assets
   * @param firstAssetAddress First swap token address
   * @param secondAssetAddress Second swap token address
   * @param sources Liquidity sources available for swap (all sources by default)
   * @param dexId Selected Dex Id
   */
  public getSwapQuoteObservable(
    firstAssetAddress: string,
    secondAssetAddress: string,
    sources: LiquiditySourceTypes[] = [],
    dexId = DexId.XOR
  ): Observable<SwapQuoteData> | null {
    const dexReservesObservable = this.subscribeOnReserves(firstAssetAddress, secondAssetAddress, sources, dexId);

    if (!dexReservesObservable) return null;

    const swapQuoteObservable = dexReservesObservable.pipe(
      map((payload) => {
        const { isAvailable, liquiditySources } = payload.sources;

        const quote: SwapQuote = (
          inputAssetAddress: string,
          outputAssetAddress: string,
          value: NumberLike,
          isExchangeB: boolean,
          selectedSources: LiquiditySourceTypes[] = [],
          deduceFee = true
        ) => {
          const result = this.getResult(
            inputAssetAddress,
            outputAssetAddress,
            value,
            isExchangeB,
            payload,
            selectedSources,
            dexId,
            deduceFee
          );

          return { result, dexId };
        };

        return {
          quote,
          isAvailable,
          liquiditySources,
        };
      })
    );

    return swapQuoteObservable;
  }

  /**
   * Get observable liquidity proxy quote function for two assets across all Dexes
   * @param firstAssetAddress First swap token address
   * @param secondAssetAddress Second swap token address
   * @param sources Liquidity sources for swap (all sources by default)
   */
  // prettier-ignore
  public getDexesSwapQuoteObservable( // NOSONAR
    firstAssetAddress: string,
    secondAssetAddress: string,
    sources: LiquiditySourceTypes[] = []
  ): Observable<SwapQuoteData> | null {
    const observables: Observable<SwapQuoteData>[] = [];

    for (const { dexId } of this.root.dex.publicDexes) {
      const swapQuoteDataObservable = this.getSwapQuoteObservable(
        firstAssetAddress,
        secondAssetAddress,
        sources,
        dexId
      );

      if (swapQuoteDataObservable) {
        observables.push(swapQuoteDataObservable);
      }
    }

    if (observables.length === 0) return null;
    if (observables.length === 1) return observables[0];

    return combineLatest(observables).pipe(
      map((swapQuoteData) => {
        const isAvailable = swapQuoteData.some(({ isAvailable }) => !!isAvailable);
        const liquiditySources = [...new Set(swapQuoteData.map(({ liquiditySources }) => liquiditySources).flat(1))];
        const quote: SwapQuote = (
          inputAssetAddress: string,
          outputAssetAddress: string,
          value: NumberLike,
          isExchangeB: boolean,
          selectedSources: LiquiditySourceTypes[] = [],
          deduceFee = true
        ) => {
          const results = swapQuoteData.reduce<{ [dexId: number]: SwapResult }>((buffer, { quote }) => {
            const { dexId, result } = quote(
              inputAssetAddress,
              outputAssetAddress,
              value,
              isExchangeB,
              selectedSources,
              deduceFee
            );

            return { ...buffer, [dexId]: result };
          }, {});

          return getBestResult(isExchangeB, results);
        };

        return {
          quote,
          isAvailable,
          liquiditySources,
        };
      })
    );
  }

  // prettier-ignore
  private calcTxParams( // NOSONAR
    assetA: Asset | AccountAsset,
    assetB: Asset | AccountAsset,
    amountA: NumberLike,
    amountB: NumberLike,
    slippageTolerance: NumberLike = this.root.defaultSlippageTolerancePercent,
    isExchangeB = false,
    liquiditySource = LiquiditySourceTypes.Default,
    dexId = DexId.XOR
  ) {
    assert(this.root.account, Messages.connectWallet);
    const desiredDecimals = (!isExchangeB ? assetA : assetB).decimals;
    const resultDecimals = (!isExchangeB ? assetB : assetA).decimals;
    const desiredCodecString = new FPNumber(!isExchangeB ? amountA : amountB, desiredDecimals).toCodecString();
    const result = new FPNumber(!isExchangeB ? amountB : amountA, resultDecimals);
    const resultMulSlippage = result.mul(new FPNumber(Number(slippageTolerance) / 100));
    const liquiditySources = this.prepareSourcesForSwapParams(liquiditySource);
    const params = {} as any;
    if (!isExchangeB) {
      params.WithDesiredInput = {
        desiredAmountIn: desiredCodecString,
        minAmountOut: result.sub(resultMulSlippage).toCodecString(),
      };
    } else {
      params.WithDesiredOutput = {
        desiredAmountOut: desiredCodecString,
        maxAmountIn: result.add(resultMulSlippage).toCodecString(),
      };
    }
    return {
      args: [
        dexId,
        assetA.address,
        assetB.address,
        params,
        liquiditySources,
        liquiditySource === LiquiditySourceTypes.Default ? 'Disabled' : 'AllowSelected',
      ],
    };
  }

  /**
   * Run swap operation
   * @param assetA Asset A
   * @param assetB Asset B
   * @param amountA Amount A value
   * @param amountB Amount B value
   * @param slippageTolerance Slippage tolerance coefficient (in %)
   * @param isExchangeB Exchange A if `isExchangeB=false` else Exchange B. `false` by default
   * @param dexId dex id to detect base asset (XOR or XSTUSD)
   */
  // prettier-ignore
  public execute( // NOSONAR
    assetA: Asset | AccountAsset,
    assetB: Asset | AccountAsset,
    amountA: NumberLike,
    amountB: NumberLike,
    slippageTolerance: NumberLike = this.root.defaultSlippageTolerancePercent,
    isExchangeB = false,
    liquiditySource = LiquiditySourceTypes.Default,
    dexId = DexId.XOR
  ): Promise<T> {
    assert(this.root.account, Messages.connectWallet);

    const params = this.calcTxParams(
      assetA,
      assetB,
      amountA,
      amountB,
      slippageTolerance,
      isExchangeB,
      liquiditySource,
      dexId
    );

    this.root.assets.addAccountAsset(assetB.address);

    return this.root.submitExtrinsic(
      (this.root.api.tx.liquidityProxy as any).swap(...params.args),
      this.root.account.pair,
      {
        symbol: assetA.symbol,
        assetAddress: assetA.address,
        amount: `${amountA}`,
        symbol2: assetB.symbol,
        asset2Address: assetB.address,
        amount2: `${amountB}`,
        liquiditySource,
        type: Operation.Swap,
      }
    );
  }

  /**
   * Run swap & send batch operation
   * @param receiver Receiver account address
   * @param assetA Asset A
   * @param assetB Asset B
   * @param amountA Amount A value
   * @param amountB Amount B value
   * @param slippageTolerance Slippage tolerance coefficient (in %)
   * @param isExchangeB Exchange A if `isExchangeB=false` else Exchange B. `false` by default
   * @param dexId dex id to detect base asset (XOR or XSTUSD)
   */
  // prettier-ignore
  public executeSwapAndSend( // NOSONAR
    receiver: string,
    assetA: Asset | AccountAsset,
    assetB: Asset | AccountAsset,
    amountA: NumberLike,
    amountB: NumberLike,
    slippageTolerance: NumberLike = this.root.defaultSlippageTolerancePercent,
    isExchangeB = false,
    liquiditySource = LiquiditySourceTypes.Default,
    dexId = DexId.XOR
  ): Promise<T> {
    assert(this.root.account, Messages.connectWallet);

    const params = this.calcTxParams(
      assetA,
      assetB,
      amountA,
      amountB,
      slippageTolerance,
      isExchangeB,
      liquiditySource,
      dexId
    );

    this.root.assets.addAccountAsset(assetB.address);

    const formattedToAddress = receiver.startsWith('cn') ? receiver : this.root.formatAddress(receiver);

    return this.root.submitExtrinsic(
      (this.root.api.tx.liquidityProxy as any).swapTransfer(receiver, ...params.args),
      this.root.account.pair,
      {
        symbol: assetA.symbol,
        assetAddress: assetA.address,
        amount: `${amountA}`,
        symbol2: assetB.symbol,
        asset2Address: assetB.address,
        amount2: `${amountB}`,
        liquiditySource,
        to: formattedToAddress,
        type: Operation.SwapAndSend,
      }
    );
  }

  /**
   * Run swap transfers batch operation
   * @param receivers the ordered map, which maps the asset id and dexId being bought to the vector of batch receivers
   * @param inputAsset asset being sold
   * @param maxInputAmount max amount being sold
   * @param additionalData additional data field
   */
  public executeSwapTransferBatch(
    receivers: Array<SwapTransferBatchData>,
    inputAsset: Asset | AccountAsset,
    maxInputAmount: FPNumber | NumberLike,
    additionalData: SwapTransferBatchAdditionalData | null = null,
    liquiditySource = LiquiditySourceTypes.Default
  ): Promise<T> {
    assert(this.root.account, Messages.connectWallet);

    const assetAddress = inputAsset.address;
    const amount = new FPNumber(maxInputAmount, inputAsset.decimals).toCodecString();
    const liquiditySources = liquiditySource ? [liquiditySource] : [];
    const filterMode = liquiditySource === LiquiditySourceTypes.Default ? 'Disabled' : 'AllowSelected';
    const formattedAdditionalData = JSON.stringify(additionalData);

    const data = receivers.map((item) => {
      return {
        outcomeAssetId: item.outcomeAssetId,
        outcomeAssetReuse: new FPNumber(item.outcomeAssetReuse).toCodecString(),
        dexId: item.dexId,
        receivers: item.receivers.map((receiver) => ({
          accountId: receiver.accountId,
          targetAmount: new FPNumber(receiver.targetAmount).toCodecString(),
        })),
      };
    });
    return this.root.submitExtrinsic(
      this.root.api.tx.liquidityProxy.swapTransferBatch(
        data,
        assetAddress,
        amount,
        liquiditySources,
        filterMode,
        formattedAdditionalData
      ),
      this.root.account.pair,
      {
        symbol: inputAsset.symbol,
        assetAddress,
        type: Operation.SwapTransferBatch,
      }
    );
  }

  private getSourcesAndFilterMode(liquiditySource: LiquiditySourceTypes, allowSelectedSorce: boolean) {
    const liquiditySources = this.prepareSourcesForSwapParams(liquiditySource) as unknown as LiquiditySourceType[];

    let filterMode: FilterMode = 'Disabled';
    if (liquiditySource !== LiquiditySourceTypes.Default) {
      filterMode = allowSelectedSorce ? 'AllowSelected' : 'ForbidSelected';
    }

    return { liquiditySources, filterMode };
  }

  /**
   * **RPC**
   *
   * Get swap result using `liquidityProxy.quote` rpc call using predefined DEX ID.
   *
   * It's better to use `getResult` function because of the blockchain performance
   *
   * @param assetAAddress Asset A address
   * @param assetBAddress Asset B address
   * @param amount Amount value (Asset A if Exchange A, else - Asset B)
   * @param isExchangeB Exchange A if `isExchangeB=false` else Exchange B. `false` by default
   * @param liquiditySource Selected liquidity source; `''` by default
   * @param allowSelectedSorce Filter mode for source (`AllowSelected` or `ForbidSelected`); `true` by default
   * @param dexId DEX ID: might be `0` - XOR based or `1` - XSTUSD based; `0` by default
   */
  public async getResultFromDexRpc(
    assetAAddress: string,
    assetBAddress: string,
    amount: NumberLike,
    isExchangeB = false,
    liquiditySource = LiquiditySourceTypes.Default,
    allowSelectedSorce = true,
    dexId = DexId.XOR
  ): Promise<SwapResult> {
    const [assetA, assetB] = await Promise.all([
      this.root.assets.getAssetInfo(assetAAddress),
      this.root.assets.getAssetInfo(assetBAddress),
    ]);
    const { liquiditySources, filterMode } = this.getSourcesAndFilterMode(liquiditySource, allowSelectedSorce);
    const swapVariant = !isExchangeB ? 'WithDesiredInput' : 'WithDesiredOutput';
    const swapAmount = toParamCodecString(amount, assetA, assetB, isExchangeB);

    const result = await this.root.api.rpc.liquidityProxy.quote(
      dexId,
      assetAAddress,
      assetBAddress,
      swapAmount,
      swapVariant,
      liquiditySources,
      filterMode
    );
    const value = result.unwrapOr(emptySwapResult) as LPSwapOutcomeInfo;

    const fee: LiquidityProviderFee[] = [];
    value.fee.forEach((value, key) => {
      fee.push({ assetId: key.toString(), value: value.toString() });
    });

    return {
      amount: toParamCodecString(value.amount, assetA, assetB, isExchangeB),
      amountWithoutImpact: toParamCodecString(value.amountWithoutImpact, assetA, assetB, isExchangeB),
      fee,
      rewards: ('toJSON' in value.rewards ? value.rewards.toJSON() : value.rewards) as unknown as LPRewardsInfo[],
      route: 'toJSON' in value.route ? value.route.toJSON() : value.route,
    } as SwapResult;
  }

  /**
   * **RPC**
   *
   * Get swap result using `liquidityProxy.quote` rpc call for all DEX IDs (XOR & XSTUSD based).
   * It utilizes only 18 decimals assets
   * __________________
   * It's better to use `getResult` function because of the blockchain performance
   *
   * @param assetAAddress Asset A address
   * @param assetBAddress Asset B address
   * @param amount Amount value (Asset A if Exchange A, else - Asset B)
   * @param isExchangeB Exchange A if `isExchangeB=false` else Exchange B. `false` by default
   * @param liquiditySource Selected liquidity source; `''` by default
   * @param allowSelectedSorce Filter mode for source (`AllowSelected` or `ForbidSelected`); `true` by default
   */
  public async getResultRpc(
    assetAAddress: string,
    assetBAddress: string,
    amount: NumberLike,
    isExchangeB = false,
    liquiditySource = LiquiditySourceTypes.Default,
    allowSelectedSorce = true
  ): Promise<SwapResultWithDexIdV2> {
    const results: DexesSwapResults = {};

    await Promise.all(
      this.root.dex.publicDexes.map(({ dexId }) =>
        this.getResultFromDexRpc(
          assetAAddress,
          assetBAddress,
          amount,
          isExchangeB,
          liquiditySource,
          allowSelectedSorce,
          dexId
        ).then((result) => {
          results[dexId] = result;
        })
      )
    );

    const { dexId, result } = getBestResult(isExchangeB, results);

    return {
      ...result,
      dexId,
    } as SwapResultWithDexIdV2;
  }

  /**
   * **RPC**
   *
   * Get buy/sell swap results using `liquidityProxy.quote` rpc call for selected DEX (XOR DEX by default).
   * It utilizes only 18 decimals assets
   * __________________
   * It's better to use `getResult` function because of the blockchain performance
   *
   * @param base Base asset address
   * @param quote Quote asset address
   * @param amount Amount value represented by `number` or `string`
   * @param liquiditySource Selected liquidity source; `''` by default
   * @param allowSelectedSorce Filter mode for source (`AllowSelected` or `ForbidSelected`); `true` by default
   * @param dexId Selected DEX (0 - XOR DEX by default)
   */
  public async getBuySellResultRpc(
    base: string,
    quote: string,
    amount: NumberLike,
    liquiditySource = LiquiditySourceTypes.Default,
    allowSelectedSorce = true,
    dexId = DexId.XOR
  ): Promise<{ buy: string; sell: string }> {
    const { liquiditySources, filterMode } = this.getSourcesAndFilterMode(liquiditySource, allowSelectedSorce);

    const amountFp = toFP(amount);
    const codecAmount = amountFp.toCodecString();
    const quoteFn = this.root.api.rpc.liquidityProxy.quote;

    const [sellDex0, /* sellDex1, */ buyDex0 /*, buyDex1*/] = await Promise.all([
      quoteFn(dexId, base, quote, codecAmount, 'WithDesiredInput', liquiditySources, filterMode),
      // quoteFn(DexId.XSTUSD, base, quote, codecAmount, 'WithDesiredInput', liquiditySources, filterMode),
      quoteFn(dexId, quote, base, codecAmount, 'WithDesiredOutput', liquiditySources, filterMode),
      // quoteFn(DexId.XSTUSD, quote, base, codecAmount, 'WithDesiredOutput', liquiditySources, filterMode),
    ]);

    const valueSellDex0 = sellDex0.unwrapOr(emptySwapResult);
    // NOSONAR
    // const valueSellDex1 = sellDex1.unwrapOr(emptySwapResult);
    // const isDex0BetterForSell = FPNumber.gte(toFP(valueSellDex0.amount), toFP(valueSellDex1.amount));
    const valueSell = toFP(valueSellDex0.amount); // toFP((isDex0BetterForSell ? valueSellDex0 : valueSellDex1).amount); NOSONAR

    const valueBuyDex0 = buyDex0.unwrapOr(emptySwapResult);
    // NOSONAR
    // const valueBuyDex1 = buyDex1.unwrapOr(emptySwapResult);
    // const isDex0BetterForBuy = FPNumber.gte(toFP(valueBuyDex0.amount), toFP(valueBuyDex1.amount));
    const valueBuy = toFP(valueBuyDex0.amount); // toFP((isDex0BetterForBuy ? valueBuyDex0 : valueBuyDex1).amount); NOSONAR

    return {
      buy: valueBuy.div(amountFp).toString(),
      sell: valueSell.div(amountFp).toString(),
    };
  }

  /**
   * **RPC**
   *
   * Subscribe on swap result using `liquidityProxy.quote` rpc call for all DEX IDs (XOR & XSTUSD based).
   *
   * @param assetAAddress Asset A address
   * @param assetBAddress Asset B address
   * @param amount Amount value (Asset A if Exchange A, else - Asset B)
   * @param isExchangeB Exchange A if `isExchangeB=false` else Exchange B. `false` by default
   * @param liquiditySource Selected liquidity source; `''` by default
   * @param allowSelectedSorce Filter mode for source (`AllowSelected` or `ForbidSelected`); `true` by default
   */
  public subscribeOnResultRpc(
    assetAAddress: string,
    assetBAddress: string,
    amount: NumberLike,
    isExchangeB = false,
    liquiditySource = LiquiditySourceTypes.Default,
    allowSelectedSorce = true
  ): Observable<Promise<SwapResultWithDexIdV2>> {
    return this.root.system
      .getBlockNumberObservable()
      .pipe(
        map(() =>
          this.getResultRpc(assetAAddress, assetBAddress, amount, isExchangeB, liquiditySource, allowSelectedSorce)
        )
      );
  }

  /**
   * **RPC**
   *
   * Check swap operation using `liquidityProxy.isPathAvailable` rpc call
   * @param firstAssetAddress
   * @param secondAssetAddress
   * @param dexId
   * @returns availability of swap operation
   */
  public async checkSwap(firstAssetAddress: string, secondAssetAddress: string, dexId = DexId.XOR): Promise<boolean> {
    return (await this.root.api.rpc.liquidityProxy.isPathAvailable(dexId, firstAssetAddress, secondAssetAddress))
      .isTrue;
  }

  /**
   * **RPC**
   *
   * Get liquidity sources for selected pair using `tradingPair.listEnabledSourcesForPair` rpc call
   * @param firstAssetAddress
   * @param secondAssetAddress
   * @param dexId
   */
  public async getEnabledLiquiditySourcesForPair(
    firstAssetAddress: string,
    secondAssetAddress: string,
    dexId = DexId.XOR
  ): Promise<Array<LiquiditySourceTypes>> {
    const baseAssetId = secondAssetAddress === XOR.address ? secondAssetAddress : firstAssetAddress;
    const targetAssetId = baseAssetId === secondAssetAddress ? firstAssetAddress : secondAssetAddress;
    const list = (
      await this.root.api.rpc.tradingPair.listEnabledSourcesForPair(dexId, baseAssetId, targetAssetId)
    ).toJSON();

    return list as Array<LiquiditySourceTypes>;
  }

  /**
   * **RPC**
   *
   * Check liquidity Source availability for the selected pair using `tradingPair.isSourceEnabledForPair` rpc call
   * @param firstAssetAddress
   * @param secondAssetAddress
   * @param liquiditySource
   * @param dexId
   */
  public async checkLiquiditySourceIsEnabledForPair(
    firstAssetAddress: string,
    secondAssetAddress: string,
    liquiditySource: LiquiditySourceTypes,
    dexId = DexId.XOR
  ): Promise<boolean> {
    const isEnabled = (
      await this.root.api.rpc.tradingPair.isSourceEnabledForPair(
        dexId,
        firstAssetAddress,
        secondAssetAddress,
        liquiditySource as any
      )
    ).isTrue;

    return isEnabled;
  }
}
