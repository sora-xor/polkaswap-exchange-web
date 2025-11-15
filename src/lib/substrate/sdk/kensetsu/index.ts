import { map, Observable, combineLatest, distinctUntilChanged } from 'rxjs';
import { assert } from '@polkadot/util';
import { FPNumber, NumberLike } from '@sora-substrate/math';
import { PriceVariant, QuotePayload, getAveragePrice } from '@sora-substrate/liquidity-proxy';
import type { BandBandRate, KensetsuCollateralInfo, KensetsuCollateralizedDebtPosition } from '@polkadot/types/lookup';
import type { Vec, u128, Option } from '@polkadot/types-codec';
import type { Percent } from '@polkadot/types/interfaces/runtime';

import { Messages } from '../logger';
import { Operation } from '../types';
import { toAssetId } from '../assets';
import { DAI, KUSD, KXOR } from '../assets/consts';
import { VaultTypes } from './consts';
import type { Api } from '../api';
import type { AccountAsset, Asset } from '../assets/types';
import type { AveragePrice, BorrowTaxes, Collateral, StablecoinInfo, Vault } from './types';

export class KensetsuModule<T> {
  constructor(private readonly root: Api<T>) {}

  /** {lockedAssetId},{debtAssetId} serialization */
  serializeKey(lockedAssetId: string, debtAssetId: string): string {
    if (!(lockedAssetId && debtAssetId)) return '';
    return `${lockedAssetId},${debtAssetId}`;
  }

  /** {lockedAssetId},{debtAssetId} deserialization -> { lockedAssetId: string; debtAssetId: string; } */
  deserializeKey(key: string): Partial<{ lockedAssetId: string; debtAssetId: string }> | null {
    if (!key) return null;
    const [lockedAssetId, debtAssetId] = key.split(',');
    return { lockedAssetId, debtAssetId };
  }

  private getPricesObservable(...assets: Array<string>): Observable<Record<string, AveragePrice>> {
    const observables = assets.map((id) => this.root.apiRx.query.priceTools.fastPriceInfos(id));
    return combineLatest(observables).pipe(
      map((prices) => {
        return prices.reduce<Record<string, AveragePrice>>((acc, codec, index) => {
          const key = assets[index];
          const info = codec.unwrapOr(null);
          acc[key] = {
            [PriceVariant.Buy]: info?.buy.averagePrice.toString() ?? '0',
            [PriceVariant.Sell]: info?.sell.averagePrice.toString() ?? '0',
          };
          return acc;
        }, {});
      }),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
    );
  }

  private getAveragePriceObservable(
    assetA: string,
    assetB: string,
    priceVariant: PriceVariant
  ): Observable<FPNumber | null> {
    return this.getPricesObservable(assetA, assetB).pipe(
      map((prices) => {
        try {
          const payload = { prices } as QuotePayload;
          return getAveragePrice(assetA, assetB, priceVariant, payload);
        } catch (error) {
          console.warn(`[Kensetsu] getAveragePriceObservable for ${assetA} and ${assetB}`, error);
          return null;
        }
      })
    );
  }

