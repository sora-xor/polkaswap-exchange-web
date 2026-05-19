<template>
  <div class="container container--validator-select" v-loading="containerLoading">
    <StakingHeader :previous-page="SoraStakingPageNames.ValidatorsType">{{ title }}</StakingHeader>
    <ValidatorsList
      :mode="newStakeValidatorsMode"
      :validators="validators"
      :selected-validators="selectedValidators"
      show-selection-controls
      @update:selected="handleSelectValidators"
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
import { SoraStakingPageNames, StakeDialogMode, ValidatorsListMode } from '@/modules/staking/sora/consts';
import StakeDialog from '@/modules/staking/sora/components/StakeDialog.vue';
import StakingHeader from '@/modules/staking/sora/components/StakingHeader.vue';
import { useSoraStaking } from '@/modules/staking/sora/composables/useSoraStaking';
import ValidatorsList from '@/modules/staking/sora/components/ValidatorsList.vue';

import type { ValidatorInfoFull } from '@sora-substrate/sdk/build/staking/types';

defineOptions({
  name: 'SoraSelectValidatorsPage',
  inheritAttrs: false,
});

const props = defineProps<{
  parentLoading?: boolean;
}>();

const { t } = useTranslation();
const router = useRouter();
const { loading } = useLoading();
const { newStakeValidatorsMode, validators, selectedValidators, selectValidators } = useSoraStaking();

const showStakeDialog = ref(false);

// Keep the selection list usable when validators are already loaded and only background staking subscriptions are pending.
const containerLoading = computed(() => !validators.value.length && Boolean(props.parentLoading));

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

/**
 * Checks component-boundary payloads defensively before accepting child selection events.
 */
const isValidatorWithAddress = (value: unknown): value is ValidatorInfoFull =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Partial<ValidatorInfoFull>).address === 'string' &&
  Boolean((value as Partial<ValidatorInfoFull>).address);

/**
 * Accepts only unique validators from the current list so stale or malformed child events cannot nominate unknown addresses.
 */
const handleSelectValidators = (value: unknown): void => {
  const allowedAddresses = new Set(validators.value.map((validator) => validator.address));
  const selectedAddresses = new Set<string>();
  const incomingValidators = Array.isArray(value) ? value.filter(isValidatorWithAddress) : [];
  const normalizedSelection = incomingValidators.reduce<ValidatorInfoFull[]>((buffer, validator) => {
    if (!allowedAddresses.has(validator.address) || selectedAddresses.has(validator.address)) return buffer;

    selectedAddresses.add(validator.address);
    buffer.push(validator);
    return buffer;
  }, []);

  selectValidators(normalizedSelection);
};

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
  width: min(100%, 760px);
  max-width: 760px;
  --validators-list-height: 380px;

  @include desktop {
    width: min(100%, 1040px);
    max-width: 1040px;
    --validators-list-height: clamp(380px, calc(100dvh - 380px), 560px);
  }

  @include large-desktop {
    width: min(100%, 1120px);
    max-width: 1120px;
    --validators-list-height: clamp(420px, calc(100dvh - 380px), 620px);
  }
}

.confirm {
  position: absolute;
  width: calc(100% - 48px);
  bottom: var(--s-size-mini);
}
</style>
