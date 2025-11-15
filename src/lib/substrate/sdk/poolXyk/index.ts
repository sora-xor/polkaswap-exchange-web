import { assert } from '@polkadot/util';
import { Subject, combineLatest, map } from 'rxjs';
import { FPNumber, NumberLike, CodecString } from '@sora-substrate/math';
import { getChameleonPools } from '@sora-substrate/liquidity-proxy';
import type { Observable } from '@polkadot/types/types';
import type { ITuple } from '@polkadot/types-codec/types';
import type { u128 } from '@polkadot/types-codec';
import type { Subscription } from 'rxjs';

import { poolAccountIdFromAssetPair } from './account';
import { DexId } from '../dex/consts';
import { Messages } from '../logger';
import { Operation } from '../types';
import { toAssetId } from '../assets';
import { XOR } from '../assets/consts';
import type { Api } from '../api';
import type { AccountLiquidity } from './types';
import type { Asset, AccountAsset } from '../assets/types';

function isBaseAssetId<T>(root: Api<T>, address: string) {
  return root.dex.baseAssetsIds.includes(address);
}

const isChameleon = (first: string, second: string, isCreateOperation = false) => {
  if (isCreateOperation) return false;
  // chameleons exists only in XOR dex
  const [baseChameleonAssetId, chameleonTargets] = getChameleonPools(XOR.address);

  return first === baseChameleonAssetId && chameleonTargets.includes(second);
};

function serializeLPKey(liquidity: Partial<AccountLiquidity>): string {
  if (!(liquidity.firstAddress && liquidity.secondAddress)) {
    return '';
  }
  return `${liquidity.firstAddress},${liquidity.secondAddress}`;
}

function deserializeLPKey(key: string): Partial<AccountLiquidity> | null {
  const [firstAddress, secondAddress] = key.split(',');
  if (!(firstAddress && secondAddress)) {
    return null;
  }
  return { firstAddress, secondAddress };
}

function toReserve(value: u128): CodecString {
  return new FPNumber(value).toCodecString();
}

function parseReserves(reserves: ITuple<[u128, u128]>): [CodecString, CodecString] {
  if (!reserves || reserves.length !== 2) {
    return ['0', '0'];
  }
  return [toReserve(reserves[0]), toReserve(reserves[1])];
}

export class PoolXykModule<T> {
  constructor(private readonly root: Api<T>) {}
  /** key = `baseAssetId,targetAssetId` */
  private subscriptions: Map<string, Subscription> = new Map();
  private subject = new Subject<void>();
  public updated = this.subject.asObservable();
  public accountLiquidity: Array<AccountLiquidity> = [];
  public accountLiquidityLoaded: Subject<void> | null = null;

  private addToLiquidityList(asset: AccountLiquidity): void {
    const liquidityCopy = [...this.accountLiquidity];
    const index = liquidityCopy.findIndex((item) => item.address === asset.address);

    if (~index) {
      liquidityCopy[index] = asset;
    } else {
      liquidityCopy.push(asset);
    }

    this.accountLiquidity = liquidityCopy;
  }

  /**
   * Get liquidity
   * @param firstAssetAddress
   * @param secondAssetAddress
   */
  public getInfoByPoolAccount(poolTokenAccount: string): Asset {
    return {
      address: poolTokenAccount,
      decimals: FPNumber.DEFAULT_PRECISION, // [DECIMALS]
      name: 'Pool XYK Token',
      symbol: 'POOLXYK',
      isMintable: true,
    };
  }

  /**
   * Get liquidity
   * @param firstAssetAddress
   * @param secondAssetAddress
   */
  public getInfo(firstAssetAddress: string, secondAssetAddress: string): Asset | null {
    const poolTokenAccount = poolAccountIdFromAssetPair(this.root, firstAssetAddress, secondAssetAddress).toString();
    if (!poolTokenAccount) {
      return null;
    }
    return this.getInfoByPoolAccount(poolTokenAccount);
  }