  /**
   * Returns the average price of the locked asset in the debt asset.
   * It uses the average price from the liquidity proxy if debt asset has SORA based nature.
   * Otherwise, it uses the average price from the liquidity proxy for the locked asset in DAI and the oracle rate for the debt asset.
   *
   * Returns `null` if the pair is DAI/KUSD because it has a fixed price 1:1.
   * Also, it returns `null` if there is no stablecoin info.
   */
  subscribeOnAveragePrice(
    lockedAssetId: string,
    debtAssetId: string,
    info?: StablecoinInfo
  ): Observable<FPNumber | null> | null {
    if (lockedAssetId === DAI.address && debtAssetId === KUSD.address) {
      return null; // Exclude DAI/KUSD pair because it has a fixed price 1:1
    }
    if (!info) {
      console.warn(`[Kensetsu] subscribeOnAveragePrice: no stablecoin info for ${debtAssetId} / ${lockedAssetId}`);
      return null;
    }
    if (info.isSoraAsset) {
      const pegAssetId = info.pegAsset;
      return this.getAveragePriceObservable(lockedAssetId, pegAssetId, PriceVariant.Sell);
    } else {
      const pegSymbol = info.pegAsset;
      const observables: [Observable<Option<BandBandRate>>, Observable<FPNumber | null>?] = [
        this.root.apiRx.query.band.symbolRates(pegSymbol),
      ];

      if (lockedAssetId !== DAI.address) {
        observables.push(this.getAveragePriceObservable(lockedAssetId, DAI.address, PriceVariant.Sell));
      }

      return combineLatest(observables).pipe(
        map(([rate, collateralPriceInDai]) => {
          const rateValue = rate.unwrapOr(null)?.value.toString();
          if (!rateValue) return null;

          const oraclePrice = FPNumber.fromCodecValue(rateValue);
          if (oraclePrice.isZero()) return null;

          return (collateralPriceInDai ?? FPNumber.ONE).div(oraclePrice);
        })
      );
    }
  }

  /**
   * Usage: general system parameters, statistical information
   *
   * @returns Stablecoin infos as `Record<string, StablecoinInfo>` where key is the asset address and value is the amount of bad debt and peg asset id
   */
  async getStablecoinInfos(): Promise<Record<string, StablecoinInfo>> {
    const stablecoinInfos = await this.root.api.query.kensetsu.stablecoinInfos.entries();
    return stablecoinInfos.reduce<Record<string, StablecoinInfo>>((acc, item) => {
      const [key, value] = item;

      const assetId = toAssetId(key.args[0]);
      const info = value.unwrapOr(null);
      if (!info) return acc;

      const pegAssetObj = info.stablecoinParameters.pegAsset;
      const isSoraAsset = pegAssetObj.isSoraAssetId;
      const pegAsset = isSoraAsset
        ? toAssetId(pegAssetObj.asSoraAssetId)
        : (pegAssetObj.asOracleSymbol.toHuman() as string);
      const badDebt = new FPNumber(info.badDebt);

      acc[assetId] = { badDebt, pegAsset, isSoraAsset };
      return acc;
    }, {});
  }

  /**
   * Usage: general system parameters, statistical information
   *
   * Stablecoin infos as `Record<string, StablecoinInfo>` where key is the asset address and value is the amount of bad debt and peg asset id
   */
  async subscribeOnStablecoinInfos(): Promise<Observable<Record<string, StablecoinInfo>>> {
    const keys = await this.root.api.query.kensetsu.stablecoinInfos.keys();
    const assetIds = keys.map((key) => toAssetId(key.args[0]));

    return this.root.apiRx.query.kensetsu.stablecoinInfos.multi(assetIds).pipe(
      map((infos) => {
        return infos.reduce<Record<string, StablecoinInfo>>((acc, value, index) => {
          const assetId = assetIds[index];
          const info = value.unwrapOr(null);
          if (!info) return acc;

          const pegAssetObj = info.stablecoinParameters.pegAsset;
          const isSoraAsset = pegAssetObj.isSoraAssetId;
          const pegAsset = isSoraAsset ? toAssetId(pegAssetObj.asSoraAssetId) : pegAssetObj.asOracleSymbol.toString();
          const badDebt = new FPNumber(info.badDebt);

          acc[assetId] = { badDebt, pegAsset, isSoraAsset };
          return acc;
        }, {});
      })
    );
  }

  /**
   * @example If you had a cdp where you had 100 XOR for 100 KUSD and it became unsafe,
   * these 100 KUSD were sold, of which 10 KUSD went to protocol revenue and 90 KUSD to closing the debt,
   * if liquidationPenalty = 10%
   */
  async getLiquidationPenalty(): Promise<number> {
    const liquidationPenalty = await this.root.api.query.kensetsu.liquidationPenalty();
    return liquidationPenalty.toNumber();
  }

