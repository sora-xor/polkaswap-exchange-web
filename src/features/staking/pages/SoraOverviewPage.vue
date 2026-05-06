<template>
  <div class="container" v-loading="parentLoadingValue">
    <div class="header">
      <back-button :page="SoraStakingPageNames.Staking"></back-button>
      <s-dropdown
        v-if="stakingInitialized"
        class="dropdown-menu-button"
        popper-class="dropdown-menu"
        type="ellipsis"
        placement="bottom-start"
        @select="handleSelectDropdownMenuItem"
      >
        <s-button type="action" class="s-pressed" icon="basic-more-vertical-24" :tooltip="t('headerMenu.settings')">
        </s-button>
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
    </div>
    <div class="staking-logo-container">
      <div class="staking-logo">
        <token-logo :token="stakingAsset" size="large" class="token-logo"></token-logo>
        <token-logo :token="rewardAsset" size="medium" class="reward-token-logo"></token-logo>
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
              ></formatted-amount-with-fiat-value>
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
              ></formatted-amount-with-fiat-value>
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
              <era-countdown class="countdown" :target-era="nextWithdrawalEra"></era-countdown>
            </div>
            <div v-button class="withdraw-see-all" @click="showAllWithdraws">
              {{ t('soraStaking.withdraw.seeAll') }}
            </div>
          </div>
        </div>
      </s-card>
      <div class="overview-info">
        <info-line
          v-if="stakingInitialized"
          :label="t('soraStaking.info.stakingBalance')"
          :value="lockedFundsFormatted"
          :asset-symbol="stakingAsset?.symbol"
          :fiat-value="lockedFundsFiat"
        ></info-line>
        <info-line
          v-if="stakingInitialized"
          :label="t('soraStaking.info.rewarded')"
          :value="rewardedFundsFormatted"
          :asset-symbol="rewardAsset?.symbol"
          :fiat-value="rewardedFundsFiat"
        ></info-line>
        <info-line
          v-if="stakingInitialized && !showWithdrawCard"
          :label="t('soraStaking.info.unstaking')"
          :value="unlockingFundsFormatted"
          :asset-symbol="stakingAsset?.symbol"
          :fiat-value="unlockingFundsFiat"
        ></info-line>
        <info-line
          v-if="stakingInitialized && !showWithdrawCard"
          :label="t('soraStaking.withdraw.withdrawable')"
          :value="withdrawableFundsFormatted"
          :asset-symbol="stakingAsset?.symbol"
          :fiat-value="withdrawableFundsFiat"
        ></info-line>
        <info-line
          v-if="!stakingInitialized"
          :label="t('soraStaking.info.totalLiquidityStaked')"
          :value="totalStakedFormatted"
        ></info-line>
        <info-line v-if="!stakingInitialized" :label="TranslationConsts.APY" :value="`${maxApy}%`"></info-line>
        <info-line :label="t('soraStaking.info.rewardToken')" :value="rewardAsset?.symbol"></info-line>
        <info-line
          v-if="unbondPeriod"
          :label="t('soraStaking.info.unstakingPeriod')"
          :value="unbondPeriodFormatted"
        ></info-line>
        <info-line
          v-if="!stakingInitialized"
          :label="t('soraStaking.info.minimumStake')"
          :value="minNominatorBondFormatted"
          :asset-symbol="stakingAsset?.symbol"
          :integer-only="minNominatorBondFormatted === '0'"
          is-formatted
        ></info-line>
        <info-line
          v-if="totalNominators !== null"
          :label="t('soraStaking.info.nominators')"
          :value="`${totalNominators}`"
        ></info-line>
        <info-line
          v-if="validators.length"
          :label="t('soraStaking.info.validators')"
          :value="`${validators.length}`"
        ></info-line>
      </div>
    </template>
    <s-button
      v-else
      type="primary"
      key="disconnected"
      class="action-wallet s-typography-button--large action-button"
      @click="connectSoraWallet"
    >
      {{ t('connectWalletText') }}
    </s-button>
    <stake-dialog
      v-model:visible="showStakeDialog"
      :mode="stakeDialogMode"
      :parent-loading="parentLoadingValue"
      @confirm="handleStake"
    ></stake-dialog>
    <claim-rewards-dialog
      v-model:visible="showClaimRewardsDialog"
      :parent-loading="parentLoadingValue"
      @show-rewards="showRewards"
    ></claim-rewards-dialog>
    <withdraw-dialog
      v-model:visible="showWithdrawDialog"
      :parent-loading="parentLoadingValue"
      @show-all-withdraws="showAllWithdraws"
    ></withdraw-dialog>
    <all-withdraws-dialog
      v-model:visible="showAllWithdrawsDialog"
      :parent-loading="parentLoadingValue"
    ></all-withdraws-dialog>
    <pending-rewards-dialog
      v-model:visible="showPendingRewardsDialog"
      :parent-loading="parentLoadingValue"
    ></pending-rewards-dialog>
    <validators-dialog
      v-model:visible="showValidatorsDialog"
      :parent-loading="parentLoadingValue"
      @confirm="handleNominate"
    ></validators-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useTranslation } from '@/composables/useTranslation';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useLoading } from '@/composables/useLoading';