  /**
   * Check liquidity create/add operation
   * @param firstAssetAddress
   * @param secondAssetAddress
   */
  public async check(firstAssetAddress: string, secondAssetAddress: string): Promise<boolean> {
    const props = await this.root.api.query.poolXYK.properties(firstAssetAddress, secondAssetAddress);
    if (!props?.isSome) {
      return false;
    }
    return true;
  }

  public getAccountPoolBalanceObservable(firstAddress: string, secondAddress: string): Observable<string | null> {
    assert(this.root.account, Messages.connectWallet);

    const poolAccount = poolAccountIdFromAssetPair(this.root, firstAddress, secondAddress).toString();

    return this.root.apiRx.query.poolXYK.poolProviders(poolAccount, this.root.account.pair.address).pipe(
      map((result) => {
        if (!result?.isSome) return null;

        return toReserve(result.value);
      })
    );
  }

  public getTotalSupplyObservable(firstAddress: string, secondAddress: string): Observable<string | null> {
    const poolAccount = poolAccountIdFromAssetPair(this.root, firstAddress, secondAddress).toString();

    return this.root.apiRx.query.poolXYK.totalIssuances(poolAccount).pipe(
      map((result) => {
        if (!result?.isSome) return null;

        return toReserve(result.value);
      })
    );
  }

  public async getTotalSupply(firstAddress: string, secondAddress: string): Promise<CodecString | null> {
    const poolAccount = poolAccountIdFromAssetPair(this.root, firstAddress, secondAddress).toString();

    const result = await this.root.api.query.poolXYK.totalIssuances(poolAccount);

    if (!result?.isSome) return null;

    return toReserve(result.value);
  }

  /**
   * Get pool properties observable
   * @param firstAssetAddress
   * @param secondAssetAddress
   */
  public getPoolPropertiesObservable(
    firstAssetAddress: string,
    secondAssetAddress: string
  ): Observable<string[] | null> {
    return this.root.apiRx.query.poolXYK.properties(firstAssetAddress, secondAssetAddress).pipe(
      map((result) => {
        if (!result?.isSome) return null;

        return result.value.map((accountId) => accountId.toString());
      })
    );
  }

  /**
   * Get pool reserves observable
   * @param firstAssetAddress
   * @param secondAssetAddress
   */
  public getReservesObservable(
    firstAssetAddress: string,
    secondAssetAddress: string
  ): Observable<[CodecString, CodecString]> {
    return this.root.apiRx.query.poolXYK
      .reserves(firstAssetAddress, secondAssetAddress)
      .pipe(map((reserves) => parseReserves(reserves)));
  }

  /**
   * Get liquidity reserves.
   * If the output will be `['0', '0']` then the client is the first liquidity provider
   * @param firstAssetAddress
   * @param secondAssetAddress
   */
  public async getReserves(firstAssetAddress: string, secondAssetAddress: string): Promise<Array<CodecString>> {
    const reserves = await this.root.api.query.poolXYK.reserves(firstAssetAddress, secondAssetAddress);

    return parseReserves(reserves);
  }

  public async getAllReserves(): Promise<Record<string, Array<CodecString>>> {
    const reserves = {} as Record<string, Array<CodecString>>;
    const baseAssetIds = this.root.dex.baseAssetsIds;
    const allReserves = (
      await Promise.all(baseAssetIds.map((baseAssetId) => this.root.api.query.poolXYK.reserves.entries(baseAssetId)))
    ).flat(1);

    for (const item of allReserves) {
      // [DECIMALS] Decimals = 18 here
      const [key1, key2] = item[0].args;
      if (item[1]?.length == 2) {
        const [value1, value2] = item[1];
        reserves[toAssetId(key1) + toAssetId(key2)] = [toReserve(value1), toReserve(value2)];
      }
    }

    return reserves;
  }