  /**
   * @example If you had a cdp where you had 100 XOR for 100 KUSD and it became unsafe,
   * these 100 KUSD were sold, of which 10 KUSD went to protocol revenue and 90 KUSD to closing the debt,
   * if liquidationPenalty = 10%
   */
  subscribeOnLiquidationPenalty(): Observable<number> {
    return this.root.apiRx.query.kensetsu.liquidationPenalty().pipe(map((res) => res.toNumber()));
  }

  /**
   * Usage: statistical information
   * Returns the number about how much cdp were created
   */
  async getCdpCount(): Promise<number> {
    const nextCDPId = await this.root.api.query.kensetsu.nextCDPId();
    return nextCDPId.toNumber();
  }

  /**
   * Usage: statistical information
   * Returns the subscription on the number about how much cdp were created
   */
  subscribeOnCdpCount(): Observable<number> {
    return this.root.apiRx.query.kensetsu.nextCDPId().pipe(map((res) => res.toNumber()));
  }

  /**
   * Usage: general system parameters, debt calculation, statistical information
   *
   * Returns the tax for borrowing stablecoin in %
   */
  async getBorrowTax(): Promise<number> {
    const borrowTax = await this.root.api.query.kensetsu.borrowTax();
    return borrowTax.toNumber();
  }

  /**
   * Returns the subscription on the tax for borrowing stablecoin in %
   */
  subscribeOnBorrowTax(): Observable<number> {
    return this.root.apiRx.query.kensetsu.borrowTax().pipe(map((res) => res.toNumber()));
  }

  /**
   * Returns the TBCD tax in %
   */
  async getTbcdBorrowTax(): Promise<number> {
    const borrowTax = await this.root.api.query.kensetsu.tbcdBorrowTax();
    return borrowTax.toNumber();
  }

  /**
   * Returns the subscription on the TBCD tax in %
   */
  subscribeOnTbcdBorrowTax(): Observable<number> {
    return this.root.apiRx.query.kensetsu.tbcdBorrowTax().pipe(map((res) => res.toNumber()));
  }

  /**
   * Returns the KARMA tax in %
   */
  async getKarmaBorrowTax(): Promise<number> {
    const borrowTax = await this.root.api.query.kensetsu.karmaBorrowTax();
    return borrowTax.toNumber();
  }

  /**
   * Returns the subscription on the KARMA tax in %
   */
  subscribeOnKarmaBorrowTax(): Observable<number> {
    return this.root.apiRx.query.kensetsu.karmaBorrowTax().pipe(map((res) => res.toNumber()));
  }

  async getBorrowTaxes(): Promise<BorrowTaxes> {
    const [tax, tbcdTax, karmaTax] = await this.root.api.queryMulti<Array<Percent>>([
      this.root.api.query.kensetsu.borrowTax as any,
      this.root.api.query.kensetsu.tbcdBorrowTax,
      this.root.api.query.kensetsu.karmaBorrowTax,
    ]);
    return { borrowTax: tax.toNumber(), tbcdBorrowTax: tbcdTax.toNumber(), karmaBorrowTax: karmaTax.toNumber() };
  }

  subscribeOnBorrowTaxes(): Observable<BorrowTaxes> {
    return this.root.apiRx
      .queryMulti<
        Array<Percent>
      >([this.root.apiRx.query.kensetsu.borrowTax as any, this.root.apiRx.query.kensetsu.tbcdBorrowTax, this.root.apiRx.query.kensetsu.karmaBorrowTax])
      .pipe(
        map(([tax, tbcdTax, karmaTax]) => ({
          borrowTax: tax.toNumber(),
          tbcdBorrowTax: tbcdTax.toNumber(),
          karmaBorrowTax: karmaTax.toNumber(),
        }))
      );
  }

