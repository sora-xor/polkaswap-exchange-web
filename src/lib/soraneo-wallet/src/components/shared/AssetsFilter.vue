<template>
  <div class="assets-filter-wrapper">
    <div :class="computedClasses">
      <s-popover-panel popper-class="assets-filter" trigger="click" :visible-arrow="false">
        <div class="assets-filter__headline">
          <div class="assets-filter__text">{{ t('filter.show') }}</div>
          <div class="assets-filter__text--reset" @click="resetFilter">{{ t('filter.reset') }}</div>
        </div>
        <s-radio-group v-model="selectedFilter" class="assets-filter-options">
          <s-radio v-for="(filter, index) in filterOptionsText" :key="index" size="small" :label="getLabel(index)">
            {{ filter }}
          </s-radio>
        </s-radio-group>
        <div v-if="showOnlyVerifiedSwitch" class="assets-filter__switch--only-verified">
          <s-divider></s-divider>
          <div class="add-asset-token__switch-btn">
            <s-switch v-model="isVerifiedOnly" :disabled="loading"></s-switch>
            <span>{{ t(`addAsset.${AddAssetTabs.Token}.switchBtn`) }}</span>
          </div>
        </div>
        <template #reference>
          <div v-button class="assets-filter__button">
            {{ showText }}:
            <span class="assets-filter__button-option">{{ chosenOptionText }}</span>
            <s-icon class="assets-filter__button-icon" name="basic-settings-24" size="14px"></s-icon>
          </div>
        </template>
      </s-popover-panel>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { AddAssetTabs } from '@/consts';
import { useSettingsStore } from '@/stores/settings';
import { FilterOptions } from '@/types/common';

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    showOnlyVerifiedSwitch?: boolean;
  }>(),
  {
    modelValue: false,
    showOnlyVerifiedSwitch: false,
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
}>();

const { t, TranslationConsts } = useTranslation();
const settingsStore = useSettingsStore();

const loading = ref(false);

const assetsFilter = computed<FilterOptions>(() => settingsStore.assetsFilter ?? FilterOptions.All);

const selectedFilter = computed<FilterOptions>({
  get: () => assetsFilter.value,
  set: (value: FilterOptions) => {
    settingsStore.setAssetsFilter(value);
  },
});

const isVerifiedOnly = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const computedClasses = computed(() => ['assets-filter-wrapper__content'].join(' '));

const getLabel = (index: number) => Object.values(FilterOptions)[index];

const resetFilter = () => {
  selectedFilter.value = FilterOptions.All;
  isVerifiedOnly.value = true;
};

const filterOptionsText = computed(() => [
  t('filter.all'),
  t('filter.native'),
  TranslationConsts.Kensetsu,
  t('filter.synthetics'),
  TranslationConsts.Ceres,
]);

const chosenOptionText = computed(() => {
  switch (assetsFilter.value) {
    case FilterOptions.Native:
      return t('filter.native').toUpperCase();
    case FilterOptions.Kensetsu:
      return TranslationConsts.Kensetsu.toUpperCase();
    case FilterOptions.Synthetics:
      return t('filter.synthetics').toUpperCase();
    case FilterOptions.Ceres:
      return TranslationConsts.Ceres.toUpperCase();
    default:
      return t('filter.all').toUpperCase();
  }
});

const showText = computed(() => t('filter.show').toUpperCase());

defineExpose({
  resetFilter,
  selectedFilter,
});
</script>

<style lang="scss" scoped>
.assets-filter-wrapper {
  &__content {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    text-align: center;
    font-size: var(--s-font-size-mini);
  }
}

.add-asset-token {
  &__switch-btn {
    display: flex;
    margin-bottom: 14px;
    .s-switch {
      margin-right: 12px;
    }
  }
}
</style>

<style lang="scss">
$size-px: 16px;

.assets-filter {
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

  &__headline {
    display: flex;

    .assets-filter__text--reset {
      position: absolute;
      right: 16px;
      color: var(--s-color-theme-accent);

      &:hover {
        cursor: pointer;
      }
    }
  }

  &-options {
    display: flex !important;
    flex-direction: column;
    margin-bottom: $inner-spacing-medium;
  }

  &__text {
    margin-bottom: 4px;
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

  .el-divider--horizontal {
    margin: 16px 0;
  }
}
</style>
