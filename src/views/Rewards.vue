<template>
  <div v-loading="parentLoading" class="rewards">
    <div class="rewards-content" v-loading="!parentLoading && loading">
      <gradient-box class="rewards-block" :symbol="gradientSymbol">
        <div :class="['rewards-box', libraryTheme]">
          <tokens-row :symbols="rewardTokenSymbols" />
          <div v-if="claimingInProgressOrFinished" class="rewards-claiming-text">
            {{ claimingStatusMessage }}
          </div>
          <div v-if="isSoraAccountConnected" class="rewards-amount">
            <rewards-amount-header :items="rewardsByAssetsList" />
            <template v-if="!claimingInProgressOrFinished">
              <rewards-amount-table
                class="rewards-table"
                v-if="internalRewards"
                v-model="selectedInternalRewardsModel"
                :item="internalRewards"
                :theme="libraryTheme"
                :disabled="!internalRewardsAvailable"
                is-codec-string
              />
              <rewards-amount-table
                class="rewards-table"
                v-model="selectedVestedRewardsModel"
                :item="vestedRewadsGroupItem"
                :theme="libraryTheme"
                :disabled="!vestedRewardsAvailable"
                is-codec-string
              />
              <rewards-amount-table
                class="rewards-table"
                v-model="selectedCrowdloanRewardsModel"
                :item="crowdloanRewardsGroupItem"
                :theme="libraryTheme"
                complex-group
                is-codec-string
              />
              <rewards-amount-table
                class="rewards-table"
                v-model="selectedExternalRewardsModel"
                :item="externalRewardsGroupItem"
                :show-table="!!externalRewards.length"
                :theme="libraryTheme"
                simple-group
              >
                <div class="rewards-footer">
                  <s-divider />
                  <div v-if="isExternalAccountConnected" class="rewards-account">
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
      </gradient-box>
      <div v-if="!claimingInProgressOrFinished && hintText" class="rewards-block rewards-hint">
        {{ hintText }}
      </div>
      <s-button
        v-if="!(rewardsRecieved || loading)"
        class="rewards-block rewards-action-button s-typography-button--large"
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
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { RewardInfo, RewardsInfo } from '@sora-substrate/util/build/rewards/types';
import type Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';

import ethersUtil from '@/utils/ethers-util';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { hasInsufficientXorForFee } from '@/utils';
import { action, getter, mutation, state } from '@/store/decorators';
import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';

import type { RewardsAmountHeaderItem, RewardInfoGroup, SelectedRewards } from '@/types/rewards';
import type { ClaimRewardsParams } from '@/store/rewards/types';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    GradientBox: lazyComponent(Components.GradientBox),
    TokensRow: lazyComponent(Components.TokensRow),
    RewardsAmountHeader: lazyComponent(Components.RewardsAmountHeader),
    RewardsAmountTable: lazyComponent(Components.RewardsAmountTable),
    InfoLine: components.InfoLine,
  },
})
export default class Rewards extends Mixins(mixins.FormattedAmountMixin, WalletConnectMixin, mixins.TransactionMixin) {
  @state.rewards.feeFetching private feeFetching!: boolean;
  @state.rewards.rewardsFetching private rewardsFetching!: boolean;
  @state.rewards.rewardsClaiming private rewardsClaiming!: boolean;
  @state.rewards.transactionError private transactionError!: boolean;
  @state.rewards.transactionStep private transactionStep!: number;
  @state.rewards.fee fee!: CodecString;
  @state.rewards.rewardsRecieved rewardsRecieved!: boolean;

  @state.rewards.vestedRewards private vestedRewards!: RewardsInfo;
  @state.rewards.crowdloanRewards private crowdloanRewards!: Array<RewardInfo>;
  @state.rewards.selectedVestedRewards private selectedVestedRewards!: Nullable<RewardsInfo>;
  @state.rewards.selectedInternalRewards private selectedInternalRewards!: Nullable<RewardInfo>;
  @state.rewards.selectedExternalRewards private selectedExternalRewards!: Array<RewardInfo>;
  @state.rewards.selectedCrowdloanRewards private selectedCrowdloanRewards!: Array<RewardInfo>;
  @state.rewards.internalRewards internalRewards!: RewardInfo;
  @state.rewards.externalRewards externalRewards!: Array<RewardInfo>;

