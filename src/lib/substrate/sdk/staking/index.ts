import { assert } from '@polkadot/util';
import { FPNumber } from '@sora-substrate/math';
import { map } from 'rxjs';

import { Messages } from '../logger';
import { Operation } from '../types';
import { XOR, VAL } from '../assets/consts';
import {
  formatEra,
  formatPayee,
  formatNominations,
  formatValidatorExposure,
  formatIndividualRewardPoints,
} from './helpers';
import { StakingRewardsDestination } from './types';

import type { u32 } from '@polkadot/types-codec';
import type { Observable } from '@polkadot/types/types';
import type { KeyringPair } from '@polkadot/keyring/types';
import type { CodecString, NumberLike } from '@sora-substrate/math';
import type { Api } from '../api';
import type {
  ValidatorInfo,
  StashNominatorsInfo,
  ActiveEra,
  EraRewardPoints,
  ValidatorExposure,
  ElectedValidator,
  AccountStakingLedger,
  RewardPointsIndividual,
  ValidatorInfoFull,
  MyStakingInfo,
  NominatorReward,
  Payouts,
  Others,
  Identity,
  // EraElectionStatus,
} from './types';

/**
 * A value to convert the validator commission into a fractional number
 */
const COMMISSION_DECIMALS = 9;

/**
 * Check on other networks
 */
const COUNT_ERAS_IN_DAILY = 4;

/**
 * Check on other networks
 */
const COUNT_HOURS_IN_ERA = 6;

const COUNT_DAYS_IN_YEAR = 365;

export class StakingModule<T> {
  constructor(private readonly root: Api<T>) {}

  public getSignerPair(signerPair?: KeyringPair): KeyringPair {
    assert(this.root.account, Messages.connectWallet);

    const pair = signerPair || this.root.account.pair;
    assert(pair, Messages.provideAccountPair);

    return pair;
  }

  /**
   * Number of eras that staked funds must remain bonded for.
   * @returns bonding duration
   */
  public getBondingDuration(): number {
    return this.root.api.consts.staking.bondingDuration.toNumber();
  }

  /**
   * The maximum number of nominators rewarded for each validator.
   * @returns max nominators
   */
  public getMaxNominatorRewardedPerValidator(): number {
    return this.root.api.consts.staking.maxNominatorRewardedPerValidator.toNumber();
  }

  /**
   * Number of days that staked funds must remain bonded for.
   * @returns unbond period
   */
  public getUnbondPeriod(): number {
    const bondingDuration = this.getBondingDuration();

    return bondingDuration / COUNT_ERAS_IN_DAILY;
  }

  /**
   * Maximum number of nominations per nominator.
   * @returns max nominations
   */
  public getMaxNominations(): number {
    return this.root.api.consts.staking.maxNominations.toNumber();
  }

  /**
   * The minimum active bond to become and maintain the role of a nominator.
   * @returns min bond
   */
  public async getMinNominatorBond(): Promise<number> {
    return (await this.root.api.query.staking.minNominatorBond()).toNumber();
  }

  /**
   * Get observable session index
   *
   * Each era is divided into sessions.
   * Session defines an interval during which validators must submit heartbeat if they don’t produce blocks.
   * Another usage of sessions is that reward points are calculated per session.
   * Reward points are used to calculate reward for validators at the end of each era.
   * @returns session index
   */
  public getCurrentSessionObservable(): Observable<number> {
    return this.root.apiRx.query.session.currentIndex().pipe(map((data) => data.toNumber()));
  }

  /**
   * Get observable preferred validator count
   * Staking module provides a variable that describes the preferred number of validators needs to be elected per era
   * @returns validator count (69)
   */
  public getPreferredValidatorCountObservable(): Observable<number> {
    return this.root.apiRx.query.staking.validatorCount().pipe(map((data) => data.toNumber()));
  }