  /**
   * Estimate tokens retrieved.
   * Also it returns the total supply as `result[2]`
   * @param amount
   * @param firstTotal Reserve A from `getReserves()[0]`
   * @param secondTotal Reserve B from `getReserves()[1]`
   * @param totalSupply Total issuance of pool
   * @param firstAssetDecimals If it's not set then request about asset info will be performed
   * @param secondAssetDecimals If it's not set then request about asset info will be performed
   */
  public estimateTokensRetrieved(
    // firstAssetAddress: string,
    // secondAssetAddress: string,
    amount: CodecString,
    firstTotal: CodecString,
    secondTotal: CodecString,
    totalSupply: CodecString,
    firstAssetDecimals?: number,
    secondAssetDecimals?: number
  ): Array<CodecString> {
    // [DECIMALS] actually, we don't need to use decimals here, so, we don't need to send these requests
    // firstAssetDecimals = firstAssetDecimals ?? (await this.getAssetInfo(firstAssetAddress)).decimals
    // secondAssetDecimals = secondAssetDecimals ?? (await this.getAssetInfo(secondAssetAddress)).decimals
    const a = FPNumber.fromCodecValue(firstTotal, firstAssetDecimals);
    const b = FPNumber.fromCodecValue(secondTotal, secondAssetDecimals);
    if (a.isZero() && b.isZero()) {
      return ['0', '0'];
    }
    const pIn = FPNumber.fromCodecValue(amount);
    const pts = FPNumber.fromCodecValue(totalSupply);
    const ptsFirstAsset = FPNumber.fromCodecValue(totalSupply, firstAssetDecimals);
    const ptsSecondAsset = FPNumber.fromCodecValue(totalSupply, secondAssetDecimals);
    const aOut = pIn.mul(a).div(ptsFirstAsset);
    const bOut = pIn.mul(b).div(ptsSecondAsset);
    return [aOut.toCodecString(), bOut.toCodecString(), pts.toCodecString()];
  }

  /**
   * Estimate pool tokens minted.
   * @param firstAsset First asset
   * @param secondAsset Second asset
   * @param firstAmount First asset amount
   * @param secondAmount Second asset amount
   * @param firstTotal getReserves()[0]
   * @param secondTotal getReserves()[1]
   * @param totalSupply Pool total issuance
   */
  public estimatePoolTokensMinted(
    firstAsset: Asset,
    secondAsset: Asset,
    firstAmount: NumberLike,
    secondAmount: NumberLike,
    firstTotal: CodecString,
    secondTotal: CodecString,
    totalSupply: CodecString
  ): Array<CodecString> {
    const decimals = Math.max(firstAsset.decimals, secondAsset.decimals);
    const aIn = new FPNumber(firstAmount, decimals);
    const bIn = new FPNumber(secondAmount, decimals);
    const a = FPNumber.fromCodecValue(firstTotal, decimals);
    const b = FPNumber.fromCodecValue(secondTotal, decimals);
    if (a.isZero() && b.isZero()) {
      const inaccuracy = new FPNumber('0.000000000000001');
      return [aIn.mul(bIn).sqrt().sub(inaccuracy).toCodecString()];
    }
    const poolToken = this.getInfo(firstAsset.address, secondAsset.address);
    const pts = FPNumber.fromCodecValue(totalSupply, poolToken?.decimals);
    const result = FPNumber.min(aIn.mul(pts).div(a), bIn.mul(pts).div(b));
    return [result.toCodecString(), pts.toCodecString()];
  }

  private async subscribeOnAccountLiquidity(liquidity: Partial<AccountLiquidity>): Promise<void> {
    if (this.subscriptions.has(serializeLPKey(liquidity))) return;

    const { firstAddress, secondAddress } = liquidity;
    if (!(firstAddress && secondAddress)) return;

    const poolAccount = poolAccountIdFromAssetPair(this.root, firstAddress, secondAddress).toString();

    const accountPoolBalanceObservable = this.getAccountPoolBalanceObservable(firstAddress, secondAddress);
    const poolReservesObservable = this.getReservesObservable(firstAddress, secondAddress);
    const poolTotalSupplyObservable = this.getTotalSupplyObservable(firstAddress, secondAddress);

    let subscription!: Subscription;
    let isFirstTick = true;

    const key = serializeLPKey(liquidity);

    await new Promise<void>((resolve) => {
      subscription = combineLatest([
        poolReservesObservable,
        accountPoolBalanceObservable,
        poolTotalSupplyObservable,
      ]).subscribe(([reserves, balance, supply]) => {
        const updatedLiquidity = this.getAccountLiquidityItem(
          poolAccount,
          firstAddress,
          secondAddress,
          reserves,
          balance,
          supply
        );
        // add or update liquidity only if subscription exists, or this is first subscription result
        if (updatedLiquidity && (this.subscriptions.has(key) || isFirstTick)) {
          this.addToLiquidityList(updatedLiquidity);
        } else {
          this.removeAccountLiquidity(liquidity); // Remove it from list if something was wrong
        }

        isFirstTick = false;
        this.subject.next();
        resolve();
      });
    });

    this.subscriptions.set(key, subscription);
  }

