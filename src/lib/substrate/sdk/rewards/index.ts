import { assert } from '@polkadot/util';
import { map, combineLatest } from 'rxjs';
import { FPNumber, CodecString } from '@sora-substrate/math';
import type { Observable, Codec, AnyFunction } from '@polkadot/types/types';
import type { Vec, u128 } from '@polkadot/types-codec';
import type { ITuple } from '@polkadot/types-codec/types';
import type { CommonPrimitivesAssetId32 } from '@polkadot/types/lookup';
import type { SubmittableExtrinsic, AugmentedSubmittable } from '@polkadot/api-base/types';

import { RewardingEvents, RewardType } from './consts';
import { toAssetId } from '../assets';
import { VAL, PSWAP } from '../assets/consts';
import { Messages } from '../logger';
import { Operation } from '../types';
import type { Api } from '../api';
import type { RewardInfo, RewardsInfo, RewardTypedEvent } from './types';
import type { Asset } from '../assets/types';

type CrowdloanInfo = {
  totalContribution: FPNumber;
  rewards: Record<string, FPNumber>;
  startBlock: number;
  length: number;
  account: string;
  tag: string;
};

const getCrowdloanRewardsMap = (data: Vec<ITuple<[CommonPrimitivesAssetId32, u128]>>): Record<string, FPNumber> => {
  return data.reduce<Record<string, FPNumber>>((buffer, tuple) => {
    if (!tuple.isEmpty) {
      const [assetId, amount] = tuple;

      const assetAddress = toAssetId(assetId);
      const claimedAmount = new FPNumber(amount);

      buffer[assetAddress] = (buffer[assetAddress] || FPNumber.ZERO).add(claimedAmount);
    }

    return buffer;
  }, {});
};

export class RewardsModule<T> {
  constructor(private readonly root: Api<T>) {}

  private isClaimableReward(reward: RewardInfo): boolean {
    const fpAmount = FPNumber.fromCodecValue(reward.amount, reward.asset.decimals);

    return !fpAmount.isZero();
  }

  private containsRewardsForType(items: Array<RewardInfo | RewardsInfo>, type: RewardType): boolean {
    return items.some((item) => {
      const key = 'rewards' in item ? item.rewards : [item];

      return key.some((item) => this.isClaimableReward(item) && item.type[0] === type);
    });
  }

  private prepareRewardInfo(
    type: RewardTypedEvent,
    amount: Codec | number | string | FPNumber,
    rewardAsset?: Asset
  ): RewardInfo {
    const asset = rewardAsset ?? PSWAP;
    const fpAmount = new FPNumber(amount, asset?.decimals);
    const rewardInfo = {
      type,
      asset,
      amount: fpAmount.toCodecString(),
    } as RewardInfo;

    return rewardInfo;
  }

  private prepareVestedRewardsInfo(limit: Codec, total: Codec, rewards: any): RewardsInfo {
    const asset = PSWAP;
    // reward table with zero amount for each event
    const buffer = [
      RewardingEvents.BuyOnBondingCurve,
      RewardingEvents.LiquidityProvisionFarming,
      RewardingEvents.MarketMakerVolume,
    ].reduce<Record<string, RewardInfo>>((result, key) => {
      return {
        ...result,
        [key]: this.prepareRewardInfo([RewardType.Strategic, key], 0, asset),
      };
    }, {});

    // update reward table with real values
    for (const [event, balance] of rewards.entries()) {
      const key = event.toString();
      buffer[key] = this.prepareRewardInfo([RewardType.Strategic, key], balance, asset);
    }

    const fpLimit = new FPNumber(limit, asset.decimals);
    const fpTotal = new FPNumber(total, asset.decimals);

    return {
      limit: fpLimit.toCodecString(),
      total: fpTotal.toCodecString(),
      rewards: Object.values(buffer),
    };
  }

  /**
   * Check rewards for external account
   * @param externalAddress address of external account (ethereum account address)
   * @returns rewards array with not zero amount
   */
  public async checkForExternalAccount(externalAddress: string): Promise<Array<RewardInfo>> {
    const [xorErc20Amount, soraFarmHarvestAmount, nftAirdropAmount] =
      await this.root.api.rpc.rewards.claimables(externalAddress);

    const rewards = [
      this.prepareRewardInfo([RewardType.External, RewardingEvents.SoraFarmHarvest], soraFarmHarvestAmount, PSWAP),
      this.prepareRewardInfo([RewardType.External, RewardingEvents.NftAirdrop], nftAirdropAmount, PSWAP),
      this.prepareRewardInfo([RewardType.External, RewardingEvents.XorErc20], xorErc20Amount, VAL),
    ].filter((item) => this.isClaimableReward(item));

    return rewards;
  }