  /**
   * Get observable active era
   * @returns era index & era start timestamp
   */
  public getActiveEraObservable(): Observable<ActiveEra | null> {
    return this.root.apiRx.query.staking.activeEra().pipe(
      map((data) => {
        if (data.isEmpty) return null;

        const era = data.unwrap();
        const index = era.index.toNumber();
        const start = era.start.unwrapOrDefault().toNumber();

        return { index, start };
      })
    );
  }

  /**
   * Get history depth.
   * History depth - number of eras to keep in history.
   * @returns history depth
   */
  public getHistoryDepth(): number {
    const historyDepth = this.root.api.consts.staking.historyDepth;

    return historyDepth.toNumber();
  }

  /**
   * Get the current era index.
   * This is the latest planned era, depending on how the Session pallet queues the validator
   * set, it might be active or not.
   * @returns current era index
   */
  public async getCurrentEra(): Promise<number> {
    const data = await this.root.api.query.staking.currentEra();

    return formatEra(data);
  }

  /**
   * Get observable current era
   * @returns current era index
   */
  public getCurrentEraObservable(): Observable<number> {
    return this.root.apiRx.query.staking.currentEra().pipe(map(formatEra));
  }

  /**
   * Election status determines whether validator election is completed.
   * This value is very important from the point of view that many calls to the Staking module are only allowed when election is completed.
   * @returns election status of current era
   */
  // public getEraElectionStatusObservable(): Observable<EraElectionStatus> {
  //   return this.root.apiRx.query.staking.eraElectionStatus().pipe(
  //     map((electionStatus) => {
  //       return electionStatus.toJSON() as EraElectionStatus;
  //     })
  //   );
  // }

  /**
   * Get observable eras total stake
   * @param eraIndex index of era
   * @returns total stake balance in XOR (codec string)
   */
  public async getEraTotalStake(eraIndex: number): Promise<CodecString> {
    const erasTotalStake = await this.root.api.query.staking.erasTotalStake(eraIndex);

    return erasTotalStake.toString();
  }

  /**
   * Get observable eras total stake
   * @param eraIndex index of era
   * @returns total stake balance in XOR (codec string)
   */
  public getEraTotalStakeObservable(eraIndex: number): Observable<CodecString> {
    return this.root.apiRx.query.staking.erasTotalStake(eraIndex).pipe(map((data) => data.toString()));
  }

  /**
   * Get reward points of validators for era
   * @param eraIndex index of era
   * @returns validator points
   */
  public async getEraRewardPoints(eraIndex: number): Promise<RewardPointsIndividual> {
    const data = await this.root.api.query.staking.erasRewardPoints(eraIndex);

    return formatIndividualRewardPoints(data);
  }

  /**
   * Get observable reward points of validators for era
   * @param eraIndex index of era
   * @returns total points and validator points
   */
  public getEraRewardPointsObservable(eraIndex: number): Observable<EraRewardPoints> {
    return this.root.apiRx.query.staking.erasRewardPoints(eraIndex).pipe(
      map((data) => {
        const total = data.total.toNumber();
        const individual = formatIndividualRewardPoints(data);

        return { individual, total };
      })
    );
  }

  /**
   * **CONTROLLER**
   * CONTROLLER - STASH relation
   * Get observable information about stash address, locked funds and claimed rewards
   * @param controllerAddress address of controller account
   */
  public getAccountLedgerObservable(controllerAddress: string): Observable<AccountStakingLedger | null> {
    return this.root.apiRx.query.staking.ledger(controllerAddress).pipe(
      map((codec) => {
        if (codec.isEmpty) return null;

        const data = codec.unwrap();

        return {
          stash: data.stash.toString(),
          total: data.total.toString(),
          active: data.active.toString(),
          unlocking: data.unlocking.map((item) => ({ value: item.value.toString(), era: item.era.toNumber() })),
        };
      })
    );
  }

