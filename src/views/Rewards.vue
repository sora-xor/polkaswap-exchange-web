<template>
  <div class="rewards">
    <div class="rewards-content" v-loading="parentLoading || loading">
      <rewards-gradient-box class="rewards-block" :symbol="gradientSymbol">
        <div :class="['rewards-box', libraryTheme]">
          <tokens-row :assets="rewardTokens" />
          <div v-if="claimingInProgressOrFinished" class="rewards-claiming-text">
            {{ claimingStatusMessage }}
          </div>
          <div v-if="isSoraAccountConnected" class="rewards-amount">
            <rewards-amount-header :items="rewardsAmountHeaderItems" />
            <template v-if="!claimingInProgressOrFinished">
              <rewards-amount-table
                class="rewards-table"
                v-if="internalRewards"
                v-model="selectedInternalRewardsModel"
                :title="t('rewards.events.LiquidityProvision')"
                :items="[internalRewards]"
                :theme="libraryTheme"
                is-codec-string
              />
              <rewards-amount-table
                class="rewards-table"
                v-model="selectedVestedRewardsModel"
                :title="t('rewards.groups.strategic')"
                :items="vestedRewadsGroupItems"
                :theme="libraryTheme"
                is-codec-string
              />
              <rewards-amount-table
                v-if="Object.keys(crowdloanRewards).length"
                class="rewards-table"
                v-model="selectedCrowdloanRewardsModel"
                :title="t('rewards.groups.crowdloan')"
                :items="crowdloanRewardsGroupItems"
                :theme="libraryTheme"
                is-codec-string
              />
              <rewards-amount-table
                class="rewards-table"
                v-model="selectedExternalRewardsModel"
                :title="t('rewards.groups.external')"
                :items="externalRewardsGroupItems"
                :show-table="!!externalRewards.length"
                :theme="libraryTheme"
                simple-group
              >
                <div class="rewards-footer">
                  <s-divider />
                  <div v-if="evmAddress" class="rewards-account">
                    <span>{{ formatAddress(evmAddress, 8) }}</span>
                    <span>{{ t('rewards.connected') }}</span>
                  </div>
                  <s-button
                    v-else
                    class="rewards-connect-button"
                    type="tertiary"
                    @click="connectExternalAccountProcess"
                  >
                    {{ t('rewards.action.connectExternalWallet') }}
                  </s-button>
                  <div v-if="externalRewardsHintText" class="rewards-footer-hint">{{ externalRewardsHintText }}</div>
                </div>
              </rewards-amount-table>
              <info-line
                v-if="fee && isSoraAccountConnected && rewardsAvailable && !claimingInProgressOrFinished"
                v-bind="feeInfo"
                :class="['rewards-fee', libraryTheme]"
                :fiat-value="getFiatAmountByCodecString(fee)"
                is-formatted
              />
            </template>
          </div>
          <div v-if="claimingInProgressOrFinished" class="rewards-claiming-text--transaction">
            {{ transactionStatusMessage }}
          </div>
        </div>
      </rewards-gradient-box>
      <div v-if="!claimingInProgressOrFinished && hintText" class="rewards-block rewards-hint">
        {{ hintText }}
      </div>
      <s-button
        v-if="!(rewardsReceived || loading)"
        class="rewards-block rewards-action-button s-typography-button--large"
        data-test-name="LoginAndGet"
        type="primary"
        @click="handleAction"
        :loading="actionButtonLoading"
        :disabled="actionButtonDisabled"
      >
        {{ actionButtonText }}
      </s-button>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins, groupRewardsByAssetsList } from '@soramitsu/soraneo-wallet-web';
