<template>
  <div class="wallet-assets-headline">
    <div :class="computedClasses">
      <div v-if="assetsFiatAmount" class="total-fiat-values">
        <span class="total-fiat-values__title">{{ t('assets.totalAssetsValue') }}</span>
        <formatted-amount
          value-can-be-hidden
          is-fiat-value
          integer-only
          with-left-shift
          :value="assetsFiatAmount"
        ></formatted-amount>
      </div>
      <s-popover-panel popper-class="wallet-assets-filter" trigger="click" :visible-arrow="false">
        <div class="wallet-assets-filter__text">{{ t('filter.showAssets') }}</div>
        <s-radio-group v-model="selectedFilter">
          <s-radio v-for="(filter, index) in filterOptionsText" :key="index" size="small" :label="getLabel(index)">
            {{ filter }}
          </s-radio>
        </s-radio-group>
        <s-divider class="wallet-assets-filter__divider"></s-divider>
        <div class="wallet-assets-filter__switch">
          <s-switch v-model="onlyVerifiedAssets" :disabled="verifiedOnlySwitchDisabled"></s-switch>
          <span>{{ t('filter.verifiedOnly') }}</span>
        </div>
        <div class="wallet-assets-filter__switch">
          <s-switch v-model="zeroBalanceAssets" :disabled="zeroBalanceSwitch"></s-switch>
          <span>{{ t('filter.zeroBalance') }}</span>
        </div>
        <template #reference>
          <div v-button class="wallet-assets-filter__button">
            {{ showText }}:
            <span class="wallet-assets-filter__button-option">{{ chosenOptionText }}</span>
            <s-icon class="wallet-assets-filter__button-icon" name="basic-settings-24" size="14px"></s-icon>
          </div>
        </template>
      </s-popover-panel>
    </div>
    <s-divider class="wallet-assets-headline__divider"></s-divider>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { WalletFilteringOptions, type WalletAssetFilters } from '@/consts';
import { useSettingsStore } from '@/stores/settings';

import FormattedAmount from './FormattedAmount.vue';

const props = withDefaults(
  defineProps<{
    assetsFiatAmount?: string;
  }>(),
  {
    assetsFiatAmount: '0',
  }
);

const emit = defineEmits<{
  (event: 'update-filter'): void;
}>();

const { t, TranslationConsts } = useTranslation();
const settingsStore = useSettingsStore();

const filters = computed<WalletAssetFilters>(() => settingsStore.filters);

const zeroBalanceSwitch = ref(false);

const updateFilters = <K extends keyof WalletAssetFilters>(key: K, value: WalletAssetFilters[K]) => {
  const updatedFilters = {
    ...filters.value,
    [key]: value,
  } as WalletAssetFilters;

  settingsStore.setFilterOptions(updatedFilters);
  emit('update-filter');
};

const onlyVerifiedAssets = computed({
  get: () => filters.value.verifiedOnly,
  set: (value: boolean) => updateFilters('verifiedOnly', value),
});

const zeroBalanceAssets = computed({
  get: () => filters.value.zeroBalance,
  set: (value: boolean) => updateFilters('zeroBalance', value),
});

const selectedFilter = computed({
  get: () => filters.value.option,
  set: (value: WalletAssetFilters['option']) => {
    updateFilters('option', value);

    if (value === WalletFilteringOptions.NFT) {
      onlyVerifiedAssets.value = false;
    }
  },
});

const getLabel = (index: number) => Object.values(WalletFilteringOptions)[index];

const filterOptionsText = computed(() => [t('filter.all'), t('filter.token'), TranslationConsts.NFT]);

const verifiedOnlySwitchDisabled = computed(() => filters.value.option === WalletFilteringOptions.NFT);

const chosenOptionText = computed(() => {
  switch (filters.value.option) {
    case WalletFilteringOptions.Currencies:
      return t('filter.token').toUpperCase();
    case WalletFilteringOptions.NFT:
      return TranslationConsts.NFT.toUpperCase();
    default:
      return t('filter.all').toUpperCase();
  }
});

const showText = computed(() => t('filter.show').toUpperCase());

const computedClasses = computed(() => {
  const baseClass = ['wallet-assets-headline__content'];
  if (!props.assetsFiatAmount) {
    baseClass.push('wallet-assets-headline__content--no-fiat');
  }
  return baseClass.join(' ');
});

defineExpose({
  onlyVerifiedAssets,
  zeroBalanceAssets,
  selectedFilter,
  getLabel,
  updateFilters,
});
</script>

<style lang="scss" scoped>
.wallet-assets-headline {
  &__content {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    padding-top: #{$basic-spacing-tiny};
    padding-bottom: #{$basic-spacing-tiny};
    text-align: center;
    font-size: var(--s-font-size-mini);

    &--no-fiat > span {
      position: relative;
      left: 100%;
      transform: translateX(-100%);
    }
  }
  &__divider {
    margin: 0;
  }
}
.total-fiat-values {
  display: flex;
  align-items: baseline;
  &__title {
    text-transform: uppercase;
    padding-right: #{$basic-spacing-extra-mini};
    white-space: nowrap;
    font-weight: 300;
    letter-spacing: var(--s-letter-spacing-small);
  }
  .formatted-amount--fiat-value {
    display: block;
    font-size: var(--s-font-size-small);
    font-weight: 500;
  }
}
</style>

<style lang="scss">
$size-px: 16px;

.wallet-assets-filter {
  &.el-popover {
    background-color: var(--s-color-utility-body);
    border-radius: $size-px;
    color: var(--s-color-base-content-primary);
    border: none;
    padding: $size-px $size-px 0 $size-px;
    font-size: var(--s-font-size-small);
    .el-radio {
      font-weight: 300;
      margin-right: 20px;
      & .el-radio__label {
        font-size: var(--s-font-size-small);
      }
    }
  }

  &__switch {
    @include switch-block(var(--s-font-size-small));
    & {
      padding-top: 0;
    }
    .s-switch.neumorphic .el-switch__input:disabled + .el-switch__core {
      background-color: var(--s-color-base-border-secondary);
    }
  }

  &__text {
    margin-bottom: 4px;
  }

  &__divider {
    margin: 16px 0;
  }

  &__button {
    background-color: var(--s-color-base-border-primary);
    padding: 3px 8px;
    border-radius: 10px;
    transition: 0s background-color;

    color: var(--s-color-base-content-primary);
    font-weight: 300;
    &-option {
      color: var(--s-color-theme-accent);
    }

    & &-icon {
      color: var(--s-color-base-content-tertiary);
      margin-left: 6px;
    }

    &:hover {
      cursor: pointer;
      background-color: var(--s-color-base-border-secondary);
      transition-delay: 0.05s;
    }
  }
}
</style>