  /**
   * **CONTROLLER**
   * CONTROLLER - STASH relation
   * Get observable information about stash address, locked funds and claimed rewards
   * @param controllerAddress address of controller account
   */
  public async getStashByController(controllerAddress: string): Promise<string> {
    const codec = await this.root.api.query.staking.ledger(controllerAddress);

    if (codec.isEmpty) return '';

    const data = codec.unwrap();

    return data?.stash?.toString() ?? '';
  }

  /**
   * **STASH**
   * STASH - CONTROLLER relation
   * Get observable controller account address for stash account
   * @param stashAddress address of stash account
   */
  public getControllerObservable(stashAddress: string): Observable<string | null> {
    return this.root.apiRx.query.staking.bonded(stashAddress).pipe(
      map((data) => {
        if (data.isEmpty) return null;
        return data.unwrap().toString();
      })
    );
  }

  /**
   * **STASH**
   * Get observable rewards destination of stash account
   * @param stashAddress address of stash account
   * @returns rewards destination
   */
  public getPayeeObservable(stashAddress: string): Observable<StakingRewardsDestination | string> {
    return this.root.apiRx.query.staking.payee(stashAddress).pipe(
      map((data) => {
        if (data.isStaked) return StakingRewardsDestination.Staked;
        if (data.isController) return StakingRewardsDestination.Controller;
        if (data.isStash) return StakingRewardsDestination.Stash;
        if (data.isAccount) return data.value.toString();
        return StakingRewardsDestination.None;
      })
    );
  }

  /**
   * **STASH**
   * Get rewards destination of stash account
   * @param stashAddress address of stash account
   * @returns rewards destination
   */
  public async getPayee(stashAddress: string): Promise<StakingRewardsDestination | string> {
    const payee = await this.root.api.query.staking.payee(stashAddress);
    const payeeHuman = payee.toHuman();

    return typeof payeeHuman === 'string' ? payeeHuman : (payeeHuman as any).Account;
  }

  /**
   * Get all accounts which want to be a validator
   * @returns list of validators infos (address, commission, blocked)
   */
  public async getWannabeValidators(): Promise<ValidatorInfo[]> {
    const validators = (await this.root.api.query.staking.validators.entries()).map(([key, codec]) => {
      const address = key.args[0].toString();
      const { commission, blocked } = codec;

      return {
        address,
        blocked: blocked.isTrue,
        commission: commission.unwrap().toString(),
      };
    });

    return validators;
  }

  /**
   * Calculating average validator reward
   * @returns average validator reward
   */
  public async getAverageRewards(eraIndex?: number): Promise<FPNumber> {
    const erasValidatorRewardPallet = this.root.api.query.staking.erasValidatorReward;

    if (eraIndex && Number.isInteger(eraIndex)) {
      const erasValidatorReward = await erasValidatorRewardPallet(eraIndex);

      return new FPNumber(erasValidatorReward.value);
    }

    const erasValidatorReward = await erasValidatorRewardPallet.entries();
    const summaryRewards = erasValidatorReward.reduce((sum, [, eraReward]) => {
      const eraRewardValue = eraReward.value.toString();

      return sum.add(FPNumber.fromCodecValue(eraRewardValue));
    }, FPNumber.ZERO);

    if (!erasValidatorReward.length) return FPNumber.ZERO; // to avoid division by zero
    const averageRewards = summaryRewards.div(erasValidatorReward.length);

    return averageRewards;
  }