  /**
   * Get observable reward for liqudity provision
   * @returns observable liquidity provision RewardInfo
   */
  public getLiquidityProvisionRewardsSubscription(): Observable<RewardInfo> {
    assert(this.root.account, Messages.connectWallet);

    return this.root.apiRx.query.pswapDistribution.shareholderAccounts(this.root.account.pair.address).pipe(
      map((balance) =>
        /* FixnumFixedPoint.inner: CodecString */
        this.prepareRewardInfo(
          [RewardType.Provision, RewardingEvents.LiquidityProvision],
          FPNumber.fromCodecValue(balance.inner.toString()),
          PSWAP
        )
      )
    );
  }

  public getVestedRewardsSubscription(): Observable<RewardsInfo> {
    assert(this.root.account, Messages.connectWallet);

    return this.root.apiRx.query.vestedRewards
      .rewards(this.root.account.pair.address)
      .pipe(map((data) => this.prepareVestedRewardsInfo(data.limit, data.totalAvailable, data.rewards)));
  }

  /**
   * Get all crowdloans infos
   */
  public async getCrowdloans(): Promise<CrowdloanInfo[]> {
    const data = await this.root.api.query.vestedRewards.crowdloanInfos.entries();

    return data.reduce<CrowdloanInfo[]>((buffer, [key, info]) => {
      if (!info.isEmpty) {
        const data = info.unwrap();

        buffer.push({
          totalContribution: new FPNumber(data.totalContribution),
          rewards: getCrowdloanRewardsMap(data.rewards),
          startBlock: data.startBlock.toNumber(),
          length: data.length.toNumber(),
          account: data.account.toString(),
          tag: new TextDecoder().decode(key.args[0]),
        });
      }

      return buffer;
    }, []);
  }

  /**
   * Get observable map of rewards user already claimed
   */
  public getCrowdloanUserInfoObservable(
    tag: string
  ): Observable<{ contribution: FPNumber; rewarded: Record<string, FPNumber> }> {
    assert(this.root.account, Messages.connectWallet);

    return this.root.apiRx.query.vestedRewards.crowdloanUserInfos(this.root.account.pair.address, tag).pipe(
      map((result) => {
        if (result.isEmpty)
          return {
            contribution: FPNumber.ZERO,
            rewarded: {},
          };

        const data = result.unwrap();
        const contribution = new FPNumber(data.contribution);
        const rewarded = getCrowdloanRewardsMap(data.rewarded);

        return {
          contribution,
          rewarded,
        };
      })
    );
  }

  /**
   * Get observable crowdloan rewards
   */
  public async getCrowdloanRewardsSubscription(): Promise<Observable<Record<string, RewardInfo[]>>> {
    assert(this.root.account, Messages.connectWallet);

    const blocksPerDay = 14_400;

    const crowdloans = await this.getCrowdloans();

    const assetsIds = [...new Set(crowdloans.map(({ rewards }) => Object.keys(rewards)).flat(1))];
    const assets = await Promise.all(assetsIds.map((assetId) => this.root.assets.getAssetInfo(assetId)));
    const assetsMap = assets.reduce<Record<string, Asset>>(
      (buffer, asset) => ({ ...buffer, [asset.address]: asset }),
      {}
    );

    const userCrowdloansObservable = crowdloans.map((crowdloan) => this.getCrowdloanUserInfoObservable(crowdloan.tag));
    const currentBlockObservable = this.root.system.getBlockNumberObservable();

    return combineLatest([currentBlockObservable, ...userCrowdloansObservable]).pipe(
      map(([currentBlock, ...userCrowdloans]) => {
        return crowdloans.reduce<Record<string, RewardInfo[]>>((buffer, crowdloan, index) => {
          const endBlock = crowdloan.startBlock + crowdloan.length;
          const elapsedBlocks = Math.max(Math.min(endBlock, currentBlock) - crowdloan.startBlock, 0);
          const userCrowdloan = userCrowdloans[index];
          const userContributionPart = crowdloan.totalContribution.isZero()
            ? FPNumber.ZERO
            : userCrowdloan.contribution.div(crowdloan.totalContribution);

          const lenghtDays = Math.floor(crowdloan.length / blocksPerDay);
          const elapsedDays = Math.floor(elapsedBlocks / blocksPerDay);
          const elapsedPart = FPNumber.fromNatural(elapsedDays).div(FPNumber.fromNatural(lenghtDays));

          const rewards = Object.entries(crowdloan.rewards).map(([assetId, assetTotalAmount]) => {
            const asset = { ...assetsMap[assetId] };
            const totalAmount = assetTotalAmount.mul(userContributionPart);
            const currentAmount = totalAmount.mul(elapsedPart);
            const rewardedAmount = userCrowdloan.rewarded[assetId] ?? FPNumber.ZERO;
            const claimableAmount = FPNumber.isGreaterThanOrEqualTo(currentAmount, rewardedAmount)
              ? currentAmount.sub(rewardedAmount)
              : FPNumber.ZERO;

            const rewardInfo = this.prepareRewardInfo([RewardType.Crowdloan, crowdloan.tag], claimableAmount, asset);

            return {
              ...rewardInfo,
              total: totalAmount.sub(rewardedAmount).toCodecString(),
            };
          });

          buffer[crowdloan.tag] = rewards;

          return buffer;
        }, {});
      })
    );
  }