  @getter.assets.xor private xor!: AccountAsset;
  @getter.rewards.transactionStepsCount private transactionStepsCount!: number;
  @getter.rewards.externalRewardsAvailable private externalRewardsAvailable!: boolean;
  @getter.rewards.rewardsAvailable rewardsAvailable!: boolean;
  @getter.rewards.internalRewardsAvailable internalRewardsAvailable!: boolean;
  @getter.rewards.vestedRewardsAvailable vestedRewardsAvailable!: boolean;
  @getter.rewards.rewardsByAssetsList rewardsByAssetsList!: Array<RewardsAmountHeaderItem>;
  @getter.libraryTheme libraryTheme!: Theme;

  @mutation.rewards.reset private reset!: VoidFunction;

  @action.rewards.setSelectedRewards private setSelectedRewards!: (args: SelectedRewards) => Promise<void>;
  @action.rewards.getRewards private getRewards!: (address: string) => Promise<void>;
  @action.rewards.claimRewards private claimRewards!: (options: ClaimRewardsParams) => Promise<void>;

  private unwatchEthereum!: VoidFunction;

  destroyed(): void {
    this.reset();
  }

  async created(): Promise<void> {
    await this.withApi(async () => {
      await this.setEvmNetworkType();
      await this.syncExternalAccountWithAppState();
      await this.checkAccountRewards();

      this.unwatchEthereum = await ethersUtil.watchEthereum({
        onAccountChange: (addressList: string[]) => {
          if (addressList.length) {
            this.changeExternalAccountProcess({ address: addressList[0] });
          } else {
            this.disconnectExternalAccountProcess();
          }
        },
        onNetworkChange: (networkId: string) => {
          this.setEvmNetworkType(networkId);
        },
        onDisconnect: () => {
          this.disconnectExternalAccountProcess();
        },
      });
    });
  }

  beforeDestroy(): void {
    if (typeof this.unwatchEthereum === 'function') {
      this.unwatchEthereum();
    }
  }

  get externalRewardsGroupItem(): RewardInfoGroup {
    return {
      type: this.t('rewards.groups.external'),
      limit: groupRewardsByAssetsList(this.externalRewards),
      rewards: this.externalRewards,
    };
  }

  get vestedRewadsGroupItem(): RewardInfoGroup {
    const rewards = this.vestedRewards?.rewards ?? [];
    const pswap = KnownAssets.get(KnownSymbols.PSWAP);

    return {
      type: this.t('rewards.groups.strategic'),
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
    };
  }

  get crowdloanRewardsGroupItem(): RewardInfoGroup {
    return {
      type: this.t('rewards.groups.crowdloan'),
      rewards: this.crowdloanRewards,
    };
  }

  get selectedInternalRewardsModel(): boolean {
    return this.internalRewardsAvailable && this.selectedInternalRewards !== null;
  }

  set selectedInternalRewardsModel(flag: boolean) {
    const internal = flag ? this.internalRewards : null;
    this.setSelectedRewards({ ...this.selectedRewards, internal });
  }

  get selectedExternalRewardsModel(): boolean {
    return this.selectedExternalRewards.length !== 0;
  }

  set selectedExternalRewardsModel(flag: boolean) {
    const external = flag ? this.externalRewards : [];
    this.setSelectedRewards({ ...this.selectedRewards, external });
  }

  get selectedVestedRewardsModel(): boolean {
    return this.vestedRewardsAvailable && this.selectedVestedRewards !== null;
  }

  set selectedVestedRewardsModel(flag: boolean) {
    const vested = flag ? this.vestedRewards : null;
    this.setSelectedRewards({ ...this.selectedRewards, vested });
  }

  get selectedCrowdloanRewardsModel(): Array<string> {
    return this.selectedCrowdloanRewards.map((item) => item.type);
  }