  /**
   * Calculate validator `apy: string`
   */
  public async calculateApy(
    totalStakeValidator: string,
    rewardToStakeRatio: string,
    eraTotalStake: string,
    eraAverageRewards: FPNumber,
    commission: string
  ): Promise<string> {
    const validatorTotalStake = FPNumber.fromCodecValue(totalStakeValidator);

    if (!validatorTotalStake.isFinity() || validatorTotalStake.isZero()) {
      return '0';
    }

    const validatorShareStake = validatorTotalStake.div(FPNumber.fromCodecValue(eraTotalStake));
    const stakeReturnReward = eraAverageRewards.mul(validatorShareStake);

    const stakeReturn = stakeReturnReward.mul(FPNumber.fromCodecValue(rewardToStakeRatio));
    const ratioReturnStakeToTotalStake = stakeReturn
      .div(validatorTotalStake)
      .mul(COUNT_ERAS_IN_DAILY)
      .mul(COUNT_DAYS_IN_YEAR);
    const nominatorShare = FPNumber.ONE.sub(FPNumber.fromCodecValue(commission, COMMISSION_DECIMALS));
    const apy = ratioReturnStakeToTotalStake.mul(100).mul(nominatorShare);

    return apy.toFixed(2);
  }

  /**
   * Get information about validators
   * @returns list of validators infos sorted by recommended
   */
  public async getValidatorsInfo(): Promise<ValidatorInfoFull[]> {
    const [wannabeValidators, currentEra, eraAverageRewards] = await Promise.all([
      this.getWannabeValidators(),
      this.getCurrentEra(),
      this.getAverageRewards(),
    ]);
    const [eraRewardPoints, electedValidators, eraTotalStake] = await Promise.all([
      this.getEraRewardPoints(currentEra),
      this.getElectedValidators(currentEra),
      this.getEraTotalStake(currentEra),
    ]);

    // TODO: use liquidity proxy quote; XOR based quote is used just for now
    const { amount: rewardToStakeRatio } = await this.root.swap.getResultFromDexRpc(VAL.address, XOR.address, 1);

    const validatorsPromises = wannabeValidators.map<Promise<ValidatorInfoFull>>(async ({ address, commission }) => {
      const electedValidator = electedValidators.find(({ address: _address }) => _address === address);
      const total = electedValidator?.total ?? '0';
      const rewardPoints = eraRewardPoints[address];

      const originalIdentity = (await this.root.getAccountOnChainIdentity(address))?.identity;
      const identity: Identity | null =
        originalIdentity !== null && originalIdentity !== undefined
          ? {
              ...originalIdentity,
              info: Object.fromEntries(
                Object.entries(originalIdentity?.info ?? {}).map(([key, value]) => {
                  if (value === 'None') return [key, ''];

                  if (!Array.isArray(value) && value?.Raw !== undefined) return [key, value?.Raw];

                  return [key, value];
                })
              ),
            }
          : null;
      const apy = await this.calculateApy(total, rewardToStakeRatio, eraTotalStake, eraAverageRewards, commission);

      const nominators: Others = electedValidator?.others ?? [];
      const maxNominatorRewardedPerValidator = this.getMaxNominatorRewardedPerValidator();
      const isOversubscribed = nominators.length > maxNominatorRewardedPerValidator;
      const knownGoodIndex = originalIdentity?.judgements?.findIndex(([, type]) => type === 'KnownGood');
      const isKnownGood = !!(knownGoodIndex && knownGoodIndex !== -1);

      return {
        address,
        commission: commission ?? '',
        rewardPoints,
        nominators,
        identity,
        apy,
        isOversubscribed,
        isKnownGood,
        stake: {
          total,
          own: electedValidator?.own ?? '0',
        },
      };
    });

    const validators = await Promise.all(validatorsPromises);

    // step 1 - apy DESC
    // step 2 - commission ASC
    // step 3 - identity, array of judgements have KnownGood element
    return validators.sort((validator1, validator2) => {
      const { apy: apy1, commission: commission1, isKnownGood: isKnownGood1 } = validator1;
      const { apy: apy2, commission: commission2, isKnownGood: isKnownGood2 } = validator2;

      const subtractionApy = new FPNumber(apy2).sub(apy1);

      if (!subtractionApy.isZero()) return subtractionApy.toNumber();

      const subtractionCommission = new FPNumber(commission1).sub(commission2);

      if (!subtractionCommission.isZero()) return subtractionCommission.toNumber();

      if (isKnownGood1 && !isKnownGood2) return -1;

      if (!isKnownGood1 && isKnownGood2) return 1;

      return 0;
    });
  }

