<template>
  <div>
    <router-view class="sora-staking-container" v-bind="routerViewBindings"></router-view>
    <ValidatorsFilterDialog
      v-model:visible="showFilterDialog"
      :parent-loading="dialogParentLoading"
      :filter="validatorsFilter"
      @save="handleChangeFilter"
    ></ValidatorsFilterDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch, useAttrs } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useSubscriptions } from '@/composables/useSubscriptions';
import { useSoraStaking } from '@/modules/staking/sora/composables/useSoraStaking';
import { SoraStakingComponents, SoraStakingPageNames } from '@/modules/staking/sora/consts';
import { soraStakingLazyComponent } from '@/modules/staking/router';
import store from '@/store';

import type { AsyncFnWithoutArgs } from '@/types/common';
import type { ValidatorsFilter } from '../types';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  parentLoading?: boolean;
}>();

const attrs = useAttrs();
const router = useRouter();
const route = useRoute();

const {
  validatorsFilter,
  showValidatorsFilterDialog,
  setValidatorsFilter,
  setShowValidatorsFilterDialog,
  newStakeValidatorsMode,
  currentEra,
} = useSoraStaking();

const ValidatorsFilterDialog = soraStakingLazyComponent(SoraStakingComponents.ValidatorsFilterDialog);

const parentLoadingFlag = computed(() => Boolean(props.parentLoading));

const stakingDispatch = store.dispatch.staking;
const stakingCommit = store.commit.staking;

const getStakingInfo = () => stakingDispatch.getStakingInfo();
const getValidatorsInfo = () => stakingDispatch.getValidatorsInfo();
const getMinNominatorBond = () => stakingDispatch.getMinNominatorBond();
const getUnbondPeriod = () => stakingDispatch.getUnbondPeriod();
const getMaxNominations = () => stakingDispatch.getMaxNominations();
const getHistoryDepth = () => stakingDispatch.getHistoryDepth();
const getPendingRewards = () => stakingDispatch.getPendingRewards();
const subscribeOnActiveEra = () => stakingDispatch.subscribeOnActiveEra();
const subscribeOnCurrentEra = () => stakingDispatch.subscribeOnCurrentEra();
const subscribeOnController = () => stakingDispatch.subscribeOnController();
const subscribeOnPayee = () => stakingDispatch.subscribeOnPayee();
const subscribeOnNominations = () => stakingDispatch.subscribeOnNominations();
const subscribeOnAccountLedger = () => stakingDispatch.subscribeOnAccountLedger();
const subscribeOnCurrentEraTotalStake = () => stakingDispatch.subscribeOnCurrentEraTotalStake();

const startStakingSubscriptions: AsyncFnWithoutArgs = async () => {
  await Promise.all([
    getStakingInfo(),
    getValidatorsInfo(),
    getMinNominatorBond(),
    getUnbondPeriod(),
    getMaxNominations(),
    getHistoryDepth(),
    getPendingRewards(),
    subscribeOnActiveEra(),
    subscribeOnCurrentEra(),
    subscribeOnController(),
    subscribeOnPayee(),
    subscribeOnNominations(),
    subscribeOnAccountLedger(),
  ]);
  await subscribeOnCurrentEraTotalStake();
};

const resetStakingSubscriptions = async () => {
  stakingCommit.resetActiveEraUpdates();
  stakingCommit.resetCurrentEraUpdates();
  stakingCommit.resetCurrentEraTotalStakeUpdates();
  stakingCommit.resetControllerUpdates();
  stakingCommit.resetPayeeUpdates();
  stakingCommit.resetNominationsUpdates();
  stakingCommit.resetAccountLedgerUpdates();
};

const { loading, subscriptionsDataLoading, updateSubscriptions } = useSubscriptions({
  parentLoading: parentLoadingFlag,
  startSubscriptions: [startStakingSubscriptions],
  resetSubscriptions: [resetStakingSubscriptions],
  autoStart: false,
});

const showFilterDialog = computed({
  get: () => showValidatorsFilterDialog.value,
  set: (value: boolean) => setShowValidatorsFilterDialog(value),
});

const dialogParentLoading = computed(() => parentLoadingFlag.value || loading.value);

const routerViewBindings = computed(() => ({
  ...attrs,
  parentLoading: subscriptionsDataLoading.value,
}));

const handleChangeFilter = (filter: ValidatorsFilter): void => {
  setShowValidatorsFilterDialog(false);
  setValidatorsFilter(filter);
};

watch(
  () => currentEra.value,
  (era, previous) => {
    if (era === previous || era === undefined || era === null) return;
    void subscribeOnCurrentEraTotalStake();
  }
);

onMounted(async () => {
  if (!newStakeValidatorsMode.value && route.name !== SoraStakingPageNames.Overview) {
    router.push({ name: SoraStakingPageNames.Overview });
  }

  await updateSubscriptions();
});
</script>

<style lang="scss">
.sora-staking-container {
  display: flex;
  flex-direction: column;
  .info-line:last-child {
    border-bottom: none;
  }
}
</style>