  /**
   * Returns the total borrow tax based on debt asset, in %
   * @param debtAsset Debt asset or its address
   * @param borrowTax Onchain borrow tax in %
   * @param tbcdBorrowTax Onchain TBCD borrow tax in %
   * @param karmaBorrowTax Onchain KARMA borrow tax in %
   */
  calcTax(
    debtAsset: Asset | AccountAsset | string,
    borrowTax: number,
    tbcdBorrowTax: number,
    karmaBorrowTax: number
  ): number {
    const debtAddress = typeof debtAsset === 'string' ? debtAsset : debtAsset.address;
    if (debtAddress === KXOR.address) return borrowTax + tbcdBorrowTax + karmaBorrowTax;

    return borrowTax;
  }

  // update_collateral_interest_coefficient
  updateCollateralInterestCoefficient(collateral: Collateral): FPNumber | null {
    const now = Math.floor(Date.now() / 1000);
    if (now <= collateral.lastFeeUpdateTimeSecs) return null; // do nothing cuz it's already updated

    const timePassed = now - collateral.lastFeeUpdateTimeSecs;
    const collateralInterestCoeff = collateral.interestCoefficient;
    const stabilityFeeSecs = collateral.riskParams.stabilityFeeSecs;
    // interest_coefficient * ((1 + stability_fee_secs) ^ time_passed)
    return collateralInterestCoeff.mul(FPNumber.ONE.add(stabilityFeeSecs).pow(timePassed));
  }

  // accrue_internal
  calcNewDebt(collateral: Collateral, vault: Vault | null): FPNumber | null {
    if (!vault) return null;
    const newCoefficient = this.updateCollateralInterestCoefficient(collateral);
    if (!newCoefficient) return null;

    const vaultInterestCoefficient = vault.interestCoefficient;
    const vaultDebt = vault.internalDebt;

    const interestPercent = newCoefficient.sub(vaultInterestCoefficient).div(vaultInterestCoefficient);
    const stabilityFee = vaultDebt.mul(interestPercent);
    return vaultDebt.add(stabilityFee);
  }

  private formatCollateral(
    collateralInfo: KensetsuCollateralInfo,
    lockedAssetId: string,
    debtAssetId: string
  ): Collateral {
    // ratioReversed has Perbill type = 1_000_000_000 decimals * 100 because of %, so we set decimals = 9 - 2 = 7
    const ratioReversed = new FPNumber(collateralInfo.riskParameters.liquidationRatio, 7);
    const ratio = FPNumber.ONE.div(ratioReversed).mul(FPNumber.TEN_THOUSANDS);
    // collateralInfo.riskParameters.stabilityFeeRate is presented in seconds
    const stabilityFeeSecs = new FPNumber(collateralInfo.riskParameters.stabilityFeeRate);
    // stability_fee_annual = (1 + stability_fee_in_seconds) ^ 31_556_952 - 1; 31_556_952 - seconds in a year (an average Gregorian year has 365.2425 days)
    const stabilityFeeAnnual = FPNumber.ONE.add(stabilityFeeSecs).pow(31_556_952).sub(1).mul(100).dp(2); // * 100 (to %)
    const formatted: Collateral = {
      lockedAssetId,
      debtAssetId,
      lastFeeUpdateTimeSecs: collateralInfo.lastFeeUpdateTime.toNumber(),
      interestCoefficient: new FPNumber(collateralInfo.interestCoefficient),
      debtSupply: new FPNumber(collateralInfo.stablecoinSupply),
      totalLocked: new FPNumber(collateralInfo.totalCollateral),
      riskParams: {
        liquidationRatio: ratio.toNumber(2),
        liquidationRatioReversed: ratioReversed.toNumber(2),
        hardCap: new FPNumber(collateralInfo.riskParameters.hardCap),
        maxLiquidationLot: new FPNumber(collateralInfo.riskParameters.maxLiquidationLot),
        stabilityFeeSecs,
        stabilityFeeAnnual,
        minDeposit: new FPNumber(collateralInfo.riskParameters.minimalCollateralDeposit),
      },
    };
    return formatted;
  }