import { TranslationConsts } from '@/consts';
import { fetchData } from '@/indexer/queries/staking/nominators';

import type { Nullable } from '@/types/common';
import WalletFormattedAmountWithFiatValue from '@/lib/soraneo-wallet/src/components/FormattedAmountWithFiatValue.vue';
import WalletInfoLine from '@/lib/soraneo-wallet/src/components/InfoLine.vue';
import WalletTokenLogo from '@/lib/soraneo-wallet/src/components/TokenLogo.vue';
import AllWithdrawsDialog from '@/modules/staking/sora/components/AllWithdrawsDialog.vue';
import BackButton from '@/modules/staking/sora/components/BackButton.vue';
import ClaimRewardsDialog from '@/modules/staking/sora/components/ClaimRewardsDialog.vue';
import EraCountdown from '@/modules/staking/sora/components/EraCountdown.vue';
import PendingRewardsDialog from '@/modules/staking/sora/components/PendingRewardsDialog.vue';
import { SoraStakingPageNames, StakeDialogMode } from '@/modules/staking/sora/consts';
import StakeDialog from '@/modules/staking/sora/components/StakeDialog.vue';
import { useSoraStaking } from '@/modules/staking/sora/composables/useSoraStaking';
import ValidatorsDialog from '@/modules/staking/sora/components/ValidatorsDialog.vue';
import WithdrawDialog from '@/modules/staking/sora/components/WithdrawDialog.vue';

defineOptions({
  name: 'SoraOverviewPage',
});

const props = defineProps<{
  parentLoading?: boolean;
}>();

const router = useRouter();
const TokenLogo = WalletTokenLogo;
const InfoLine = WalletInfoLine;
const FormattedAmountWithFiatValue = WalletFormattedAmountWithFiatValue;

enum DropdownMenuItemType {
  PendingRewards = 'pending-rewards',
  Validators = 'validators',
  ControllerAccount = 'controller-account',
}

type DropdownItem = {
  value: DropdownMenuItemType;
  text: string;
};
const showStakeDialog = ref(false);
const showClaimRewardsDialog = ref(false);
const showPendingRewardsDialog = ref(false);
const showValidatorsDialog = ref(false);
const showWithdrawDialog = ref(false);
const showAllWithdrawsDialog = ref(false);
const stakeDialogMode = ref<StakeDialogMode>(StakeDialogMode.ADD);

const { t } = useTranslation();
const { isLoggedIn, connectSoraWallet } = useInternalConnect();
const { loading } = useLoading();

const parentLoadingValue = computed(() => Boolean(props.parentLoading) || loading.value);

const {
  stakingInitialized,
  stakingAsset,
  rewardAsset,
  lockedFunds,
  lockedFundsFiat,
  unlockingFunds,
  unlockingFundsFiat,
  withdrawableFunds,
  withdrawableFundsFiat,
  withdrawableFundsFormatted,
  rewardedFundsFormatted,
  rewardedFundsFiat,
  totalStakedFormatted,
  unbondPeriod,
  unbondPeriodFormatted,
  minNominatorBondFormatted,
  validators,
  nextWithdrawalEra,
  accountLedger,
  currentEra,
  activeEra,
  maxApy,
  totalNominators,
  setTotalNominators,
} = useSoraStaking();

