<template>
  <div class="container" v-loading="parentLoading">
    <div class="header">
      <back-button :page="StakingPageNames.Staking" />
      <s-button
        v-if="stakingInitialized"
        type="action"
        class="dropdown-menu-button"
        :tooltip="t('headerMenu.settings')"
        @click="handleClickDropdownMenu"
      >
        <s-dropdown
          ref="dropdown-menu"
          popper-class="dropdown-menu"
          icon="basic-more-vertical-24"
          type="ellipsis"
          placement="bottom-start"
          @select="handleSelectDropdownMenuItem"
        >
          <template #menu>
            <s-dropdown-item
              v-for="{ value, text } in dropdownMenuItems"
              :key="value"
              class="dropdown-menu__item"
              :data-test-name="value"
              :value="value"
            >
              {{ text }}
            </s-dropdown-item>
          </template>
        </s-dropdown>
      </s-button>
    </div>
    <div class="staking-logo-container">
      <div class="staking-logo">
        <token-logo :token="stakingAsset" size="large" class="token-logo" />
        <token-logo :token="rewardAsset" size="medium" class="reward-token-logo" />
      </div>
    </div>
    <h1>{{ t('soraStaking.overview.title') }}</h1>
    <p v-if="!stakingInitialized">
      {{ t('soraStaking.overview.description') }}
    </p>
    <template v-if="isLoggedIn">
      <div class="additional-buttons">
        <s-button v-if="stakingInitialized" class="additional-button s-typography-button--medium" @click="claimRewards">
          {{ t('soraStaking.actions.claim') }}
        </s-button>
        <s-button
          v-if="stakingInitialized"
          class="additional-button s-typography-button--medium"
          :disabled="lockedFunds.isZero()"
          @click="removeStake"
        >
          {{ t('soraStaking.actions.remove') }}
        </s-button>
      </div>
      <s-button
        v-if="!stakingInitialized"
        class="action-button s-typography-button--medium"
        type="primary"
        @click="stakeNew"
      >
        {{ t('soraStaking.newStake.title') }}
      </s-button>
      <s-button
        v-if="stakingInitialized"
        class="action-button s-typography-button--medium"
        type="primary"
        @click="stakeMore"
      >
        {{ stakeMoreText }}
      </s-button>
      <s-card v-if="showWithdrawCard" class="withdraw" border-radius="medium" shadow="always" size="mini">
        <div class="withdraw-content">
          <div class="withdraw-header">
            <div class="withdraw-info">
              <span class="withdraw-info-title">
                {{ t('soraStaking.withdraw.withdrawable') }}
              </span>
              <formatted-amount-with-fiat-value
                class="withdraw-info-amount"
                :asset-symbol="stakingAsset?.symbol"
                symbol-as-decimal
                value-can-be-hidden
                :value="withdrawableFundsFormatted"
                :fiat-value="withdrawableFundsFiat"
              />
            </div>
            <div class="withdraw-info">
              <span class="withdraw-info-title">
                {{ t('soraStaking.info.unstaking') }}
              </span>
              <formatted-amount-with-fiat-value
                class="withdraw-info-amount"
                :asset-symbol="stakingAsset?.symbol"
                symbol-as-decimal
                value-can-be-hidden
                :value="unlockingFundsFormatted"
                :fiat-value="unlockingFundsFiat"
              />
            </div>
            <s-button
              class="withdraw-button"
              @click="handleWithdraw"
              :disable="withdrawButtonDisabled"
              type="primary"
              size="small"
            >
              {{ t('soraStaking.actions.withdraw') }}
            </s-button>
          </div>
          <div v-if="showNextWithdrawal" class="withdraw-footer">
            <div>
              <span> {{ t('soraStaking.withdraw.nextWithdrawal') }}: </span>
              <era-countdown class="countdown" :target-era="nextWithdrawalEra" />
            </div>
            <div class="withdraw-see-all" @click="showAllWithdraws">
              {{ t('soraStaking.withdraw.seeAll') }}
            </div>
          </div>
        </div>
      </s-card>
      <div class="info">
        <info-line
          v-if="stakingInitialized"
          :label="t('soraStaking.info.stakingBalance')"
          :value="lockedFundsFormatted"
          :asset-symbol="stakingAsset?.symbol"
          :fiat-value="lockedFundsFiat"
        />
        <info-line
          v-if="stakingInitialized"
          :label="t('soraStaking.info.rewarded')"
          :value="rewardedFundsFormatted"
          :asset-symbol="rewardAsset?.symbol"
          :fiat-value="rewardedFundsFiat"
        />
        <info-line
          v-if="stakingInitialized && !showWithdrawCard"
          :label="t('soraStaking.info.unstaking')"
          :value="unlockingFundsFormatted"
          :asset-symbol="stakingAsset?.symbol"
          :fiat-value="unlockingFundsFiat"
        />
        <info-line
          v-if="stakingInitialized && !showWithdrawCard"
          :label="t('soraStaking.withdraw.withdrawable')"
          :value="withdrawableFundsFormatted"
          :asset-symbol="stakingAsset?.symbol"
          :fiat-value="withdrawableFundsFiat"
        />
        <info-line
          v-if="!stakingInitialized"
          :label="t('soraStaking.info.totalLiquidityStaked')"
          :value="totalStakedFormatted"
        />
        <info-line v-if="!stakingInitialized" :label="TranslationConsts.APY" :value="maxApy + '%'" />
        <info-line :label="t('soraStaking.info.rewardToken')" :value="rewardAsset?.symbol" />
        <info-line v-if="unbondPeriod" :label="t('soraStaking.info.unstakingPeriod')" :value="unbondPeriodFormatted" />
        <info-line
          v-if="!stakingInitialized"
          :label="t('soraStaking.info.minimumStake')"
          :value="minNominatorBondFormatted"
          :asset-symbol="stakingAsset?.symbol"
          is-formatted
        />
        <info-line
          v-if="totalNominators !== null"
          :label="t('soraStaking.info.nominators')"
          :value="`${totalNominators}`"
        />
        <info-line v-if="validators.length" :label="t('soraStaking.info.validators')" :value="`${validators.length}`" />
      </div>
    </template>
    <s-button
      v-else
      type="primary"
      key="disconnected"
      class="action-wallet s-typography-button--large action-button"
      @click="handleConnectWallet"
    >
      {{ t('connectWalletText') }}
    </s-button>
    <stake-dialog
      :mode="stakeDialogMode"
      :visible.sync="showStakeDialog"
      :parent-loading="parentLoading || loading"
      @confirm="handleStake"
    />
    <claim-rewards-dialog
      :visible.sync="showClaimRewardsDialog"
      :parent-loading="parentLoading || loading"
      @show-rewards="showRewards"
    />
    <withdraw-dialog
      :visible.sync="showWithdrawDialog"
      :parent-loading="parentLoading || loading"
      @show-all-withdraws="showAllWithdraws"
    />
    <all-withdraws-dialog :visible.sync="showAllWithdrawsDialog" :parent-loading="parentLoading || loading" />
    <pending-rewards-dialog :visible.sync="showPendingRewardsDialog" :parent-loading="parentLoading || loading" />
    <validators-dialog
      :visible.sync="showValidatorsDialog"
      :parent-loading="parentLoading || loading"
      @confirm="handleNominate"
    />
    <!-- <controller-dialog
      :visible.sync="showControllerDialog"
      :parent-loading="parentLoading || loading"
      @confirm="handleChangeController"
    /> -->
  </div>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { PageNames } from '@/consts';