  private arrangeAssetsForParams(
    firstAsset: Asset | AccountAsset,
    secondAsset: Asset | AccountAsset,
    firstAmount: NumberLike,
    secondAmount: NumberLike,
    isCreateOperation = false
  ): Array<any> {
    const isFirstBaseAsset = isBaseAssetId(this.root, firstAsset.address);
    const isSecondBaseAsset = isBaseAssetId(this.root, secondAsset.address);
    const isFirstChameleon = isChameleon(firstAsset.address, secondAsset.address, isCreateOperation);
    const isSecondChameleon = isChameleon(secondAsset.address, firstAsset.address, isCreateOperation);
    const isFirstAssetSuitable = isFirstBaseAsset || isFirstChameleon;
    const isSecondAssetSuitable = isSecondBaseAsset || isSecondChameleon;

    assert(isFirstAssetSuitable || isSecondAssetSuitable, Messages.xorOrXstIsRequired);

    let baseAsset!: Asset | AccountAsset,
      targetAsset!: Asset | AccountAsset,
      baseAssetAmount!: NumberLike,
      targetAssetAmount!: NumberLike,
      DEXId!: number;

    if (isFirstAssetSuitable) {
      DEXId = this.root.dex.getDexId(firstAsset.address);
      baseAsset = firstAsset;
      targetAsset = secondAsset;
      baseAssetAmount = firstAmount;
      targetAssetAmount = secondAmount;
    } else if (isSecondAssetSuitable) {
      DEXId = this.root.dex.getDexId(secondAsset.address);
      baseAsset = secondAsset;
      targetAsset = firstAsset;
      baseAssetAmount = secondAmount;
      targetAssetAmount = firstAmount;
    }

    return [baseAsset, targetAsset, baseAssetAmount, targetAssetAmount, DEXId];
  }

  private getAccountLiquidityItem(
    poolAccount: string,
    firstAddress: string,
    secondAddress: string,
    reserves: [CodecString, CodecString],
    balance: CodecString | null,
    totalSupply: CodecString | null
  ): AccountLiquidity | null {
    if (!(balance && Number(balance) && totalSupply)) return null;

    const { decimals, symbol, name } = this.getInfoByPoolAccount(poolAccount);
    // [DECIMALS] actually, we don't need to use decimals here, so, we don't need to send these requests
    // const [{ decimals: decimals1 }, { decimals: decimals2 }] = await Promise.all([
    //   this.root.assets.getAssetInfo(firstAddress),
    //   this.root.assets.getAssetInfo(secondAddress)
    // ]);
    const decimals1 = decimals;
    const decimals2 = decimals;
    const [reserveA, reserveB] = reserves;
    const [balanceA, balanceB] = this.estimateTokensRetrieved(
      balance,
      reserveA,
      reserveB,
      totalSupply,
      decimals1,
      decimals2
    );

    const fpBalance = FPNumber.fromCodecValue(balance, decimals);
    const pts = FPNumber.fromCodecValue(totalSupply, decimals);
    const poolShare = fpBalance.div(pts).mul(FPNumber.HUNDRED).toString() || '0';

    return {
      address: poolAccount,
      firstAddress,
      secondAddress,
      firstBalance: balanceA,
      secondBalance: balanceB,
      symbol,
      decimals: decimals1,
      decimals2,
      balance,
      name,
      poolShare,
      reserveA,
      reserveB,
      totalSupply,
    } as AccountLiquidity;
  }

  public unsubscribeFromAccountLiquidity(liquidity: Partial<AccountLiquidity>): void {
    const key = serializeLPKey(liquidity);
    this.subscriptions.get(key)?.unsubscribe();
    this.subscriptions.delete(key);
  }