  /**
   * Usage: statistical information, for instance, Explore page
   */
  async getCollateral(lockedAsset: Asset, debtAsset: Asset): Promise<Collateral | null> {
    const collateralAssetId = lockedAsset.address;
    const stablecoinAssetId = debtAsset.address;
    const data = await this.root.api.query.kensetsu.collateralInfos({ collateralAssetId, stablecoinAssetId });
    const collateralInfo: KensetsuCollateralInfo | null = data.unwrapOr(null);
    if (!collateralInfo) return null;
    return this.formatCollateral(collateralInfo, collateralAssetId, stablecoinAssetId);
  }

  subscribeOnCollateral(lockedAsset: Asset, debtAsset: Asset): Observable<Collateral | null> {
    const collateralAssetId = lockedAsset.address;
    const stablecoinAssetId = debtAsset.address;
    return this.root.apiRx.query.kensetsu.collateralInfos({ collateralAssetId, stablecoinAssetId }).pipe(
      map((data) => {
        const collateralInfo: KensetsuCollateralInfo | null = data.unwrapOr(null);
        if (!collateralInfo) return null;
        return this.formatCollateral(collateralInfo, collateralAssetId, stablecoinAssetId);
      })
    );
  }

  /**
   * Usage: statistical information & positions management
   */
  async getCollaterals(): Promise<Record<string, Collateral>> {
    const data = await this.root.api.query.kensetsu.collateralInfos.entries();

    return data.reduce<Record<string, Collateral>>((acc, item) => {
      const id = item[0].args[0];
      const lockedAssetId = toAssetId(id.collateralAssetId);
      const debtAssetId = toAssetId(id.stablecoinAssetId);
      const key = this.serializeKey(lockedAssetId, debtAssetId);
      const info: KensetsuCollateralInfo | null = item[1].unwrapOr(null);
      if (info) {
        acc[key] = this.formatCollateral(info, lockedAssetId, debtAssetId);
      }
      return acc;
    }, {});
  }

  private formatVault(data: KensetsuCollateralizedDebtPosition, id: number): Vault {
    const vault: Vault = {
      lockedAmount: new FPNumber(data.collateralAmount),
      debtAssetId: toAssetId(data.stablecoinAssetId),
      vaultType: VaultTypes.V2,
      debt: new FPNumber(data.debt),
      internalDebt: new FPNumber(data.debt),
      interestCoefficient: new FPNumber(data.interestCoefficient),
      owner: data.owner.toString(),
      lockedAssetId: toAssetId(data.collateralAssetId),
      id,
    };
    return vault;
  }

  async getVault(id: number): Promise<Vault | null> {
    const data = await this.root.api.query.kensetsu.cdpDepository(id);
    const vault = data.unwrapOr(null);
    if (!vault) return null;
    return this.formatVault(vault, id);
  }

  /**
   * Request all vaults.
   *
   * It utilizes a lot of resources
   */
  async getVaults(): Promise<Vault[]> {
    const data = await this.root.api.query.kensetsu.cdpDepository.entries();
    const vaults: Vault[] = [];
    for (const item of data) {
      const vault = item[1].unwrapOr(null);
      if (vault) {
        vaults.push(this.formatVault(vault, item[0].args[0].toNumber()));
      }
    }
    return vaults;
  }

  /**
   * Usage: the main entity for checking the vaults.
   */
  subscribeOnVault(id: number): Observable<Vault | null> {
    return this.root.apiRx.query.kensetsu.cdpDepository(id).pipe(
      map((data) => {
        const vault = data.unwrapOr(null);
        if (!vault) return null;
        return this.formatVault(vault, id);
      })
    );
  }