import { CodecString, FPNumber } from '@sora-substrate/util';
import { KnownAssets, KnownSymbols } from '@sora-substrate/util/build/assets/consts';
import { RewardType } from '@sora-substrate/util/build/rewards/consts';
import type { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';
import type { RewardInfo, RewardsInfo } from '@sora-substrate/util/build/rewards/types';
import type Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';

import ethersUtil from '@/utils/ethers-util';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { hasInsufficientXorForFee } from '@/utils';
import { action, getter, mutation, state } from '@/store/decorators';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import SubscriptionsMixin from '@/components/mixins/SubscriptionsMixin';

import type { RewardsAmountHeaderItem, RewardInfoGroup, SelectedRewards } from '@/types/rewards';
import type { ClaimRewardsParams } from '@/store/rewards/types';

@Component({
  components: {
    RewardsGradientBox: lazyComponent(Components.RewardsGradientBox),
    RewardsAmountHeader: lazyComponent(Components.RewardsAmountHeader),
    RewardsAmountTable: lazyComponent(Components.RewardsAmountTable),
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    TokensRow: lazyComponent(Components.TokensRow),
    InfoLine: components.InfoLine,
  },
})
export default class Rewards extends Mixins(
  SubscriptionsMixin,
  mixins.FormattedAmountMixin,
  WalletConnectMixin,
  mixins.TransactionMixin,
  mixins.NotificationMixin
) {
  @state.rewards.feeFetching private feeFetching!: boolean;
  @state.rewards.rewardsFetching private rewardsFetching!: boolean;
  @state.rewards.rewardsClaiming private rewardsClaiming!: boolean;
  @state.rewards.transactionError private transactionError!: boolean;
  @state.rewards.transactionStep private transactionStep!: number;
  @state.rewards.receivedRewards receivedRewards!: RewardsAmountHeaderItem[];
  @state.rewards.fee fee!: CodecString;

  @state.rewards.vestedRewards private vestedRewards!: RewardsInfo;
  @state.rewards.crowdloanRewards private crowdloanRewards!: Record<string, RewardInfo[]>;
  @state.rewards.internalRewards internalRewards!: RewardInfo;
  @state.rewards.externalRewards externalRewards!: Array<RewardInfo>;

  @state.rewards.selectedVested private selectedVestedRewards!: Nullable<RewardsInfo>;
  @state.rewards.selectedInternal private selectedInternalRewards!: Nullable<RewardInfo>;
  @state.rewards.selectedExternal private selectedExternalRewards!: Array<RewardInfo>;
  @state.rewards.selectedCrowdloan private selectedCrowdloanRewards!: Record<string, RewardInfo[]>;

  @getter.assets.xor private xor!: AccountAsset;
  @getter.rewards.externalRewardsAvailable private externalRewardsAvailable!: boolean;
  @getter.rewards.rewardsAvailable rewardsAvailable!: boolean;
  @getter.rewards.internalRewardsAvailable private internalRewardsAvailable!: boolean;
  @getter.rewards.vestedRewardsAvailable private vestedRewardsAvailable!: boolean;
  @getter.rewards.rewardsByAssetsList private rewardsByAssetsList!: Array<RewardsAmountHeaderItem>;
  @getter.rewards.externalRewardsSelected private externalRewardsSelected!: boolean;
  @getter.libraryTheme libraryTheme!: Theme;

  @mutation.rewards.reset private reset!: FnWithoutArgs;

  @action.rewards.setSelectedRewards private setSelectedRewards!: (args: SelectedRewards) => Promise<void>;
  @action.rewards.getExternalRewards private getExternalRewards!: (address: string) => Promise<void>;
  @action.rewards.claimRewards private claimRewards!: (options: ClaimRewardsParams) => Promise<void>;
  @action.rewards.subscribeOnRewards private subscribeOnRewards!: AsyncFnWithoutArgs;
  @action.rewards.unsubscribeFromRewards private unsubscribeFromRewards!: AsyncFnWithoutArgs;

  private unwatchEthereum!: FnWithoutArgs;

  destroyed(): void {
    this.reset();
  }

  async created(): Promise<void> {
    this.setStartSubscriptions([this.subscribeOnRewards]);
    this.setResetSubscriptions([this.unsubscribeFromRewards]);

    this.unwatchEthereum = await ethersUtil.watchEthereum({
      onAccountChange: (addressList: string[]) => {
        if (addressList.length) {
          this.changeExternalAccountProcess(addressList[0]);
        } else {
          this.disconnectExternalAccountProcess();
        }
      },
      onNetworkChange: (networkHex: string) => {
        this.connectExternalNetwork(networkHex);
      },
      onDisconnect: () => {
        this.disconnectExternalNetwork();
      },
    });
  }

  mounted(): void {
    this.withApi(async () => {
      await this.checkExternalRewards();
    });
  }

  beforeDestroy(): void {
    if (typeof this.unwatchEthereum === 'function') {
      this.unwatchEthereum();
    }
  }

  get transactionStepsCount(): number {
    return this.externalRewardsSelected ? 2 : 1;
  }

  get rewardsReceived(): boolean {
    return this.receivedRewards.length !== 0;
  }

  get rewardsAmountHeaderItems(): RewardsAmountHeaderItem[] {
    return this.rewardsReceived ? this.receivedRewards : this.rewardsByAssetsList;
  }

  get rewardTokens(): Array<Asset> {
    return this.rewardsAmountHeaderItems.map((item) => item.asset);
  }

  get rewardTokenSymbols(): Array<KnownSymbols> {
    return this.rewardTokens.map((item) => item.symbol as KnownSymbols);
  }

  get gradientSymbol(): string {
    return this.rewardTokenSymbols.length === 1 ? this.rewardTokenSymbols[0] : '';
  }

  get externalRewardsGroupItems(): RewardInfoGroup[] {
    return [
      {
        type: [RewardType.External, this.t('rewards.groups.external')],
        limit: groupRewardsByAssetsList(this.externalRewards),
        rewards: this.externalRewards,
      },
    ];
  }

  get vestedRewadsGroupItems(): RewardInfoGroup[] {
    const rewards = this.vestedRewards?.rewards ?? [];
    const pswap = KnownAssets.get(KnownSymbols.PSWAP);

    return [
      {
        type: [RewardType.Strategic, this.t('rewards.groups.strategic')],
        title: this.t('rewards.claimableAmountDoneVesting'),
        limit: [
          {
            amount: FPNumber.fromCodecValue(this.vestedRewards?.limit ?? 0, pswap.decimals).toCodecString(),
            asset: pswap,
          },
        ],
        total: {
          amount: FPNumber.fromCodecValue(this.vestedRewards?.total ?? 0, pswap.decimals).toLocaleString(),
          asset: pswap,
        },
        rewards,
      },
    ];
  }

  get crowdloanRewardsGroupItems(): RewardInfoGroup[] {
    return Object.entries(this.crowdloanRewards).map(([tag, rewards]) => {
      return {
        type: [RewardType.Crowdloan, tag],
        title: tag,
        limit: rewards.map((item) => ({
          ...item,
          total: {
            amount: FPNumber.fromCodecValue(item.total ?? 0, item.asset.decimals).toLocaleString(),
            asset: item.asset,
          },
        })),
      };
    });
  }

  get selectedInternalRewardsModel(): boolean {
    return this.internalRewardsAvailable && this.selectedInternalRewards !== null;
  }

  set selectedInternalRewardsModel(flag: boolean) {
    const selectedInternal = flag ? this.internalRewards : null;
    this.setSelectedRewards({ selectedInternal });
  }

  get selectedExternalRewardsModel(): boolean {
    return this.selectedExternalRewards.length !== 0;
  }

  set selectedExternalRewardsModel(flag: boolean) {
    const selectedExternal = flag ? this.externalRewards : [];
    this.setSelectedRewards({ selectedExternal });
  }

  get selectedVestedRewardsModel(): boolean {
    return this.vestedRewardsAvailable && this.selectedVestedRewards !== null;
  }

  set selectedVestedRewardsModel(flag: boolean) {
    const selectedVested = flag ? this.vestedRewards : null;
    this.setSelectedRewards({ selectedVested });
  }

  get selectedCrowdloanRewardsModel(): string[] {
    return Object.keys(this.selectedCrowdloanRewards);
  }

  set selectedCrowdloanRewardsModel(value: string[]) {
    const selectedCrowdloan = value.reduce((buffer, tag) => {
      buffer[tag] = this.crowdloanRewards[tag];
      return buffer;
    }, {});

    this.setSelectedRewards({ selectedCrowdloan });
  }

  get isInsufficientBalance(): boolean {
    return hasInsufficientXorForFee(this.xor, this.fee);
  }

  get feeInfo(): object {
    return {
      label: this.t('rewards.networkFee'),
      labelTooltip: this.t('networkFeeTooltipText'),
      value: this.formatCodecNumber(this.fee),
      assetSymbol: KnownSymbols.XOR,
    };
  }

  get claimingInProgressOrFinished(): boolean {
    return this.rewardsClaiming || this.transactionError || this.rewardsReceived;
  }

  get claimingStatusMessage(): string {
    return this.rewardsReceived ? this.t('rewards.claiming.success') : this.t('rewards.claiming.pending');
  }

  get transactionStatusMessage(): string {
    if (this.rewardsReceived) {
      return this.t('rewards.transactions.success');
    }

    const order = this.tOrdinal(this.transactionStep);
    const translationKey = this.transactionError ? 'rewards.transactions.failed' : 'rewards.transactions.confimation';

    return this.t(translationKey, { order, total: this.transactionStepsCount });
  }

  get hintText(): string {
    if (!this.isSoraAccountConnected) return this.t('rewards.hint.connectAccounts');
    if (this.rewardsAvailable) {
      const symbols = this.rewardTokenSymbols.join(` ${this.t('rewards.andText')} `);
      const transactions = this.tc('transactionText', this.transactionStepsCount);
      const count = this.transactionStepsCount > 1 ? this.transactionStepsCount : '';
      const destination =
        this.transactionStepsCount > 1 ? this.t('rewards.signing.accounts') : this.t('rewards.signing.extension');

      return this.t('rewards.hint.howToClaimRewards', { symbols, transactions, count, destination });
    }
    return '';
  }

  get externalRewardsHintText(): string {
    if (!this.evmAddress) return this.t('rewards.hint.connectExternalAccount');
    if (!this.externalRewardsAvailable) return this.t('rewards.hint.connectAnotherAccount');
    return '';
  }

  get actionButtonText(): string {
    if (this.actionButtonLoading) return '';
    if (!this.isSoraAccountConnected) return this.t('rewards.action.connectWallet');
    if (this.transactionError) return this.t('rewards.action.retry');
    if (this.isInsufficientBalance)
      return this.t('rewards.action.insufficientBalance', { tokenSymbol: KnownSymbols.XOR });
    if (!this.rewardsClaiming) return this.t('rewards.action.signAndClaim');
    if (this.externalRewardsAvailable && this.transactionStep === 1) return this.t('rewards.action.pendingExternal');
    if (!this.externalRewardsAvailable || this.transactionStep === 2) return this.t('rewards.action.pendingInternal');
    return '';
  }

  get actionButtonLoading(): boolean {
    return this.rewardsFetching || this.feeFetching;
  }

  get actionButtonDisabled(): boolean {
    return (
      this.rewardsClaiming || (this.isSoraAccountConnected && (!this.rewardsAvailable || this.isInsufficientBalance))
    );
  }

  async handleAction(): Promise<void> {
    if (!this.isSoraAccountConnected) {
      return this.connectSoraWallet();
    }
    if (this.rewardsAvailable) {
      return await this.claimRewardsProcess();
    }
  }

  private async checkExternalRewards(showNotification = false): Promise<void> {
    if (this.isSoraAccountConnected) {
      await this.getRewardsProcess(showNotification);
    }
  }

  private async getRewardsProcess(showNotification = false): Promise<void> {
    await this.getExternalRewards(this.evmAddress);

    if (!this.rewardsAvailable && showNotification) {
      this.showAppNotification(this.t('rewards.notification.empty'));
    }
  }

  async connectExternalAccountProcess(): Promise<void> {
    await this.connectEvmWallet();
    await this.checkExternalRewards();
  }

  private async disconnectExternalAccountProcess(): Promise<void> {
    this.disconnectEvmAccount();
    await this.checkExternalRewards();
  }

  private async changeExternalAccountProcess(address: string): Promise<void> {
    await this.setEvmAddress(address);
    await this.checkExternalRewards();
  }

  private async claimRewardsProcess(): Promise<void> {
    const internalAddress = this.getWalletAddress();
    const externalAddress = this.evmAddress;

    if (!internalAddress) return;

    if (externalAddress && this.externalRewardsSelected) {
      const isConnected = await ethersUtil.checkAccountIsConnected(externalAddress);

      if (!isConnected) return;
    }

    await this.withNotifications(async () => await this.claimRewards({ internalAddress, externalAddress }));
  }
}
</script>

<style lang="scss">
.rewards {
  .formatted-amount.formatted-amount--fiat-value {
    color: var(--s-color-rewards);
  }
}
.container.rewards .el-loading-mask {
  border-radius: var(--s-border-radius-small);
}
.rewards-action-button i {
  top: $inner-spacing-mini;
}
.rewards-connect-button.el-button.neumorphic.s-tertiary {
  [design-system-theme='light'] & {
    box-shadow: none;
  }
}
</style>

<style lang="scss" scoped>
.rewards {
  &-block {
    & + & {
      margin-top: $inner-spacing-medium;
    }
  }

  &-content {
    position: relative;
  }

  &-box {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    color: var(--s-color-base-on-accent);

    &.dark {
      color: var(--s-color-base-content-primary);
    }

    & > *:not(:last-child) {
      margin-bottom: $inner-spacing-mini;
    }
  }

  &-claiming-text {
    font-size: var(--s-heading5-font-size);
    line-height: var(--s-line-height-big);

    &--transaction {
      font-size: var(--s-font-size-mini);
      line-height: var(--s-line-height-big);
    }
  }

  &-amount {
    width: 100%;

    & > *:not(:last-child) {
      margin-bottom: $inner-spacing-mini;
    }

    & .el-divider {
      opacity: 0.5;
      margin: 0;
    }
  }

  @include rewards-hint(46px, true);

  &-footer {
    & > *:not(:last-child) {
      margin-bottom: $inner-spacing-small;
    }

    &-hint {
      padding: 0 $inner-spacing-medium;
      font-size: var(--s-font-size-extra-small);
      font-weight: 300;
      line-height: var(--s-line-height-base);
      text-align: center;
    }
  }

  &-account {
    display: flex;
    flex-flow: row wrap;
    justify-content: space-between;
    font-size: var(--s-font-size-mini);
    line-height: var(--s-line-height-big);
    margin-top: $inner-spacing-small;
    padding: 0 $inner-spacing-tiny;
  }

  &-fee {
    &.info-line {
      color: var(--s-color-base-on-acccent);
      margin-top: $inner-spacing-medium;
      &.dark {
        border-bottom-color: var(--s-color-base-content-secondary);
      }
    }
  }

  @include full-width-button('rewards-action-button');
  @include full-width-button('rewards-connect-button', 0);
}
</style>
