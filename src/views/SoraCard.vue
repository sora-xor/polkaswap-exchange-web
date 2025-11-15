<template>
  <div class="sora-card-wrapper">
    <confirmation-info
      v-if="step === Step.ConfirmationInfo"
      v-loading="loading"
      @confirm-apply="openKycPage"
    ></confirmation-info>
    <sora-card-intro
      v-else-if="showIntro"
      :maintenance="isUnderMaintenance"
      @confirm-apply="openKycPage"
    ></sora-card-intro>
    <sora-card-kyc
      v-else-if="step === Step.KYC"
      :get-ready-page="getReadyPage"
      @go-to-start="openStartPage"
      @go-to-kyc-result="openKycResultPage"
      @go-to-dashboard="openDashboard"
    ></sora-card-kyc>
    <dashboard v-else-if="step === Step.Dashboard" @logout="logout"></dashboard>
  </div>
</template>

<script lang="ts" setup>
import { api, WALLET_CONSTS, WALLET_TYPES } from '@wallet';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute } from 'vue-router';

import { Components } from '@/consts';
import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import { lazyComponent } from '@/router';
import store from '@/store';
import { useWalletStore } from '@/stores/wallet';
import { AttemptCounter, VerificationStatus } from '@/types/card';
import { waitForSoraNetworkFromEnv } from '@/utils';

import type { Nullable } from '@/types/common';

const Step = {
  StartPage: 'StartPage',
  KYC: 'KYC',
  ConfirmationInfo: 'ConfirmationInfo',
  Dashboard: 'Dashboard',
  Maintenance: 'Maintenance',
} as const;

type StepKey = (typeof Step)[keyof typeof Step];

defineOptions({
  components: {
    SoraCardIntro: lazyComponent(Components.SoraCardIntroPage),
    SoraCardKyc: lazyComponent(Components.SoraCardKYC),
    ConfirmationInfo: lazyComponent(Components.ConfirmationInfo),
    Dashboard: lazyComponent(Components.Dashboard),
  },
});

const route = useRoute();
const walletStore = useWalletStore();
const { loading, withLoading, withParentLoading, withApi } = useLoading();
const { t } = useTranslation();

const step = ref<Nullable<StepKey>>(null);
const getReadyPage = ref(false);

const attemptCounter = computed(() => store.state.soraCard.attemptCounter as AttemptCounter);
const wantsToPassKycAgain = computed(() => store.state.soraCard.wantsToPassKycAgain as boolean);
const currentStatus = computed(() => store.getters.soraCard.currentStatus as VerificationStatus | undefined);
const soraCardEnabled = computed(() => store.getters.settings.soraCardEnabled as Nullable<boolean>);
const source = computed(() => store.state.wallet.account.source as WALLET_CONSTS.AppWallet | undefined);

const hasFreeAttempts = computed(() => attemptCounter.value?.hasFreeAttempts ?? false);

const isUnderMaintenance = computed(() => step.value === Step.Maintenance);
const showIntro = computed(() => [Step.StartPage, Step.Maintenance].includes(step.value as StepKey));

const hasTokens = computed(() => {
  const accessToken = localStorage.getItem('PW-token');
  const refreshToken = localStorage.getItem('PW-refresh-token');

  if (refreshToken === 'undefined') return false;

  return Boolean(accessToken && refreshToken);
});

const openKycPage = (openGetReadyPage = false) => {
  getReadyPage.value = openGetReadyPage;
  step.value = Step.KYC;
};

const openStartPage = () => {
  step.value = Step.StartPage;
};

const openKycResultPage = () => {
  step.value = Step.ConfirmationInfo;
};

const openDashboard = () => {
  step.value = Step.Dashboard;
};

const logout = () => {
  openStartPage();
};

const subscribeToLiquidity = async () => {
  await Promise.all([
    store.dispatch.pool.subscribeOnAccountLiquidityList(),
    store.dispatch.pool.subscribeOnAccountLiquidityUpdates(),
  ]);
};

const unsubscribeFromLiquidity = async () => {
  await store.dispatch.pool.unsubscribeAccountLiquidityListAndUpdates();
};

const handleAccountChange = async () => {
  const address = route.query?.fearless as Nullable<string>;
  const name = route.query?.name as Nullable<string>;

  if (address && name && api.validateAddress(address)) {
    await walletStore.loginAccount({
      address,
      name,
      source: WALLET_CONSTS.AppWallet.FearlessWallet,
    } as WALLET_TYPES.PolkadotJsAccount);
  }

  await store.dispatch.soraCard.subscribeToTotalXorBalance();
};

const checkKyc = async () => {
  if (soraCardEnabled.value === undefined || soraCardEnabled.value === null) {
    await waitForSoraNetworkFromEnv();
  }

  if (!soraCardEnabled.value) {
    step.value = Step.Maintenance;
    return;
  }

  await store.dispatch.soraCard.getUserStatus();
  await store.dispatch.soraCard.getUserKycAttempt();

  if (currentStatus.value === VerificationStatus.Rejected && wantsToPassKycAgain.value && hasFreeAttempts.value) {
    getReadyPage.value = true;
    step.value = Step.KYC;
    return;
  }

  if (currentStatus.value === VerificationStatus.Accepted) {
    await store.dispatch.soraCard.getUserIban();
    step.value = Step.Dashboard;
    return;
  }

  if ([VerificationStatus.Pending, VerificationStatus.Rejected].includes(currentStatus.value as VerificationStatus)) {
    step.value = Step.ConfirmationInfo;
    return;
  }

  step.value = Step.StartPage;
};

onMounted(async () => {
  await withLoading(async () => {
    await withParentLoading(async () => {
      await subscribeToLiquidity();
    });
    await handleAccountChange();
  });

  const refreshToken = localStorage.getItem('PW-refresh-token');

  if (source.value === WALLET_CONSTS.AppWallet.FearlessWallet && refreshToken) {
    (window as WindowInjectedWeb3).injectedWeb3?.['fearless-wallet']?.saveSoraCardToken?.(refreshToken);
  }

  await checkKyc();
});

onBeforeRouteUpdate(async (_to, _from, next) => {
  await withApi(async () => {
    await handleAccountChange();
  });
  next();
});

onBeforeRouteLeave(async (_to, _from, next) => {
  store.commit.soraCard.setWillToPassKycAgain(false);
  await unsubscribeFromLiquidity();
  await store.dispatch.soraCard.unsubscribeFromTotalXorBalance();
  next();
});

onBeforeUnmount(async () => {
  await unsubscribeFromLiquidity();
  await store.dispatch.soraCard.unsubscribeFromTotalXorBalance();
});

defineExpose({
  Step,
  step,
  getReadyPage,
  loading,
  openKycPage,
  openStartPage,
  openKycResultPage,
  openDashboard,
  logout,
});
</script>

<style lang="scss">
.sora-card-wrapper {
  position: relative;
}

.el-button.neumorphic.s-primary.sora-card__btn {
  margin-top: var(--s-size-mini);

  span.text {
    font-variation-settings: 'wght' 700 !important;
    font-size: 18px;
  }
}
</style>