  async getAccountVaultIds(): Promise<number[]> {
    assert(this.root.account, Messages.connectWallet);

    const data = await this.root.api.query.kensetsu.cdpOwnerIndex(this.root.account.pair.address);
    const ids = data.unwrapOr([]) as Vec<u128>;

    return ids.map((id) => id.toNumber());
  }

  async getAccountVaults(): Promise<Vault[]> {
    assert(this.root.account, Messages.connectWallet);

    const data = await this.root.api.query.kensetsu.cdpOwnerIndex(this.root.account.pair.address);
    const ids = data.unwrapOr([]) as Vec<u128>;
    if (!ids.length) return [];

    const vaultsPromises = ids.map(async (id) => {
      const item = await this.root.api.query.kensetsu.cdpDepository(id);
      return { id: id.toNumber(), item };
    });
    const vaultsData = await Promise.all(vaultsPromises);

    const vaults: Vault[] = [];
    for (const { id, item } of vaultsData) {
      const vault = item.unwrapOr(null);
      if (vault) {
        vaults.push(this.formatVault(vault, id));
      }
    }
    return vaults;
  }

  subscribeOnAccountVaultIds(): Observable<number[]> {
    assert(this.root.account, Messages.connectWallet);

    return this.root.apiRx.query.kensetsu.cdpOwnerIndex(this.root.account.pair.address).pipe(
      map((data) => {
        const ids = data.unwrapOr([]) as Vec<u128>;
        return ids.map((item) => item.toNumber());
      })
    );
  }

  subscribeOnVaults(ids: number[]): Observable<Vault[]> {
    return this.root.apiRx.query.kensetsu.cdpDepository.multi(ids).pipe(
      map((data) => {
        const vaults: Vault[] = [];
        for (const [index, item] of data.entries()) {
          const id = ids[index];
          const vault = item.unwrapOr(null);
          if (vault) {
            vaults.push(this.formatVault(vault, id));
          }
        }
        return vaults;
      })
    );
  }

  /**
   * Create a new vault
   *
   * @param lockedAsset Locked asset
   * @param debtAsset Debt asset
   * @param collateralAmount Amount of collateral asset
   * @param borrowAmount Amount of debt asset which will be borrowed
   * @param slippageTolerance Slippage tolerance coefficient (in %)
   */
  createVault(
    lockedAsset: Asset | AccountAsset,
    debtAsset: Asset | AccountAsset,
    collateralAmount: NumberLike,
    borrowAmount: NumberLike,
    slippageTolerance: NumberLike = this.root.defaultSlippageTolerancePercent
  ): Promise<T> {
    assert(this.root.account, Messages.connectWallet);

    const assetAddress = lockedAsset.address;
    const asset2Address = debtAsset.address;
    const collateralCodec = new FPNumber(collateralAmount).codec;
    const borrow = new FPNumber(borrowAmount);

    const slippage = borrow.mul(Number(slippageTolerance) / 100);
    const minBorrowAmountCodec = borrow.sub(slippage).codec;

    return this.root.submitExtrinsic(
      this.root.api.tx.kensetsu.createCdp(
        assetAddress,
        collateralCodec,
        asset2Address,
        minBorrowAmountCodec,
        borrow.codec,
        'Type2'
      ),
      this.root.account.pair,
      {
        type: Operation.CreateVault,
        amount: `${collateralAmount}`,
        amount2: `${borrowAmount}`,
        assetAddress,
        asset2Address,
        symbol: lockedAsset.symbol,
        symbol2: debtAsset.symbol,
      }
    );
  }

