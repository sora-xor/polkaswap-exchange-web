import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import type { SubmittableExtrinsic } from '@polkadot/api-base/types';

import { ApiAccount } from './apiAccount';
import { DexId } from './dex/consts';
import { XOR } from './assets/consts';
import { MAX_TIMESTAMP } from './orderBook/consts';
import { Operation } from './types';

import type { NetworkFeesObject } from './types';

// We don't need to know real account address for checking network fees
const mockAccountAddress = 'cnRuw2R6EVgQW3e4h8XeiFym2iU17fNsms15zRGcg9YEJndAs';

export class BaseApi<T = void> extends ApiAccount<T> {
  /**
   * Network fee values which can be used right after `calcStaticNetworkFees` method.
   *
   * Each value is represented as `CodecString`
   */
  public NetworkFee = {
    [Operation.AddLiquidity]: '0',
    [Operation.BatchAll]: '0',
    [Operation.CreatePair]: '0',
    [Operation.EthBridgeIncoming]: '0',
    [Operation.EthBridgeOutgoing]: '0',
    [Operation.EvmIncoming]: '0',
    [Operation.EvmOutgoing]: '0',
    [Operation.SubstrateIncoming]: '0',
    [Operation.SubstrateOutgoing]: '0',
    [Operation.RemoveLiquidity]: '0',
    [Operation.Swap]: '0',
    [Operation.SwapAndSend]: '0',
    [Operation.SwapTransferBatch]: '0',
    [Operation.ClaimVestedRewards]: '0',
    [Operation.ClaimCrowdloanRewards]: '0',
    [Operation.ClaimLiquidityProvisionRewards]: '0',
    [Operation.ClaimExternalRewards]: '0',
    [Operation.ReferralReserveXor]: '0',
    [Operation.ReferralUnreserveXor]: '0',
    [Operation.ReferralSetInvitedUser]: '0',
    [Operation.DemeterFarmingDepositLiquidity]: '0',
    [Operation.DemeterFarmingWithdrawLiquidity]: '0',
    [Operation.DemeterFarmingStakeToken]: '0',
    [Operation.DemeterFarmingUnstakeToken]: '0',
    [Operation.DemeterFarmingGetRewards]: '0',
    [Operation.CeresLiquidityLockerLockLiquidity]: '0',
    [Operation.StakingBond]: '0',
    [Operation.StakingBondAndNominate]: '0', // Min network fee
    [Operation.StakingBondExtra]: '0',
    [Operation.StakingRebond]: '0',
    [Operation.StakingUnbond]: '0',
    [Operation.StakingWithdrawUnbonded]: '0',
    [Operation.StakingChill]: '0',
    [Operation.StakingSetPayee]: '0',
    [Operation.StakingSetController]: '0',
    [Operation.StakingPayout]: '0',
    [Operation.RegisterAsset]: '0',
    [Operation.Transfer]: '0',
    [Operation.XorlessTransfer]: '0',
    [Operation.Mint]: '0',
    [Operation.Burn]: '0',
    [Operation.OrderBookPlaceLimitOrder]: '0',
    [Operation.CreateVault]: '0',
    [Operation.CloseVault]: '0',
    [Operation.RepayVaultDebt]: '0',
    [Operation.DepositCollateral]: '0',
    [Operation.BorrowVaultDebt]: '0',
    [Operation.SetAccessExpiration]: '0',
    [Operation.RegulateAsset]: '0',
    [Operation.RegisterAndRegulateAsset]: '0',
    [Operation.BindRegulatedAsset]: '0',
    [Operation.IssueSoulBoundToken]: '0',
    [Operation.Checkin]: '0',
  } as NetworkFeesObject;