import { fetchData } from '@/indexer/queries/stakingNominators';
import router from '@/router';
import { getter, state, mutation } from '@/store/decorators';

import { soraStakingLazyComponent } from '../../router';
import { SoraStakingComponents, SoraStakingPageNames, StakeDialogMode } from '../consts';
import StakingMixin from '../mixins/StakingMixin';

enum DropdownMenuItemType {
  PendingRewards = 'pending-rewards',
  Validators = 'validators',
  ControllerAccount = 'controller-account',
}

type MenuItem = {
  value: DropdownMenuItemType;
  text: string;
};

@Component({
  components: {
    TokenLogo: components.TokenLogo,
    InfoLine: components.InfoLine,
    BackButton: soraStakingLazyComponent(SoraStakingComponents.BackButton),
    StakeDialog: soraStakingLazyComponent(SoraStakingComponents.StakeDialog),
    ClaimRewardsDialog: soraStakingLazyComponent(SoraStakingComponents.ClaimRewardsDialog),
    PendingRewardsDialog: soraStakingLazyComponent(SoraStakingComponents.PendingRewardsDialog),
    ValidatorsDialog: soraStakingLazyComponent(SoraStakingComponents.ValidatorsDialog),
    WithdrawDialog: soraStakingLazyComponent(SoraStakingComponents.WithdrawDialog),
    AllWithdrawsDialog: soraStakingLazyComponent(SoraStakingComponents.AllWithdrawsDialog),
    // ControllerDialog: soraStakingLazyComponent(SoraStakingComponents.ControllerDialog),
    EraCountdown: soraStakingLazyComponent(SoraStakingComponents.EraCountdown),
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
  },
})
export default class Overview extends Mixins(StakingMixin, mixins.LoadingMixin, TranslationMixin) {
  @mutation.staking.setTotalNominators setTotalNominators!: (value: number) => void;