  /**
   * Get my staking info
   * @returns staking info
   */
  public async getMyStakingInfo(address: string): Promise<MyStakingInfo> {
    const stakingDerive = await this.root.api?.derive.staking.account(address);

    const unlocking =
      stakingDerive.unlocking?.map(({ value, remainingEras: _remainingEras }) => {
        const remainingEras = new FPNumber(_remainingEras.toString());
        const remainingHours = remainingEras.mul(COUNT_HOURS_IN_ERA).toString();
        const remainingDays = remainingEras.div(COUNT_ERAS_IN_DAILY).toString();

        return {
          value: FPNumber.fromCodecValue(value.toString(), XOR.decimals).toString(),
          remainingEras: remainingEras.toString(),
          remainingHours,
          remainingDays,
        };
      }) ?? [];

    const sum = unlocking.reduce((sum, { value }) => sum.add(value), FPNumber.ZERO).toString();

    const stakingLedger = stakingDerive.stakingLedger;
    const activeStake = FPNumber.fromCodecValue(stakingLedger.active.toString(), XOR.decimals).toString();
    const totalStake = FPNumber.fromCodecValue(stakingLedger.total.toString(), XOR.decimals).toString();

    const myValidators = stakingDerive.nominators.map((item) => item.toHuman());
    const redeemAmount = FPNumber.fromCodecValue(stakingDerive.redeemable?.toString() ?? 0, XOR.decimals).toString();
    const controller = stakingDerive.controllerId?.toString() ?? '';

    const rewardDestination = (stakingDerive.rewardDestination?.toHuman() as string | { Account: string }) ?? '';
    const payee = typeof rewardDestination === 'string' ? rewardDestination : rewardDestination.Account;

    return {
      payee,
      controller,
      myValidators,
      redeemAmount,
      activeStake,
      totalStake,
      unbond: { unlocking, sum },
    };
  }

  /**
   * Get nominators reward
   * @returns nominators reward
   */
  public async getNominatorsReward(address: string): Promise<NominatorReward> {
    const stakerRewards = await this.root.api.derive.staking.stakerRewards(address);

    return stakerRewards.map(({ era, validators: _validators }) => {
      const validators = Object.entries(_validators).map(([address, { value }]) => ({
        address,
        value: FPNumber.fromCodecValue(value.toString(), VAL.decimals).toString(),
      }));

      return {
        era: era.toString(),
        sumRewards: validators.reduce((sum, { value }) => sum.add(value), FPNumber.ZERO).toString(),
        validators,
      };
    });
  }

  /**
   * Get a set of validators elected for a given era
   * @param eraIndex index of era
   * @param clipped flag to reduce 'others' list to biggest stakers
   * @returns a list of elected validators
   */
  public async getElectedValidators(eraIndex: number, clipped = false): Promise<ElectedValidator[]> {
    const storage = clipped ? this.root.api.query.staking.erasStakersClipped : this.root.api.query.staking.erasStakers;

    const validators = (await storage.entries(eraIndex)).map(([key, codec]) => {
      const address = key.args[1].toString();
      const data = formatValidatorExposure(codec);

      return { address, ...data };
    });

    return validators;
  }

  /**
   * Get validator exposure observable
   * @param eraIndex index of era
   * @param validatorAddress address of validator
   * @param clipped flag to reduce 'others' list to biggest stakers
   * @returns validator exposure
   */
  public getElectedValidatorObservable(
    eraIndex: number,
    validatorAddress: string,
    clipped = false
  ): Observable<ValidatorExposure> {
    const observable = clipped
      ? this.root.apiRx.query.staking.erasStakersClipped
      : this.root.apiRx.query.staking.erasStakers;

    return observable(eraIndex, validatorAddress).pipe(map(formatValidatorExposure));
  }