  public unsubscribeFromAllUpdates(): void {
    for (const key of this.subscriptions.keys()) {
      const liquidity = deserializeLPKey(key);
      if (liquidity) {
        this.unsubscribeFromAccountLiquidity(liquidity);
      }
    }
  }

  private removeAccountLiquidity(liquidity: Partial<AccountLiquidity>): void {
    this.unsubscribeFromAccountLiquidity(liquidity);
    this.accountLiquidity = this.accountLiquidity.filter(({ firstAddress, secondAddress }) => {
      return !(liquidity.firstAddress === firstAddress && liquidity.secondAddress === secondAddress);
    });
  }

  public clearAccountLiquidity(): void {
    this.unsubscribeFromAllUpdates();
    this.accountLiquidity = [];
  }

  /**
   * Set subscriptions for balance updates of the account asset list
   * @param assetIdPairs
   */
  private async updateAccountLiquiditySubscriptions(assetIdPairs: Array<Array<string>>): Promise<void> {
    assert(this.root.account, Messages.connectWallet);

    // liquidities to be subscribed
    const includedLiquidityList = assetIdPairs.map(([first, second]) => ({
      firstAddress: first,
      secondAddress: second,
    }));
    // liquidities to be unsubscribed and removed
    const excludedLiquidityList = this.accountLiquidity.reduce<AccountLiquidity[]>(
      (result, liquidity) =>
        assetIdPairs.find(([first, second]) => liquidity.firstAddress === first && liquidity.secondAddress === second)
          ? result
          : [...result, liquidity],
      []
    );

    for (const liquidity of excludedLiquidityList) {
      this.removeAccountLiquidity(liquidity);
    }

    const subscribeOnAccountLiquidityPromises = includedLiquidityList.map((liquidity) => {
      return this.subscribeOnAccountLiquidity(liquidity);
    });
    await Promise.all(subscribeOnAccountLiquidityPromises);

    this.subject.next();
  }

  /**
   * Subscription which should be used when user is on the pool page.
   * Also, it can be used in a background - it depends on the performance.
   *
   * Do not forget to call `unsubscribe`
   */
  public getUserPoolsSubscription(): Subscription {
    assert(this.root.accountPair, Messages.connectWallet);

    this.accountLiquidityLoaded = new Subject<void>();

    const account = this.root.accountPair.address;
    const baseAssetIds = this.root.dex.baseAssetsIds;
    const multiEntries = baseAssetIds.map((baseAssetId) => [account, baseAssetId]);

    return this.root.apiRx.query.poolXYK.accountPools.multi(multiEntries).subscribe(async (lists) => {
      const assetIdPairs: Array<string[]> = [];

      lists.forEach((list, index) => {
        const baseAssetId = baseAssetIds[index];

        for (const targetAssetId of list) {
          const pair = [baseAssetId, toAssetId(targetAssetId)];
          assetIdPairs.push(pair);
        }
      });

      await this.updateAccountLiquiditySubscriptions(assetIdPairs);

      this.accountLiquidityLoaded?.next(); // Do not remove it to avoid 'no elements in sequence' error
      this.accountLiquidityLoaded?.complete();
    });
  }

  private calcAddTxParams(
    firstAsset: Asset | AccountAsset,
    secondAsset: Asset | AccountAsset,
    firstAmount: NumberLike,
    secondAmount: NumberLike,
    slippageTolerance: NumberLike = this.root.defaultSlippageTolerancePercent,
    DEXId = DexId.XOR
  ) {
    assert(this.root.account, Messages.connectWallet);
    const firstAmountNum = new FPNumber(firstAmount, firstAsset.decimals);
    const secondAmountNum = new FPNumber(secondAmount, secondAsset.decimals);
    const slippage = new FPNumber(Number(slippageTolerance) / 100);
    return {
      args: [
        DEXId,
        firstAsset.address,
        secondAsset.address,
        firstAmountNum.toCodecString(),
        secondAmountNum.toCodecString(),
        firstAmountNum.sub(firstAmountNum.mul(slippage)).toCodecString(),
        secondAmountNum.sub(secondAmountNum.mul(slippage)).toCodecString(),
      ],
    };
  }