const lockedFundsFormatted = computed(() => lockedFunds.value.toLocaleString());
const unlockingFundsFormatted = computed(() => unlockingFunds.value.toLocaleString());
const showWithdrawCard = computed(() => Boolean(accountLedger.value?.unlocking?.length));
const withdrawButtonDisabled = computed(() => withdrawableFunds.value.isZero());
const showNextWithdrawal = computed(() => Boolean(nextWithdrawalEra.value));
const stakeMoreText = computed(() =>
  lockedFunds.value.isZero() ? t('soraStaking.newStake.title') : t('soraStaking.actions.more')
);
const dropdownMenuItems = computed<DropdownItem[]>(() => [
  {
    value: DropdownMenuItemType.PendingRewards,
    text: t('soraStaking.pendingRewardsDialog.title'),
  },
  {
    value: DropdownMenuItemType.Validators,
    text: t('soraStaking.info.validators'),
  },
  {
    value: DropdownMenuItemType.ControllerAccount,
    text: t('soraStaking.info.controllerAccount'),
  },
]);

/**
 * Retrieve the latest nominators count from the indexer and store it in the Vuex state.
 */
const fetchNominatorsCount = async (): Promise<void> => {
  if (!activeEra.value) return;

  const nominatorsCount = await fetchData();

  if (nominatorsCount === undefined || nominatorsCount === null) return;

  setTotalNominators(nominatorsCount);
};

watch(
  () => currentEra.value,
  () => {
    void fetchNominatorsCount();
  },
  { immediate: true }
);

/**
 * Open the validators selection wizard for a new stake.
 */
const stakeNew = (): void => {
  router.push({ name: SoraStakingPageNames.ValidatorsType });
};

/**
 * Open the staking dialog in "add" mode for topping up an existing stake.
 */
const stakeMore = (): void => {
  stakeDialogMode.value = StakeDialogMode.ADD;
  showStakeDialog.value = true;
};

/**
 * Open the staking dialog in "remove" mode to initiate an unbond.
 */
const removeStake = (): void => {
  stakeDialogMode.value = StakeDialogMode.REMOVE;
  showStakeDialog.value = true;
};

/**
 * Display the claim rewards dialog.
 */
const claimRewards = (): void => {
  showClaimRewardsDialog.value = true;
};

/**
 * Close the claim dialog and present the pending rewards overview.
 */
const showRewards = (): void => {
  showClaimRewardsDialog.value = false;
  showPendingRewardsDialog.value = true;
};

/**
 * Switch from the withdraw dialog to the full withdraw history list.
 */
const showAllWithdraws = (): void => {
  showWithdrawDialog.value = false;
  showAllWithdrawsDialog.value = true;
};

/**
 * Reveal the withdraw dialog.
 */
const handleWithdraw = (): void => {
  showWithdrawDialog.value = true;
};

/**
 * Reset the stake dialog visibility once an action has completed.
 */
const handleStake = (): void => {
  showStakeDialog.value = false;
};

/**
 * Close the validators dialog after nomination flow confirmation.
 */
const handleNominate = (): void => {
  showValidatorsDialog.value = false;
};

/**
 * React to dropdown item selection by opening the appropriate dialog.
 */
const handleSelectDropdownMenuItem = (value: DropdownMenuItemType): void => {
  switch (value) {
    case DropdownMenuItemType.PendingRewards:
      showPendingRewardsDialog.value = true;
      break;
    case DropdownMenuItemType.Validators:
      showValidatorsDialog.value = true;
      break;
    case DropdownMenuItemType.ControllerAccount:
      break;
  }
};
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
  max-width: $inner-window-width;
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
  font-weight: 400;
  line-height: 33.6px;
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

  @include mobile(true) {
    button {
      font-size: var(--s-font-size-mini);
    }
  }
}

.withdraw-content {
  .withdraw-header {
    @include mobile(true) {
      flex-wrap: wrap;
      gap: var(--s-size-mini);

      button {
        margin: 0;
      }
    }
  }
}

.overview-info {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  margin-top: 25px;
}
</style>
