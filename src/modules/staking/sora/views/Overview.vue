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
        <s-button v-if="stakingInitialized" class="additional-button s-typography-button--medium" @click="removeStake">
          {{ t('soraStaking.actions.remove') }}
        </s-button>
      </div>
      <s-button
        v-if="!stakingInitialized"
        class="action-button s-typography-button--medium"
        type="primary"
        @click="stakeNew"
      >
        {{ t('soraStaking.actions.start') }}
      </s-button>
      <s-button
        v-if="stakingInitialized"
        class="action-button s-typography-button--medium"
        type="primary"
        @click="stakeMore"
      >
        {{ t('soraStaking.actions.more') }}
      </s-button>
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
          v-if="stakingInitialized"
          :label="t('soraStaking.info.unstaking')"
          :value="unlockingFundsFormatted"
          :asset-symbol="stakingAsset?.symbol"
          :fiat-value="unlockingFundsFiat"
        />
        <info-line
          v-if="stakingInitialized"
          :label="t('soraStaking.info.redeemable')"
          :value="redeemableFundsFormatted"
          :asset-symbol="rewardAsset?.symbol"
          :fiat-value="redeemableFundsFiat"
        />
        <info-line
          v-if="!stakingInitialized"
          :label="t('soraStaking.info.totalLiquidityStaked')"
          :value="totalStakedFormatted"
        />
        <info-line v-if="!stakingInitialized" :label="t('soraStaking.info.apy')" :value="maxApy + '%'" />
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
    <pending-rewards-dialog :visible.sync="showPendingRewardsDialog" :parent-loading="parentLoading || loading" />
    <validators-dialog
      :visible.sync="showValidatorsDialog"
      :parent-loading="parentLoading || loading"
      @confirm="handleNominate"
    />
    <controller-dialog
      :visible.sync="showControllerDialog"
      :parent-loading="parentLoading || loading"
      @confirm="handleChangeController"
    />
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
    // ControllerDialog: soraStakingLazyComponent(SoraStakingComponents.ControllerDialog),
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

  get lockedFundsFormatted(): string {
    return this.lockedFunds.toLocaleString();
  }

  get unlockingFundsFormatted(): string {
    return this.unlockingFunds.toLocaleString();
  }

  get rewardedFundsFormatted(): string {
    return this.rewardedFunds.toLocaleString();
  }

  private getDropdownMenuItems(isDropdown = false): Array<MenuItem> {
    return [
      {
        value: DropdownMenuItemType.PendingRewards,
        text: this.t('soraStaking.dropdownMenu.pendingRewards'),
      },
      {
        value: DropdownMenuItemType.Validators,
        text: this.t('soraStaking.dropdownMenu.validators'),
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
    router.push({ name: SoraStakingPageNames.NewStake });
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

  handleStake() {
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

    const nominatorsCount = await fetchData(this.activeEra - 1);

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

body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
}

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
  font-feature-settings: 'case' on, 'clig' off, 'liga' off;
  font-family: Sora;
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 150%; /* 24px */
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
</style>