  /**
   * Returns an extrinsic with the default or empty params.
   *
   * Actually, network fee value doesn't depend on extrinsic params, so, we can use empty/default values
   * @param operation
   */
  private getEmptyExtrinsic(operation: Operation): SubmittableExtrinsic<'promise'> | null {
    try {
      // prettier-ignore
      switch (operation) { // NOSONAR
        case Operation.AddLiquidity:
          return this.api.tx.poolXYK.depositLiquidity(DexId.XOR, '', '', 0, 0, 0, 0);
        case Operation.BatchAll: 
          return this.api.tx.utility.batchAll([]);
        case Operation.CreatePair:
          return this.api.tx.utility.batchAll([
            this.api.tx.tradingPair.register(DexId.XOR, '', ''),
            this.api.tx.poolXYK.initializePool(DexId.XOR, '', ''),
            this.api.tx.poolXYK.depositLiquidity(DexId.XOR, '', '', 0, 0, 0, 0),
          ]);
        case Operation.EthBridgeOutgoing:
          return this.api.tx.ethBridge.transferToSidechain('', '', 0, 0);
        case Operation.RemoveLiquidity:
          return this.api.tx.poolXYK.withdrawLiquidity(DexId.XOR, '', '', 0, 0, 0);
        case Operation.Swap:
          return this.api.tx.liquidityProxy.swap(
            DexId.XOR,
            '',
            '',
            { WithDesiredInput: { desiredAmountIn: '0', minAmountOut: '0' } },
            [],
            'Disabled'
          );
        case Operation.SwapAndSend:
          return this.api.tx.liquidityProxy.swapTransfer(
            '',
            DexId.XOR,
            '',
            '',
            { WithDesiredInput: { desiredAmountIn: '0', minAmountOut: '0' } },
            [],
            'Disabled'
          );
        case Operation.SwapTransferBatch:
          return this.api.tx.liquidityProxy.swapTransferBatch([], '', '', [], 'Disabled', null);
        case Operation.ClaimVestedRewards:
          return this.api.tx.vestedRewards.claimRewards();
        case Operation.ClaimCrowdloanRewards:
          return this.api.tx.vestedRewards.claimCrowdloanRewards(XOR.address);
        case Operation.ClaimLiquidityProvisionRewards:
          return this.api.tx.pswapDistribution.claimIncentive();
        case Operation.ClaimExternalRewards:
          return this.api.tx.rewards.claim(
            '0xa8811ca9a2f65a4e21bd82a1e121f2a7f0f94006d0d4bcacf50016aef0b67765692bb7a06367365f13a521ec129c260451a682e658048729ff514e77e4cdffab1b'
          ); // signature mock
        case Operation.ReferralReserveXor:
          return this.api.tx.referrals.reserve(0);
        case Operation.ReferralUnreserveXor:
          return this.api.tx.referrals.unreserve(0);
        case Operation.ReferralSetInvitedUser:
          return this.api.tx.referrals.setReferrer('');
        case Operation.DemeterFarmingDepositLiquidity:
          return this.api.tx.demeterFarmingPlatform.deposit(XOR.address, XOR.address, XOR.address, true, 0);
        case Operation.DemeterFarmingWithdrawLiquidity:
          return this.api.tx.demeterFarmingPlatform.withdraw(XOR.address, XOR.address, XOR.address, 0, true);
        case Operation.DemeterFarmingStakeToken:
          return this.api.tx.demeterFarmingPlatform.deposit(XOR.address, XOR.address, XOR.address, false, 0);
        case Operation.DemeterFarmingUnstakeToken:
          return this.api.tx.demeterFarmingPlatform.withdraw(XOR.address, XOR.address, XOR.address, 0, false);
        case Operation.DemeterFarmingGetRewards:
          return this.api.tx.demeterFarmingPlatform.getRewards(XOR.address, XOR.address, XOR.address, true);
        case Operation.CeresLiquidityLockerLockLiquidity:
          return this.api.tx.ceresLiquidityLocker.lockLiquidity(XOR.address, XOR.address, 0, 100, false);
        case Operation.StakingBond:
          return this.api.tx.staking.bond(mockAccountAddress, 0, { Account: mockAccountAddress });
        case Operation.StakingBondAndNominate:
          return this.api.tx.utility.batchAll([
            this.api.tx.staking.bond(mockAccountAddress, 0, { Account: mockAccountAddress }),
            this.api.tx.staking.nominate([mockAccountAddress]),
          ]);
        case Operation.StakingBondExtra:
          return this.api.tx.staking.bondExtra(0);
        case Operation.StakingRebond:
          return this.api.tx.staking.rebond(0);
        case Operation.StakingUnbond:
          return this.api.tx.staking.unbond(0);
        case Operation.StakingWithdrawUnbonded:
          return this.api.tx.staking.withdrawUnbonded(0);
        case Operation.StakingChill:
          return this.api.tx.staking.chill();
        case Operation.StakingSetPayee:
          return this.api.tx.staking.setPayee({ Account: mockAccountAddress });
        case Operation.StakingSetController:
          return this.api.tx.staking.setController(mockAccountAddress);
        case Operation.StakingPayout:
          return this.api.tx.staking.payoutStakers(mockAccountAddress, 3449);
        case Operation.RegisterAsset:
          return this.api.tx.assets.register('', '', 0, false, false, null, null);
        case Operation.Transfer:
          return this.api.tx.assets.transfer('', '', 0);
        case Operation.XorlessTransfer:
          return this.api.tx.liquidityProxy.xorlessTransfer(DexId.XOR, '', '', 0, 0, 0, [], 'Disabled', null);
        case Operation.Mint:
          return this.api.tx.assets.mint('', '', 0);
        case Operation.Burn:
          return this.api.tx.assets.burn('', 0);
        case Operation.OrderBookPlaceLimitOrder:
          return this.api.tx.orderBook.placeLimitOrder(
            { dexId: DexId.XOR, base: XOR.address, quote: XOR.address },
            0,
            0,
            PriceVariant.Buy,
            MAX_TIMESTAMP
          );
        case Operation.CreateVault:
          return this.api.tx.kensetsu.createCdp('', 0, '', 0, 0, 'Type2');
        case Operation.CloseVault:
          return this.api.tx.kensetsu.closeCdp(0);
        case Operation.RepayVaultDebt:
          return this.api.tx.kensetsu.repayDebt(0, 0);
        case Operation.DepositCollateral:
          return this.api.tx.kensetsu.depositCollateral(0, 0);
        case Operation.BorrowVaultDebt:
          return this.api.tx.kensetsu.borrow(0, 0, 0);
        case Operation.SetAccessExpiration:
          return this.api.tx.extendedAssets.setSbtExpiration('', '', 0);
        case Operation.RegulateAsset: 
          return this.api.tx.extendedAssets.regulateAsset('');
        case Operation.RegisterAndRegulateAsset:
          return  this.api.tx.extendedAssets.registerRegulatedAsset('', '', 0, false, false, null, null);
        case Operation.BindRegulatedAsset: 
          return this.api.tx.extendedAssets.bindRegulatedAssetToSbt('', '');
        case Operation.IssueSoulBoundToken: 
          return this.api.tx.extendedAssets.issueSbt('', '', '', '', '');
        case Operation.Checkin:
          return this.api.tx.soratopia.checkIn();
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * Calc all required network fees. The result will be written to `NetworkFee` object.
   *
   * For example, `api.NetworkFee[Operation.AddLiquidity]`
   */
  public async calcStaticNetworkFees(): Promise<void> {
    const operations = Object.keys(this.NetworkFee) as Operation[];

    const operationsPromises = operations.map(async (operation) => {
      const extrinsic = this.getEmptyExtrinsic(operation);

      if (extrinsic) {
        this.NetworkFee[operation] = await this.getTransactionFee(extrinsic);
      }
    });

    await Promise.allSettled(operationsPromises);
  }
}
