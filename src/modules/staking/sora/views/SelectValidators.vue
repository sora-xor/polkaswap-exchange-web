<template>
  <div class="container" v-loading="containerLoading">
    <StakingHeader :previous-page="SoraStakingPageNames.ValidatorsType">{{ title }}</StakingHeader>
    <ValidatorsList
      :mode="newStakeValidatorsMode"
      :validators="validators"
      :selected-validators="selectedValidators"
      @update:selected="selectValidators"
    ></ValidatorsList>
    <s-button class="confirm" type="primary" :disabled="confirmDisabled" @click="handleConfirm">
      {{ confirmText }}
    </s-button>
    <StakeDialog
      v-model:visible="showStakeDialog"
      :mode="StakeDialogMode.NEW"
      :parent-loading="dialogParentLoading"
      @confirm="handleStake"
    ></StakeDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { useRouter } from 'vue-router';

import { useLoading } from '@/composables/useLoading';
import { useSoraStaking } from '@/modules/staking/sora/composables/useSoraStaking';
import {
  SoraStakingComponents,
  SoraStakingPageNames,
  StakeDialogMode,
  ValidatorsListMode,
} from '@/modules/staking/sora/consts';
import { soraStakingLazyComponent } from '@/modules/staking/router';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  parentLoading?: boolean;
}>();

const { t } = useTranslation();
const router = useRouter();
const { loading } = useLoading();
const { newStakeValidatorsMode, validators, selectedValidators, selectValidators } = useSoraStaking();

const StakingHeader = soraStakingLazyComponent(SoraStakingComponents.StakingHeader);
const ValidatorsList = soraStakingLazyComponent(SoraStakingComponents.ValidatorsList);
const StakeDialog = soraStakingLazyComponent(SoraStakingComponents.StakeDialog);

const showStakeDialog = ref(false);

const containerLoading = computed(() => Boolean(props.parentLoading) || !validators.value.length);

const dialogParentLoading = computed(() => Boolean(props.parentLoading) || loading.value);

const title = computed(() =>
  newStakeValidatorsMode.value === ValidatorsListMode.RECOMMENDED
    ? t('soraStaking.validators.recommended')
    : t('soraStaking.validators.select')
);

const confirmText = computed(() =>
  newStakeValidatorsMode.value === ValidatorsListMode.RECOMMENDED
    ? t('soraStaking.validators.next')
    : t('soraStaking.validators.selected', {
        selected: selectedValidators.value.length,
        total: validators.value.length,
      })
);

const confirmDisabled = computed(() => selectedValidators.value.length === 0);

const handleConfirm = (): void => {
  showStakeDialog.value = true;
};

const handleStake = (): void => {
  showStakeDialog.value = false;
  router.push({ name: SoraStakingPageNames.Overview });
};
</script>

<style scoped lang="scss">
.container {
  position: relative;
  max-height: 573px;
}

.confirm {
  position: absolute;
  width: calc(100% - 48px);
  bottom: var(--s-size-mini);
}
</style>
