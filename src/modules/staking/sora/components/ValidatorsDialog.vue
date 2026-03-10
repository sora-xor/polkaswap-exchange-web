<template>
  <DialogBase class="validators-dialog" v-model:visible="isVisible">
    <StakingHeader class="header" :has-back-button="hasBackButton" @back="handleBack">
      {{ title }}
    </StakingHeader>
    <div v-if="!isSelectingEditingMode" class="content">
      <s-tabs v-if="hasTabs" class="tabs" v-model="mode" type="rounded">
        <s-tab
          v-for="tab in tabs"
          :key="tab"
          :label="t(`soraStaking.validatorsDialog.tabs.${tab}`)"
          :name="tab"
        ></s-tab>
      </s-tabs>
      <ValidatorsList :mode="mode" @update:selected="selectValidators"></ValidatorsList>
      <div v-if="showConfirmButton" class="bottom">
        <s-button
          class="confirm"
          type="primary"
          :loading="buttonLoading"
          :disabled="confirmDisabled"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </s-button>
        <div class="info" v-if="isEditMode">
          <InfoLine
            :label="t('networkFeeText')"
            :label-tooltip="t('networkFeeTooltipText')"
            :value="networkFeeFormatted"
            :asset-symbol="xor?.symbol"
            :fiat-value="networkFeeFiat"
            is-formatted
          ></InfoLine>
        </div>
      </div>
    </div>
    <SelectValidatorsMode
      v-else
      @recommended="handleRecommendedMode"
      @selected="handleSelectedMode"
    ></SelectValidatorsMode>
  </DialogBase>
</template>

<script setup lang="ts">
import { components } from '@wallet';
import { computed, ref, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';

import { useDialogModel } from '@/composables/useDialogModel';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTransaction } from '@/composables/useTransaction';
import { useSoraStaking } from '@/modules/staking/sora/composables/useSoraStaking';
import { soraStakingLazyComponent } from '@/modules/staking/router';
import { SoraStakingComponents, ValidatorsListMode } from '@/modules/staking/sora/consts';
import store from '@/store';
import { hasInsufficientXorForFee } from '@/utils';

import type { MyStakingInfo } from '@sora-substrate/sdk/build/staking/types';
import type { CodecString } from '@sora-substrate/sdk';

const props = defineProps<{
  visible: boolean;
  parentLoading?: boolean;
}>();

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'close'): void;
  (event: 'confirm'): void;
}>();

const { t } = useTranslation();
const { getFiatAmountByCodecString } = useFormattedAmount();
const dialogModel = useDialogModel(props, emit);
const { isVisible } = dialogModel;

const {
  stakingInfo,
  validators,
  selectedValidators,
  selectValidators,
  maxNominations,
  xor,
  formatCodecNumber,
  nominate,
} = useSoraStaking();

const { loading, withNotifications, withApi } = useTransaction({
  parentLoading: () => Boolean(props.parentLoading),
});

const DialogBase = components.DialogBase;
const InfoLine = components.InfoLine;
const StakingHeader = soraStakingLazyComponent(SoraStakingComponents.StakingHeader);
const ValidatorsList = soraStakingLazyComponent(SoraStakingComponents.ValidatorsList);
const SelectValidatorsMode = soraStakingLazyComponent(SoraStakingComponents.SelectValidatorsMode);

const mode = ref<ValidatorsListMode>(ValidatorsListMode.USER);
const isSelectingEditingMode = ref(false);
const nominateNetworkFee = ref<string | null>(null);

const tabs = [ValidatorsListMode.USER, ValidatorsListMode.ALL];

const networkFee = computed<CodecString>(() => (nominateNetworkFee.value ?? '0') as CodecString);
const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
const networkFeeFiat = computed(() => (xor.value ? getFiatAmountByCodecString(networkFee.value, xor.value) : null));
const insufficientXorForFee = computed(() =>
  xor.value ? hasInsufficientXorForFee(xor.value, networkFee.value) : false
);

const title = computed(() =>
  hasTabs.value ? t('soraStaking.info.validators') : t('soraStaking.validatorsDialog.title.edit')
);
const hasTabs = computed(() => tabs.includes(mode.value));
const isEditMode = computed(() => [ValidatorsListMode.RECOMMENDED, ValidatorsListMode.SELECT].includes(mode.value));
const hasBackButton = computed(() => isEditMode.value || isSelectingEditingMode.value);