  /**
   * New set of validators for the current era starts working from the second session of the era and until the first session of the next era.
   * This request is used to fetch validators when EraStakers returns no validators during transition to the new era.
   * @returns list of validator addresses
   */
  public async getSessionValidators(): Promise<string[]> {
    const data = await this.root.api.query.session.validators();

    return data.map((id) => id.toString());
  }

  /**
   * **STASH**
   * Get validators nominated by stash
   * @param stashAddress address of stash account
   * @returns The structure with the list of validators, eraIndex
   */
  public async getNominations(stashAddress: string): Promise<StashNominatorsInfo | null> {
    const codec = await this.root.api.query.staking.nominators(stashAddress);

    return formatNominations(codec);
  }

  /**
   * **STASH**
   * Get observable validators nominated by stash
   * @param stashAddress address of stash account
   * @returns The structure with the list of validators, eraIndex
   */
  public getNominationsObservable(stashAddress: string): Observable<StashNominatorsInfo | null> {
    return this.root.apiRx.query.staking.nominators(stashAddress).pipe(map(formatNominations));
  }

  /**
   * Calc bond tx params
   * @param value amount to bond (XOR)
   * @param controller address of controller account
   * @param payee destination of rewards (one of payee or specific account address for payments)
   * @returns
   */
  private calcBondParams(
    value: NumberLike,
    controller: string,
    payee: StakingRewardsDestination | string
  ): [string, string, string | { Account: string }] {
    const amount = new FPNumber(value, XOR.decimals).toCodecString();
    const destination = formatPayee(payee);

    return [controller, amount, destination];
  }

  /**
   * **STASH**
   * Lock the stake
   * @param args.value amount to bond (XOR)
   * @param args.controller address of controller account
   * @param args.payee destination of rewards (one of payee or account address for payments)
   * @param signerPair account pair for transaction sign (otherwise the connected account will be used)
   */
  public async bond(
    args: { value: NumberLike; controller: string; payee: StakingRewardsDestination | string },
    signerPair?: KeyringPair
  ): Promise<T> {
    const pair = this.getSignerPair(signerPair);
    const params = this.calcBondParams(args.value, args.controller, args.payee);

    return this.root.submitExtrinsic(this.root.api.tx.staking.bond(...params), pair, {
      type: Operation.StakingBond,
      symbol: XOR.symbol,
      assetAddress: XOR.address,
      amount: `${args.value}`,
    });
  }

  /**
   * **STASH**
   * Lock the stake
   * @param args.value amount to bond (XOR)
   * @param args.controller address of controller account
   * @param args.payee destination of rewards (one of payee or account address for payments)
   * @param args.validators list of validators addresses to nominate
   * @param signerPair account pair for transaction sign (otherwise the connected account will be used)
   */
  public async bondAndNominate(
    args: { value: NumberLike; controller: string; payee: StakingRewardsDestination | string; validators: string[] },
    signerPair?: KeyringPair
  ): Promise<T> {
    const pair = this.getSignerPair(signerPair);
    const params = this.calcBondParams(args.value, args.controller, args.payee);

    const transactions = [this.root.api.tx.staking.bond(...params), this.root.api.tx.staking.nominate(args.validators)];

    const call = this.root.api.tx.utility.batchAll(transactions);

    return this.root.submitExtrinsic(call, pair, {
      type: Operation.StakingBondAndNominate,
      symbol: XOR.symbol,
      assetAddress: XOR.address,
      amount: `${args.value}`,
      validators: args.validators,
    });
  }

  public async getBondAndNominateNetworkFee(args: {
    value: NumberLike;
    controller: string;
    payee: StakingRewardsDestination | string;
    validators: string[];
  }): Promise<CodecString> {
    const params = this.calcBondParams(args.value, args.controller, args.payee);
    const transactions = [this.root.api.tx.staking.bond(...params), this.root.api.tx.staking.nominate(args.validators)];
    const call = this.root.api.tx.utility.batchAll(transactions);

    return await this.root.getTransactionFee(call);
  }