  /**
   * Add liquidity
   * @param firstAsset
   * @param secondAsset
   * @param firstAmount
   * @param secondAmount // TODO: add a case when 'B' should be calculated automatically
   * @param slippageTolerance Slippage tolerance coefficient (in %)
   */
  public add(
    firstAsset: Asset | AccountAsset,
    secondAsset: Asset | AccountAsset,
    firstAmount: NumberLike,
    secondAmount: NumberLike,
    slippageTolerance: NumberLike = this.root.defaultSlippageTolerancePercent
  ): Promise<T> {
    assert(this.root.account, Messages.connectWallet);

    const [baseAsset, targetAsset, baseAssetAmount, targetAssetAmount, DEXId] = this.arrangeAssetsForParams(
      firstAsset,
      secondAsset,
      firstAmount,
      secondAmount
    );

    const params = this.calcAddTxParams(
      baseAsset,
      targetAsset,
      baseAssetAmount,
      targetAssetAmount,
      slippageTolerance,
      DEXId
    );

    this.root.assets.addAccountAsset(secondAsset.address);

    return this.root.submitExtrinsic(
      (this.root.api.tx.poolXYK as any).depositLiquidity(...params.args),
      this.root.account.pair,
      {
        type: Operation.AddLiquidity,
        symbol: firstAsset.symbol,
        assetAddress: firstAsset.address,
        symbol2: secondAsset.symbol,
        asset2Address: secondAsset.address,
        amount: `${firstAmount}`,
        amount2: `${secondAmount}`,
        decimals: firstAsset.decimals,
        decimals2: secondAsset.decimals,
      }
    );
  }

  private async calcCreateTxParams(
    firstAsset: Asset | AccountAsset,
    secondAsset: Asset | AccountAsset,
    firstAmount: NumberLike,
    secondAmount: NumberLike,
    slippageTolerance: NumberLike = this.root.defaultSlippageTolerancePercent
  ) {
    const [baseAsset, targetAsset, baseAssetAmount, targetAssetAmount, DEXId] = this.arrangeAssetsForParams(
      firstAsset,
      secondAsset,
      firstAmount,
      secondAmount,
      true
    );

    const baseAssetAllowed = this.root.dex.poolBaseAssetsIds.includes(baseAsset.address);
    assert(baseAssetAllowed, Messages.pairBaseAssetNotAllowed);
    const exists = await this.check(baseAsset.address, targetAsset.address);
    assert(!exists, Messages.pairAlreadyCreated);

    const params = this.calcAddTxParams(
      baseAsset,
      targetAsset,
      baseAssetAmount,
      targetAssetAmount,
      slippageTolerance,
      DEXId
    );
    return {
      pairCreationArgs: [DEXId, baseAsset.address, targetAsset.address],
      addLiquidityArgs: params.args,
      baseAssetAmount,
      targetAssetAmount,
    };
  }

  /**
   * Create token pair if user is the first liquidity provider and pair is not created.
   * Before it you should check liquidity
   * (`checkLiquidity()` -> `false`).
   *
   * Condition: Account **must** have CAN_MANAGE_DEX( DEXId ) permission,
   * XOR asset **should** be required for any pair
   * @param firstAsset
   * @param secondAsset
   * @param firstAmount
   * @param secondAmount
   * @param slippageTolerance Slippage tolerance coefficient (in %)
   */
  public async create(
    firstAsset: Asset | AccountAsset,
    secondAsset: Asset | AccountAsset,
    firstAmount: NumberLike,
    secondAmount: NumberLike,
    slippageTolerance: NumberLike = this.root.defaultSlippageTolerancePercent
  ): Promise<T> {
    assert(this.root.account, Messages.connectWallet);

    const params = await this.calcCreateTxParams(firstAsset, secondAsset, firstAmount, secondAmount, slippageTolerance);
    const [dexId, baseAddress, targetAddress] = params.pairCreationArgs;
    const isPairAlreadyCreated = await this.root.api.rpc.tradingPair.isPairEnabled(dexId, baseAddress, targetAddress);

    const transactions: Array<any> = [];
    if (!isPairAlreadyCreated.isTrue) {
      transactions.push((this.root.api.tx.tradingPair as any).register(...params.pairCreationArgs));
    }
    transactions.push(
      ...[
        (this.root.api.tx.poolXYK as any).initializePool(...params.pairCreationArgs),
        (this.root.api.tx.poolXYK as any).depositLiquidity(...params.addLiquidityArgs),
      ]
    );

    this.root.assets.addAccountAsset(secondAsset.address);

    return this.root.submitExtrinsic(this.root.api.tx.utility.batchAll(transactions), this.root.account.pair, {
      type: Operation.CreatePair,
      symbol: firstAsset.symbol,
      assetAddress: firstAsset.address,
      symbol2: secondAsset.symbol,
      asset2Address: secondAsset.address,
      amount: `${params.baseAssetAmount}`,
      amount2: `${params.targetAssetAmount}`,
    });
  }