  /**
   * Returns a params object { tx, type }
   * @param rewards claiming rewards
   * @param signature message signed in external wallet (if want to claim external rewards), otherwise empty string
   */
  private calcTxParams(rewards: Array<RewardInfo | RewardsInfo>, signature = '') {
    const transactions: { tx: SubmittableExtrinsic<'promise'>; type: AugmentedSubmittable<AnyFunction> }[] = [];

    // liquidity provision
    if (this.containsRewardsForType(rewards, RewardType.Provision)) {
      transactions.push({
        tx: this.root.api.tx.pswapDistribution.claimIncentive(),
        type: this.root.api.tx.pswapDistribution.claimIncentive,
      });
    }

    // vested
    if (this.containsRewardsForType(rewards, RewardType.Strategic)) {
      transactions.push({
        tx: this.root.api.tx.vestedRewards.claimRewards(),
        type: this.root.api.tx.vestedRewards.claimRewards,
      });
    }

    // external
    if (this.containsRewardsForType(rewards, RewardType.External)) {
      transactions.push({
        tx: this.root.api.tx.rewards.claim(signature),
        type: this.root.api.tx.rewards.claim,
      });
    }

    // crowdloan
    const crowdloanTags = rewards
      .map((reward) => {
        const items = 'rewards' in reward ? reward.rewards : [reward];
        const tags = items.reduce<string[]>((buffer, item) => {
          const [rewardType, rewardEvent] = item.type;

          if (rewardType === RewardType.Crowdloan) {
            buffer.push(rewardEvent);
          }
          return buffer;
        }, []);

        return tags;
      })
      .flat(1);

    const uniqueTags = [...new Set(crowdloanTags)];

    for (const tag of uniqueTags) {
      transactions.push({
        tx: this.root.api.tx.vestedRewards.claimCrowdloanRewards(tag),
        type: this.root.api.tx.vestedRewards.claimCrowdloanRewards,
      });
    }

    // batch or simple tx
    if (transactions.length > 1)
      return {
        tx: this.root.api.tx.utility.batchAll(transactions.map(({ tx }) => tx)),
        type: this.root.api.tx.utility.batchAll,
      };

    if (transactions.length === 1) return transactions[0];

    // for current compability
    return {
      tx: this.root.api.tx.rewards.claim(signature),
      type: this.root.api.tx.rewards.claim,
    };
  }

  /**
   * Get network fee for claim rewards operation
   */
  public async getNetworkFee(rewards: Array<RewardInfo>, signature = ''): Promise<CodecString> {
    const { tx, type } = this.calcTxParams(rewards, signature);

    switch (type) {
      case this.root.api.tx.pswapDistribution.claimIncentive:
        return this.root.NetworkFee[Operation.ClaimLiquidityProvisionRewards];
      case this.root.api.tx.vestedRewards.claimRewards:
        return this.root.NetworkFee[Operation.ClaimVestedRewards];
      case this.root.api.tx.vestedRewards.claimCrowdloanRewards:
        return this.root.NetworkFee[Operation.ClaimCrowdloanRewards];
      case this.root.api.tx.rewards.claim:
        return this.root.NetworkFee[Operation.ClaimExternalRewards];
      default: {
        return await this.root.getTransactionFee(tx);
      }
    }
  }

  /**
   * Claim rewards
   * @param signature message signed in external wallet (if want to claim external rewards)
   */
  public claim(
    rewards: Array<RewardInfo | RewardsInfo>,
    signature?: string,
    fee?: CodecString,
    externalAddress?: string
  ): Promise<T> {
    assert(this.root.account, Messages.connectWallet);

    const { tx } = this.calcTxParams(rewards, signature);

    const historyItem = {
      type: Operation.ClaimRewards,
      externalAddress,
      soraNetworkFee: fee,
      rewards,
    };

    return this.root.submitExtrinsic(tx, this.root.account.pair, historyItem);
  }
}