  /**
   * **STASH**
   * Add more funds to an existing stake
   * @param args.value amount add to stake
   * @param signerPair account pair for transaction sign (otherwise the connected account will be used)
   */
  public async bondExtra(args: { value: NumberLike }, signerPair?: KeyringPair): Promise<T> {
    const pair = this.getSignerPair(signerPair);

    return this.root.submitExtrinsic(
      this.root.api.tx.staking.bondExtra(new FPNumber(args.value, XOR.decimals).toCodecString()),
      pair,
      {
        type: Operation.StakingBondExtra,
        symbol: XOR.symbol,
        assetAddress: XOR.address,
        amount: `${args.value}`,
      }
    );
  }

  /**
   * **CONTROLLER**
   * Lock again part of currently unlocking value
   * @param args.value amount to lock in stake
   * @param signerPair account pair for transaction sign (otherwise the connected account will be used)
   */
  public async rebond(args: { value: NumberLike }, signerPair?: KeyringPair): Promise<T> {
    const pair = this.getSignerPair(signerPair);

    return this.root.submitExtrinsic(
      this.root.api.tx.staking.rebond(new FPNumber(args.value, XOR.decimals).toCodecString()),
      pair,
      {
        type: Operation.StakingRebond,
        symbol: XOR.symbol,
        assetAddress: XOR.address,
        amount: `${args.value}`,
      }
    );
  }

  /**
   * **CONTROLLER**
   * To withdraw part of the staked amount a user must perform unbounding firstly
   * @param args.value amount to unbond from stake
   * @param signerPair account pair for transaction sign (otherwise the connected account will be used)
   */
  public async unbond(args: { value: NumberLike }, signerPair?: KeyringPair): Promise<T> {
    const pair = this.getSignerPair(signerPair);

    return this.root.submitExtrinsic(
      this.root.api.tx.staking.unbond(new FPNumber(args.value, XOR.decimals).toCodecString()),
      pair,
      {
        type: Operation.StakingUnbond,
        symbol: XOR.symbol,
        assetAddress: XOR.address,
        amount: `${args.value}`,
      }
    );
  }

  /**
   * Get slashing spans
   * slashingSpans parameter is needed to ensure
   * that the user agrees that staking information will be removed when there is no unlocking items pending
   * and active value goes below minimum_balance due to slashing.
   * @param stashAddress address of stash account
   * @returns slashing spans
   */
  private async getSlashingSpans(stashAddress: string): Promise<u32> {
    const { value } = await this.root.api.query.staking.slashingSpans(stashAddress);

    return value.spanIndex;
  }

  /**
   * **CONTROLLER**
   * Moves unlocked value to the free balance of the stash account
   * @param args.value amount to withdraw - not used in extrinsic call, but can be passed to save this value in history
   * @param signerPair account pair for transaction sign (otherwise the connected account will be used)
   */
  public async withdrawUnbonded(args: { value?: NumberLike }, signerPair?: KeyringPair): Promise<T> {
    const pair = this.getSignerPair(signerPair);
    const slashingSpans = await this.getSlashingSpans(pair.address);

    return this.root.submitExtrinsic(this.root.api.tx.staking.withdrawUnbonded(slashingSpans), pair, {
      type: Operation.StakingWithdrawUnbonded,
      symbol: XOR.symbol,
      assetAddress: XOR.address,
      amount: args.value ? `${args.value}` : undefined,
    });
  }

