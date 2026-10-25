<template>
  <dialog-base class="validators-filter-dialog" v-model:visible="isVisible">
    <div class="filter-container">
      <h1 class="title">
        {{ t('soraStaking.validatorsFilterDialog.title') }}
      </h1>
      <div class="filter">
        <div v-for="item in filterData" :key="item.key" class="filter-item">
          <div class="filter-item-header">
            <div class="filter-item-label">{{ item.name }}</div>
            <s-switch
              class="filter-item-switch"
              :class="{ 'is-active': localFilter[item.key] }"
              v-model="localFilter[item.key]"
            ></s-switch>
          </div>
          <div class="filter-item-description">{{ item.description }}</div>
        </div>
      </div>
      <s-button class="save-button" type="primary" @click="save">
        {{ t('soraStaking.validatorsFilterDialog.save') }}
      </s-button>
      <div v-button class="reset-all" @click="resetAll">
        {{ t('soraStaking.validatorsFilterDialog.reset') }}
      </div>
    </div>
  </dialog-base>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';

import { emptyValidatorsFilter, ValidatorsFilterType } from '@/modules/staking/sora/consts';

import type { ValidatorsFilter } from '@/modules/staking/sora/types';

type ValidatorFilterRow = {
  key: ValidatorsFilterType;
  name: string;
  description: string;
};

const props = defineProps<{
  filter: ValidatorsFilter;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'save', value: ValidatorsFilter): void;
}>();

const isVisible = defineModel<boolean>('visible', { default: false });
const { t } = useTranslation();

const localFilter = reactive<ValidatorsFilter>({ ...emptyValidatorsFilter, ...props.filter });

const filterKeys = Object.values(ValidatorsFilterType);

/**
 * Resolves each filter row through string translation keys so Vue I18n never
 * returns an object fallback that can be iterated into blank switch rows.
 */
const filterData = computed<ValidatorFilterRow[]>(() =>
  filterKeys.map((key) => ({
    key,
    name: t(`soraStaking.validatorsFilterDialog.filters.${key}.name`),
    description: t(`soraStaking.validatorsFilterDialog.filters.${key}.description`),
  }))
);

const syncLocalFilter = () => {
  Object.assign(localFilter, emptyValidatorsFilter, props.filter);
};

watch(
  isVisible,
  (visible) => {
    if (visible) syncLocalFilter();
  },
  { immediate: true }
);

watch(
  () => props.filter,
  () => {
    if (isVisible.value) syncLocalFilter();
  },
  { deep: true }
);

const save = () => {
  emit('save', { ...localFilter });
};

const resetAll = () => {
  Object.assign(localFilter, emptyValidatorsFilter);
};

defineExpose({ localFilter, save, resetAll, filterData });
</script>

<style lang="scss">
.validators-filter-dialog .el-dialog__header {
  position: absolute;
  pointer-events: none;

  button {
    pointer-events: all;
  }
}
</style>

<style lang="scss" scoped>
.filter-container {
  width: 100%;
}

.title {
  text-align: center;
  font-size: var(--s-font-size-large);
  line-height: 42px;
  margin-bottom: 2px;

  &-tooltip {
    margin-left: 8px;
  }
}

.filter-item {
  padding: 20px 0;

  &:not(:last-child) {
    border-bottom: 1px solid var(--s-color-base-border-secondary);
  }

  &-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    height: 24px;
  }

  &-label {
    font-size: 16px;
  }

  &-description {
    margin-top: 8px;
    font-size: var(--s-font-size-extra-small);
    line-height: 140%;
    font-weight: 300;
    color: var(--s-color-text-secondary);
  }
}

.save-button,
.reset-button {
  width: 100%;
}

.reset-all {
  color: var(--s-color-theme-accent);
  text-align: center;
  font-size: var(--s-font-size-extra-small);
  font-style: normal;
  font-weight: 300;
  text-transform: uppercase;
  cursor: pointer;
  margin-top: 16px;
}
</style>