  set selectedCrowdloanRewardsModel(value: Array<string>) {
    const crowdloan = this.crowdloanRewards.reduce<RewardInfo[]>((buffer, item) => {
      if (value.includes(item.type)) {
        buffer.push(item);
      }
      return buffer;
    }, []);

    this.setSelectedRewards({ ...this.selectedRewards, crowdloan });
  }

  get selectedRewards(): SelectedRewards {
    return {
      internal: this.selectedInternalRewards,
      external: this.selectedExternalRewards,
      vested: this.selectedVestedRewards,
      crowdloan: this.selectedCrowdloanRewards,
    };
  }

  get isInsufficientBalance(): boolean {
    return hasInsufficientXorForFee(this.xor, this.fee);
  }

  get feeInfo(): object {
    return {
      label: this.t('rewards.networkFee'),
      labelTooltip: this.t('rewards.networkFeeTooltip'),
      value: this.formatCodecNumber(this.fee),
      assetSymbol: KnownSymbols.XOR,
    };
  }

  get claimingInProgressOrFinished(): boolean {
    return this.rewardsClaiming || this.transactionError || this.rewardsRecieved;
  }

  get claimingStatusMessage(): string {
    return this.rewardsRecieved ? this.t('rewards.claiming.success') : this.t('rewards.claiming.pending');
  }

  get transactionStatusMessage(): string {
    if (this.rewardsRecieved) {
      return this.t('rewards.transactions.success');
    }

    const order = this.tOrdinal(this.transactionStep);
    const translationKey = this.transactionError ? 'rewards.transactions.failed' : 'rewards.transactions.confimation';

    return this.t(translationKey, { order, total: this.transactionStepsCount });
  }

  get rewardTokenSymbols(): Array<KnownSymbols> {
    return this.rewardsByAssetsList.map((item) => item.asset.symbol as KnownSymbols);
  }

  get gradientSymbol(): string {
    return this.rewardTokenSymbols.length === 1 ? this.rewardTokenSymbols[0] : '';
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
    if (!this.isExternalAccountConnected) return this.t('rewards.hint.connectExternalAccount');
    if (!this.externalRewardsAvailable) return this.t('rewards.hint.connectAnotherAccount');
    return '';
  }

  get actionButtonText(): string {
    if (this.actionButtonLoading) return '';
    if (!this.isSoraAccountConnected) return this.t('rewards.action.connectWallet');
    if (this.transactionError) return this.t('rewards.action.retry');
    if (!this.rewardsAvailable) return this.t('rewards.action.checkRewards');
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
    return this.rewardsClaiming || (this.rewardsAvailable && this.isInsufficientBalance);
  }

  async handleAction(): Promise<void> {
    if (!this.isSoraAccountConnected) {
      return this.connectInternalWallet();
    }
    if (!this.rewardsAvailable) {
      return await this.checkAccountRewards(true);
    }
    if (this.rewardsAvailable) {
      return await this.claimRewardsProcess();
    }
  }

  private async checkAccountRewards(showNotification = false): Promise<void> {
    if (this.isSoraAccountConnected) {
      await this.getRewardsProcess(showNotification);
    }
  }

  private async getRewardsProcess(showNotification = false): Promise<void> {
    await this.getRewards(this.evmAddress);

    if (!this.rewardsAvailable && showNotification) {
      this.$notify({
        message: this.t('rewards.notification.empty'),
        title: '',
      });
    }
  }

  async connectExternalAccountProcess(): Promise<void> {
    await this.connectExternalWallet();
    await this.checkAccountRewards();
  }

  private async disconnectExternalAccountProcess(): Promise<void> {
    this.disconnectExternalAccount();
    await this.checkAccountRewards();
  }

  private async changeExternalAccountProcess(options?: any): Promise<void> {
    await this.changeExternalWallet(options);
    await this.checkAccountRewards();
  }

  private async claimRewardsProcess(): Promise<void> {
    const internalAddress = this.getWalletAddress();
    const externalAddress = this.evmAddress;

    if (!internalAddress) return;

    if (externalAddress) {
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
    padding: 0 $inner-spacing-mini / 2;
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