  /**
   * **CONTROLLER**
   * Start nominating a list of validators from the next era
   * @param args.validators list of validators addresses to nominate
   * @param signerPair account pair for transaction sign (otherwise the connected account will be used)
   */
  public async nominate(args: { validators: string[] }, signerPair?: KeyringPair): Promise<T> {
    const pair = this.getSignerPair(signerPair);

    return this.root.submitExtrinsic(this.root.api.tx.staking.nominate(args.validators), pair, {
      type: Operation.StakingNominate,
      validators: args.validators,
    });
  }

  public async getNominateNetworkFee(args: { validators: string[] }): Promise<CodecString> {
    return await this.root.getTransactionFee(this.root.api.tx.staking.nominate(args.validators));
  }

  /**
   * **CONTROLLER**
   * Stop nominating or validating from the next era.
   * @param signerPair account pair for transaction sign (otherwise the connected account will be used)
   */
  public async chill(signerPair?: KeyringPair): Promise<T> {
    const pair = this.getSignerPair(signerPair);

    return this.root.submitExtrinsic(this.root.api.tx.staking.chill(), pair, {
      type: Operation.StakingChill,
    });
  }

  /**
   * **CONTROLLER**
   * Changes new account to which staking reward is sent starting from the next era
   * @param args.payee rewards destination
   * @param signerPair account pair for transaction sign (otherwise the connected account will be used)
   */
  public async setPayee(args: { payee: StakingRewardsDestination | string }, signerPair?: KeyringPair): Promise<T> {
    const pair = this.getSignerPair(signerPair);
    const destination = formatPayee(args.payee);

    return this.root.submitExtrinsic(this.root.api.tx.staking.setPayee(destination), pair, {
      type: Operation.StakingSetPayee,
      payee: args.payee,
    });
  }

  /**
   * **STASH**
   * Set new controller for the current stash starting from the next era
   * @param args.address address of controller account
   * @param signerPair account pair for transaction sign (otherwise the connected account will be used)
   */
  public async setController(args: { address: string }, signerPair?: KeyringPair): Promise<T> {
    const pair = this.getSignerPair(signerPair);

    return this.root.submitExtrinsic(this.root.api.tx.staking.setController(args.address), pair, {
      type: Operation.StakingSetController,
      controller: args.address,
    });
  }

  /**
   * Distribute payout for staking in a given era for given validators
   * @param args.payouts
   * @param args.payee rewards destination
   * @param signerPair account pair for transaction sign (otherwise the connected account will be used)
   */
  public async payout(
    args: { payouts: Payouts; payee?: StakingRewardsDestination | string },
    signerPair?: KeyringPair
  ): Promise<T> {
    const pair = this.getSignerPair(signerPair);
    const transactions = args.payouts
      .map(({ era, validators }) => validators.map((address) => this.root.api.tx.staking.payoutStakers(address, era)))
      .flat();
    const destination = args.payee ? formatPayee(args.payee) : null;
    const setPayeeTransaction = destination ? this.root.api.tx.staking.setPayee(destination) : null;
    if (setPayeeTransaction) {
      transactions.unshift(setPayeeTransaction);
    }
    const call = transactions.length > 1 ? this.root.api.tx.utility.batchAll(transactions) : transactions[0];

    return this.root.submitExtrinsic(call, pair, {
      type: Operation.StakingPayout,
      payouts: args.payouts,
    });
  }

  public async getPayoutNetworkFee(args: {
    payouts: Payouts;
    payee?: StakingRewardsDestination | string;
  }): Promise<CodecString> {
    const transactions = args.payouts
      .map(({ era, validators }) => validators.map((address) => this.root.api.tx.staking.payoutStakers(address, era)))
      .flat();
    const destination = args.payee ? formatPayee(args.payee) : null;
    const setPayeeTransaction = destination ? this.root.api.tx.staking.setPayee(destination) : null;
    if (setPayeeTransaction) {
      transactions.unshift(setPayeeTransaction);
    }
    const call = transactions.length > 1 ? this.root.api.tx.utility.batchAll(transactions) : transactions[0];
    return await this.root.getTransactionFee(call);
  }
}