  /**
   * Close user's vault (repay full debt & close vault)
   *
   * Be sure that the account has enough debt token amount for covering all the debt
   *
   * @param vault User's vault
   * @param collateralAsset Collateral asset; it's required to set it as well to have correct asset symbol in a history
   * @param debtAsset Debt asset; it's required to set it as well to have correct asset symbol in a history
   */
  closeVault(vault: Vault, collateralAsset: Asset | AccountAsset, debtAsset: Asset | AccountAsset): Promise<T> {
    assert(this.root.account, Messages.connectWallet);
    const vaultId = vault.id;
    const symbol = collateralAsset?.symbol ?? '';
    const symbol2 = debtAsset?.symbol ?? '';

    return this.root.submitExtrinsic(this.root.api.tx.kensetsu.closeCdp(vaultId), this.root.account.pair, {
      type: Operation.CloseVault,
      vaultId,
      amount: vault.lockedAmount.toString(),
      amount2: vault.debt.toString(),
      assetAddress: vault.lockedAssetId,
      symbol,
      asset2Address: vault.debtAssetId,
      symbol2,
    });
  }

  /**
   * Manual repay vault debt.
   *
   * If you want to repay everything and close vault then it's better to use `closeVault`
   *
   * @param vault User's vault
   * @param amount Amount of debt asset from the account which will cover the debt
   * @param debtAsset Debt asset; it's required to set it as well to have correct asset symbol in a history
   */
  repayVaultDebt(vault: Vault, amount: NumberLike, debtAsset: Asset | AccountAsset): Promise<T> {
    assert(this.root.account, Messages.connectWallet);
    const repayDebt = new FPNumber(amount);
    assert(vault.debt.gte(repayDebt), Messages.repayVaultDebtMoreThanDebt);
    const symbol = debtAsset?.symbol ?? '';

    return this.root.submitExtrinsic(
      this.root.api.tx.kensetsu.repayDebt(vault.id, repayDebt.codec),
      this.root.account.pair,
      {
        type: Operation.RepayVaultDebt,
        vaultId: vault.id,
        amount: `${amount}`,
        assetAddress: vault.debtAssetId,
        symbol,
      }
    );
  }

  /**
   * Deposit extra collateral to the existing vault
   *
   * @param vault User's vault
   * @param amount Collateral amount which will be deposited to the existing vault
   * @param collateralAsset Collateral asset; it's required to set it as well to have correct asset symbol in a history
   */
  depositCollateral(vault: Vault, amount: NumberLike, collateralAsset: Asset): Promise<T> {
    assert(this.root.account, Messages.connectWallet);
    const extraCollateralCodec = new FPNumber(amount).codec;
    const symbol = collateralAsset?.symbol ?? '';

    return this.root.submitExtrinsic(
      this.root.api.tx.kensetsu.depositCollateral(vault.id, extraCollateralCodec),
      this.root.account.pair,
      {
        type: Operation.DepositCollateral,
        vaultId: vault.id,
        amount: `${amount}`,
        assetAddress: vault.lockedAssetId,
        symbol,
      }
    );
  }

  /**
   * Borrow extra debt from the existing vault
   *
   * @param vault User's vault
   * @param amount Amount which will be borrowed to the existing vault
   * @param debtAsset Debt asset; it's required to set it as well to have correct asset symbol in a history
   * @param slippageTolerance Slippage tolerance coefficient (in %)
   */
  borrow(
    vault: Vault,
    amount: NumberLike,
    debtAsset: Asset | AccountAsset,
    slippageTolerance: NumberLike = this.root.defaultSlippageTolerancePercent
  ): Promise<T> {
    assert(this.root.account, Messages.connectWallet);
    const willToBorrow = new FPNumber(amount);
    const symbol = debtAsset?.symbol ?? '';
    const slippage = willToBorrow.mul(Number(slippageTolerance) / 100);
    const minWillToBorrowCodec = willToBorrow.sub(slippage).codec;

    return this.root.submitExtrinsic(
      this.root.api.tx.kensetsu.borrow(vault.id, minWillToBorrowCodec, willToBorrow.codec),
      this.root.account.pair,
      {
        type: Operation.BorrowVaultDebt,
        vaultId: vault.id,
        amount: `${amount}`,
        assetAddress: vault.debtAssetId,
        symbol,
      }
    );
  }
}