  private calcRemoveTxParams(
    firstAsset: Asset | AccountAsset,
    secondAsset: Asset | AccountAsset,
    desiredMarker: string,
    firstTotal: CodecString,
    secondTotal: CodecString,
    totalSupply: CodecString,
    slippageTolerance: NumberLike = this.root.defaultSlippageTolerancePercent
  ) {
    assert(this.root.account, Messages.connectWallet);

    const isChameleonPair = isChameleon(firstAsset.address, secondAsset.address);

    const poolToken = this.getInfo(isChameleonPair ? XOR.address : firstAsset.address, secondAsset.address);
    const desired = new FPNumber(desiredMarker, poolToken?.decimals);
    const reserveA = FPNumber.fromCodecValue(firstTotal, firstAsset.decimals);
    const reserveB = FPNumber.fromCodecValue(secondTotal, secondAsset.decimals);
    const pts = FPNumber.fromCodecValue(totalSupply, poolToken?.decimals);
    const desiredA = desired.mul(reserveA).div(pts);
    const desiredB = desired.mul(reserveB).div(pts);
    const slippage = new FPNumber(Number(slippageTolerance) / 100);
    const dexId = this.root.dex.getDexId(firstAsset.address);
    // The order of args is important
    return {
      args: [
        dexId,
        firstAsset.address,
        secondAsset.address,
        desired.toCodecString(),
        desiredA.sub(desiredA.mul(slippage)).toCodecString(),
        desiredB.sub(desiredB.mul(slippage)).toCodecString(),
      ],
      // amountA, amountB - without slippage (for initial history)
      amountA: desiredA.toString(),
      amountB: desiredB.toString(),
    };
  }

  /**
   * Remove liquidity
   * @param firstAsset
   * @param secondAsset
   * @param desiredMarker
   * @param firstTotal getReserves()[0]
   * @param secondTotal getReserves()[1]
   * @param totalSupply Total supply coefficient, estimateTokensRetrieved()[2]
   * @param slippageTolerance Slippage tolerance coefficient (in %)
   */
  public remove(
    firstAsset: Asset | AccountAsset,
    secondAsset: Asset | AccountAsset,
    desiredMarker: string,
    firstTotal: CodecString,
    secondTotal: CodecString,
    totalSupply: CodecString,
    slippageTolerance: NumberLike = this.root.defaultSlippageTolerancePercent
  ): Promise<T> {
    assert(this.root.account, Messages.connectWallet);

    const params = this.calcRemoveTxParams(
      firstAsset,
      secondAsset,
      desiredMarker,
      firstTotal,
      secondTotal,
      totalSupply,
      slippageTolerance
    );
    return this.root.submitExtrinsic(
      (this.root.api.tx.poolXYK as any).withdrawLiquidity(...params.args),
      this.root.account.pair,
      {
        type: Operation.RemoveLiquidity,
        symbol: firstAsset.symbol,
        assetAddress: firstAsset.address,
        symbol2: secondAsset.symbol,
        asset2Address: secondAsset.address,
        amount: params.amountA,
        amount2: params.amountB,
      }
    );
  }
}