  @state.staking.totalNominators totalNominators!: number;

  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  stakeDialogMode: StakeDialogMode = StakeDialogMode.ADD;

  showStakeDialog = false;
  showClaimRewardsDialog = false;
  showPendingRewardsDialog = false;
  showValidatorsDialog = false;
  showControllerDialog = false;
  showWithdrawDialog = false;
  showAllWithdrawsDialog = false;

  get lockedFundsFormatted(): string {
    return this.lockedFunds.toLocaleString();
  }

  get unlockingFundsFormatted(): string {
    return this.unlockingFunds.toLocaleString();
  }

  get rewardedFundsFormatted(): string {
    return this.rewardedFunds.toLocaleString();
  }

  get showWithdrawCard(): boolean {
    return !!this.accountLedger?.unlocking.length;
  }

  get showNextWithdrawal(): boolean {
    return !!this.nextWithdrawalEra;
  }

  private getDropdownMenuItems(): Array<MenuItem> {
    return [
      {
        value: DropdownMenuItemType.PendingRewards,
        text: this.t('soraStaking.pendingRewardsDialog.title'),
      },
      {
        value: DropdownMenuItemType.Validators,
        text: this.t('soraStaking.info.validators'),
      },
      // {
      //   value: DropdownMenuItemType.ControllerAccount,
      //   text: this.t('soraStaking.dropdownMenu.controllerAccount'),
      // },
    ];
  }

  get dropdownMenuItems(): Array<MenuItem> {
    return this.getDropdownMenuItems();
  }

  get stakeMoreText(): string {
    return this.lockedFunds.isZero() ? this.t('soraStaking.newStake.title') : this.t('soraStaking.actions.more');
  }

  get withdrawButtonDisabled(): boolean {
    return this.withdrawableFunds.isZero();
  }

  handleClickDropdownMenu(): void {
    const dropdownMenu = this.$refs['dropdown-menu'];
    if (!dropdownMenu) return;
    const dropdown = (dropdownMenu as any).dropdown;
    dropdown.visible ? dropdown.hide() : dropdown.show();
  }

  handleSelectDropdownMenuItem(value: DropdownMenuItemType): void {
    switch (value) {
      case DropdownMenuItemType.PendingRewards:
        this.showPendingRewardsDialog = true;
        break;
      case DropdownMenuItemType.Validators:
        this.showValidatorsDialog = true;
        break;
      case DropdownMenuItemType.ControllerAccount:
        this.showControllerDialog = true;
        break;
    }
  }