const hasChanges = computed(() => {
  const selected = selectedValidators.value.map((validator) => validator.address);
  const userValidators = stakingInfo.value?.myValidators;
  if (!userValidators) return false;
  const sameLength = selected.length === userValidators.length;
  const sameContent = selected.every((address) => userValidators.includes(address));
  return !(sameLength && sameContent);
});

const tooManySelected = computed(
  () => selectedValidators.value.length > (maxNominations.value ?? Number.POSITIVE_INFINITY)
);

const confirmText = computed(() => {
  switch (mode.value) {
    case ValidatorsListMode.USER:
      return t('soraStaking.validators.change');
    case ValidatorsListMode.RECOMMENDED:
      return insufficientXorForFee.value
        ? t('insufficientBalanceText', { tokenSymbol: xor.value?.symbol ?? '' })
        : hasChanges.value
          ? t('soraStaking.validators.save')
          : t('soraStaking.validators.alreadyNominated');
    case ValidatorsListMode.SELECT:
      return insufficientXorForFee.value
        ? t('insufficientBalanceText', { tokenSymbol: xor.value?.symbol ?? '' })
        : hasChanges.value
          ? tooManySelected.value
            ? t('soraStaking.validators.tooManyValidators')
            : t('soraStaking.validators.selected', {
                selected: selectedValidators.value.length,
                total: validators.value.length,
              })
          : t('soraStaking.validators.alreadyNominated');
    default:
      return '';
  }
});

const showConfirmButton = computed(() => mode.value !== ValidatorsListMode.ALL && !isSelectingEditingMode.value);

const confirmDisabled = computed(() => {
  if (insufficientXorForFee.value && mode.value !== ValidatorsListMode.USER) return true;
  if (mode.value === ValidatorsListMode.RECOMMENDED) return !hasChanges.value;
  if (mode.value === ValidatorsListMode.SELECT) {
    return selectedValidators.value.length === 0 || !hasChanges.value || tooManySelected.value;
  }
  return false;
});

const buttonLoading = computed(() => Boolean(props.parentLoading) || loading.value);

const setStakingInfo = (info: MyStakingInfo) => {
  store.commit.staking.setStakingInfo(info);
};

const setMode = (nextMode: ValidatorsListMode) => {
  mode.value = nextMode;
  isSelectingEditingMode.value = false;
};

/**
 * Retrieves the nomination fee whenever the candidate set changes.
 */
const updateNominateFee = async () => {
  try {
    await withApi(async () => {
      nominateNetworkFee.value = await store.dispatch.staking.getNominateNetworkFee();
    });
  } catch (error) {
    console.error('Failed to fetch nominate network fee', error);
    nominateNetworkFee.value = null;
  }
};

watch(selectedValidators, updateNominateFee, { immediate: true });

watch(isVisible, (visible) => {
  if (visible) {
    setMode(ValidatorsListMode.USER);
    selectValidators([]);
  }
});

const handleBack = () => {
  if (isSelectingEditingMode.value) {
    setMode(ValidatorsListMode.USER);
  } else {
    isSelectingEditingMode.value = true;
  }
};

const handleRecommendedMode = () => {
  setMode(ValidatorsListMode.RECOMMENDED);
};

const handleSelectedMode = () => {
  setMode(ValidatorsListMode.SELECT);
};

/**
 * Applies the chosen validator set, performing an on-chain nomination when required.
 */
const handleConfirm = async () => {
  if (mode.value === ValidatorsListMode.USER) {
    isSelectingEditingMode.value = true;
    return;
  }

  await withNotifications(async () => {
    await nominate();

    if (!stakingInfo.value) {
      throw new Error('There is no staking info');
    }

    setStakingInfo({
      ...stakingInfo.value,
      myValidators: selectedValidators.value.map((validator) => validator.address),
    });

    setMode(ValidatorsListMode.USER);
    emit('confirm');
  });
};
</script>

<style lang="scss">
.validators-dialog {
  @include custom-tabs;

  .el-dialog__header {
    position: absolute;
  }
}
</style>

<style lang="scss" scoped>
.header {
  margin: 16px 0;
}

.bottom {
  position: relative;
  width: 100%;
  bottom: var(--s-size-mini);
  margin-top: -16px;
  margin-bottom: -28px;
}

.confirm {
  width: 100%;
}

.info {
  margin-top: 12px;
}
</style>