  stakeNew() {
    router.push({ name: SoraStakingPageNames.SelectValidators });
  }

  stakeMore() {
    this.stakeDialogMode = StakeDialogMode.ADD;
    this.showStakeDialog = true;
  }

  removeStake() {
    this.stakeDialogMode = StakeDialogMode.REMOVE;
    this.showStakeDialog = true;
  }

  claimRewards() {
    this.showClaimRewardsDialog = true;
  }

  showRewards() {
    this.showClaimRewardsDialog = false;
    this.showPendingRewardsDialog = true;
  }

  showAllWithdraws() {
    this.showWithdrawDialog = false;
    this.showAllWithdrawsDialog = true;
  }

  handleWithdraw() {
    this.showWithdrawDialog = true;
  }

  handleStake(): void {
    this.showStakeDialog = false;
  }

  handleNominate() {
    this.showValidatorsDialog = false;
  }

  handleChangeController() {
    this.showControllerDialog = false;
  }

  handleConnectWallet(): void {
    router.push({ name: PageNames.Wallet });
  }

  @Watch('currentEra')
  async fetchNominatorsCount() {
    if (!this.activeEra) {
      return;
    }

    const nominatorsCount = await fetchData();

    if (nominatorsCount === undefined || nominatorsCount === null) {
      return;
    }

    this.setTotalNominators(nominatorsCount);
  }

  created() {
    this.fetchNominatorsCount();
  }
}
</script>

<style lang="scss">
$logo-size: 64px;

.token-logo .asset-logo--large {
  width: $logo-size !important;
  height: $logo-size !important;
}
</style>

<style lang="scss" scoped>
$logo-size: 64px;

.container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-self: center;
  width: 100%;
  max-width: 464px;
  margin: 50px auto;
  padding: 30px;
  border-radius: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
}

.dropdown-menu-button {
  margin-left: auto;
}

.staking-logo-container {
  display: flex;
  justify-content: center;
  margin-top: -23px;
  pointer-events: none;
}
.staking-logo {
  position: relative;
  width: $logo-size;
  margin-bottom: 20px;
}

.reward-token-logo.logo {
  position: absolute;
  bottom: -12px;
  right: -12px;
  border: solid 4px var(--s-color-utility-surface);
  border-radius: 50%;
}

h1 {
  font-size: 28px;
  text-align: center;
  margin-bottom: 15px;
}

p {
  color: var(--s-color-base-content-secondary);
  text-align: center;
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 150%;
  letter-spacing: -0.32px;
}

.additional-buttons {
  display: flex;
  margin-top: 4px;
}

.additional-button {
  flex: 1;
}

.action-button {
  width: 100%;
  margin-top: 12px;
}

.info {
  margin-top: 25px;
}

.withdraw {
  margin-top: 16px;
  &-content {
    padding: 12px;
  }
  &-header {
    display: flex;
    align-items: center;
    gap: 40px;
  }
  &-info {
    display: flex;
    flex-direction: column;
    &-title {
      color: #a19a9d;
      font-size: var(--s-font-size-mini);
      margin-bottom: 6px;
    }
    &-amount {
      flex-direction: column;
      align-items: flex-start !important;
      text-align: left !important;
      overflow: hidden;
      gap: 2px;
    }
  }
  &-button {
    margin-left: auto;
  }
  &-footer {
    display: flex;
    justify-content: space-between;
    border-top: 1px solid var(--s-color-base-border-secondary);
    padding-top: 8px;
    margin-top: 16px;
  }
  &-see-all {
    color: var(--s-color-theme-accent);
    text-align: center;
    font-size: 14px;
    line-height: 20px;
    font-style: normal;
    font-weight: 700;
    text-transform: uppercase;
    cursor: pointer;
  }
}
</style>
