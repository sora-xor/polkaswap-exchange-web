<template>
  <div class="validators">
    <div v-if="!isValidatorModeRecommended" class="search-container">
      <s-input
        v-model="search"
        type="text"
        :placeholder="t('soraStaking.validatorsList.search')"
        prefix="s-icon-basic-search-24"
      >
        <template #right>
          <s-button class="filters-button" type="outline" size="mini" @click="openFilters">
            <div class="filters-button-content">
              <span>{{ t('soraStaking.validatorsFilterDialog.title') }}</span>
              <s-icon name="basic-settings-24" size="14px"></s-icon>
            </div>
          </s-button>
        </template>
      </s-input>
    </div>

    <div class="table-header">
      <div class="table-header-avatar table-header-item">
        <s-icon name="various-bone-24" size="14px"></s-icon>
      </div>
      <div class="table-header-name table-header-item">{{ t('soraStaking.validatorsList.name') }}</div>
      <div class="table-header-info table-header-item">
        <div v-button :class="commissionHeaderClass" @click="setCommissionSort">
          <span>{{ t('soraStaking.validatorsList.commission') }}</span>
          <s-tooltip border-radius="mini" :content="t('soraStaking.validatorsList.commissionTooltip')">
            <s-icon name="info-16" size="14px"></s-icon>
          </s-tooltip>
          <s-icon class="chevron" name="arrows-chevron-top-rounded-24" size="18"></s-icon>
        </div>
        <div v-button :class="returnHeaderClass" @click="setReturnSort">
          <span>{{ t('soraStaking.validatorsList.return') }}</span>
          <s-tooltip border-radius="mini" :content="t('comingSoonText')">
            <s-icon name="info-16" size="14px"></s-icon>
          </s-tooltip>
          <s-icon class="chevron" name="arrows-chevron-top-rounded-24" size="18"></s-icon>
        </div>
      </div>
    </div>

    <div class="list">
      <div v-if="!filteredValidators.length" class="empty">
        <span>{{ emptyText }}</span>
      </div>
      <s-scrollbar v-else class="validators-list-scrollbar">
        <ul class="list">
          <li v-for="validator in filteredValidators" :key="validator.address" class="validator">
            <ValidatorAvatar class="avatar" :validator="validator">
              <template #icon>
                <div v-if="isSelected(validator)" class="check">
                  <s-icon name="basic-check-mark-24" size="12px"></s-icon>
                </div>
              </template>
            </ValidatorAvatar>
            <div class="name-and-address">
              <div class="name">
                {{ formatName(validator) }}
              </div>
              <FormattedAddress :value="validator.address" :symbols="16"></FormattedAddress>
            </div>
            <div class="info">
              <span :class="commissionClass">{{ formatCommission(validator.commission) }}%</span>
              <br />
              <span :class="returnClass">{{ formatReturn(validator.apy) }}%</span>
            </div>
            <div
              v-if="mode === ValidatorsListMode.SELECT"
              v-button
              class="select-area"
              @click="toggleSelectValidator(validator)"
            ></div>
          </li>
        </ul>
      </s-scrollbar>
    </div>
    <div class="blackout"></div>
  </div>
</template>

<script setup lang="ts">
import { components } from '@/shims/wallet-components';
import { computed, onMounted, ref, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';

import { useSoraStaking } from '@/modules/staking/sora/composables/useSoraStaking';
import { useValidatorsFormatting } from '@/modules/staking/sora/composables/useValidatorsFormatting';
import {
  emptyValidatorsFilter,
  recommendedValidatorsFilter,
  SoraStakingComponents,
  ValidatorsListMode,
} from '@/modules/staking/sora/consts';
import { soraStakingLazyComponent } from '@/modules/staking/router';

import type { ValidatorsFilter } from '@/modules/staking/sora/types';
import type { ValidatorInfoFull } from '@sora-substrate/sdk/build/staking/types';

defineOptions({
  inheritAttrs: false,
  components: {
    FormattedAddress: components.FormattedAddress,
  },
});

enum Sort {
  COMMISSION_ASC = 'commission-asc',
  COMMISSION_DESC = 'commission-desc',
  RETURN_ASC = 'return-asc',
  RETURN_DESC = 'return-desc',
}

const props = defineProps<{
  mode: ValidatorsListMode;
  selectedValidators?: ValidatorInfoFull[];
}>();

const emit = defineEmits<{
  (event: 'update:selected', value: ValidatorInfoFull[]): void;
}>();

const { t } = useTranslation();
const {
  validators,
  validatorsFilter,
  setShowValidatorsFilterDialog,
  setValidatorsFilter,
  maxNominations,
  stakingInfo,
} = useSoraStaking();
const { formatName, decodeName, formatCommission, formatReturn } = useValidatorsFormatting();

const ValidatorAvatar = soraStakingLazyComponent(SoraStakingComponents.ValidatorAvatar);

const search = ref('');
const sort = ref<Sort>(Sort.RETURN_DESC);

const isValidatorModeRecommended = computed(() => props.mode === ValidatorsListMode.RECOMMENDED);
const selectedValidators = computed(() => props.selectedValidators ?? []);

const calcSortClass = (base: string, value: Sort, asc: Sort, desc: Sort) => ({
  [base]: true,
  [`${base}--active`]: value === asc || value === desc,
  [`${base}--asc`]: value === asc,
  [`${base}--desc`]: value === desc,
});

const sortedValidators = computed(() => {
  const list = [...(validators.value ?? [])];

  return list.sort((a, b) => {
    switch (sort.value) {
      case Sort.COMMISSION_ASC:
        return Number(a.commission) - Number(b.commission);
      case Sort.COMMISSION_DESC:
        return Number(b.commission) - Number(a.commission);
      case Sort.RETURN_ASC:
        return Number(a.apy) - Number(b.apy);
      case Sort.RETURN_DESC:
        return Number(b.apy) - Number(a.apy);
      default:
        return 0;
    }
  });
});

const applyFilter = (list: ValidatorInfoFull[], filter: ValidatorsFilter, term = '') =>
  list.filter((validator) => {
    if (filter.hasIdentity && (!validator.identity || !Object.keys(validator.identity.info).length)) return false;
    if (filter.notSlashed && validator.blocked) return false;
    if (filter.notOversubscribed && validator.isOversubscribed) return false;
    if (filter.twoValidatorsPerIdentity && validator.isOversubscribed) {
      const sameIdentity = list.filter((item) => item.identity?.info.display === validator.identity?.info.display);
      if (sameIdentity.length > 2) return false;
    }

    const name = decodeName(validator);
    return name.toLowerCase().includes(term.toLowerCase());
  });

const filteredValidators = computed(() => {
  const currentList = sortedValidators.value;
  const baseFilter = validatorsFilter.value ?? emptyValidatorsFilter;

  switch (props.mode) {
    case ValidatorsListMode.RECOMMENDED:
      return applyFilter(currentList, recommendedValidatorsFilter).slice(0, maxNominations.value ?? currentList.length);
    case ValidatorsListMode.USER:
      return applyFilter(currentList, baseFilter, search.value).filter((validator) =>
        stakingInfo.value?.myValidators.includes(validator.address)
      );
    default:
      return applyFilter(currentList, baseFilter, search.value);
  }
});

const emptyText = computed(() => {
  if (props.mode === ValidatorsListMode.USER && (stakingInfo.value?.myValidators.length ?? 0) === 0) {
    return t('soraStaking.validatorsList.noNominatedValidators');
  }

  return t('soraStaking.validatorsList.noValidators');
});

const commissionHeaderClass = computed(() =>
  calcSortClass('table-header-commission', sort.value, Sort.COMMISSION_ASC, Sort.COMMISSION_DESC)
);
const returnHeaderClass = computed(() =>
  calcSortClass('table-header-return', sort.value, Sort.RETURN_ASC, Sort.RETURN_DESC)
);
const commissionClass = computed(() =>
  calcSortClass('info-commission', sort.value, Sort.COMMISSION_ASC, Sort.COMMISSION_DESC)
);
const returnClass = computed(() => calcSortClass('info-return', sort.value, Sort.RETURN_ASC, Sort.RETURN_DESC));

const setCommissionSort = () => {
  sort.value =
    sort.value === Sort.COMMISSION_ASC
      ? Sort.COMMISSION_DESC
      : sort.value === Sort.COMMISSION_DESC
        ? Sort.COMMISSION_ASC
        : Sort.COMMISSION_ASC;
};

const setReturnSort = () => {
  sort.value = sort.value === Sort.RETURN_ASC ? Sort.RETURN_DESC : Sort.RETURN_ASC;
};

const toggleSelectValidator = (validator: ValidatorInfoFull) => {
  if (isValidatorModeRecommended.value) return;

  const selected = [...selectedValidators.value];
  const index = selected.findIndex((item) => item.address === validator.address);

  if (index > -1) {
    selected.splice(index, 1);
  } else {
    selected.push(validator);
  }

  emit('update:selected', selected);
};

const isSelected = (validator: ValidatorInfoFull) =>
  selectedValidators.value.some((item) => item.address === validator.address);

const openFilters = () => {
  setShowValidatorsFilterDialog(true);
};

onMounted(() => {
  setValidatorsFilter(emptyValidatorsFilter);
});

watch(
  () => [filteredValidators.value, props.mode],
  () => {
    if (isValidatorModeRecommended.value) {
      emit('update:selected', filteredValidators.value);
    }
  },
  { immediate: true }
);

defineExpose({
  toggleSelectValidator,
  setCommissionSort,
  setReturnSort,
  openFilters,
});
</script>

<style lang="scss">
.validators-list-scrollbar {
  .el-scrollbar__wrap {
    overflow-x: hidden;
  }
  .el-scrollbar__bar.is-horizontal {
    display: none;
  }
}
</style>

<style scoped lang="scss">
.validators {
  overflow: hidden;
  position: relative;
  padding: 0 8px;
  margin: 0 -8px;
}

.search-container {
  position: relative;
  display: flex;
  align-items: center;
  margin-top: 16px;
}

.filters-button {
  margin-left: 8px;
  border-radius: 8px;
  background: var(--s-color-base-on-accent);

  &:not(:hover) {
    border-color: var(--s-color-base-border-secondary);
  }

  &-content {
    display: flex;
    gap: 6px;
    color: var(--s-color-base-content-primary);

    span {
      font-weight: 400;
      letter-spacing: -0.24px;
    }

    i {
      color: var(--s-color-base-content-tertiary);
    }
  }
}

.blackout {
  position: absolute;
  width: 100%;
  height: 132px;
  bottom: 0;
  left: 0;
  pointer-events: none;
  background: linear-gradient(180deg, transparent 0%, var(--s-color-utility-surface) 100%);
}

.table-header {
  display: flex;
  align-content: center;
  height: 64px;
  margin-top: 16px;
  border-bottom: 1px solid var(--s-color-base-border-secondary);

  &-item {
    display: flex;
    align-items: center;
    color: var(--s-color-brand-day);

    font-size: 14px;
    font-style: normal;
    font-weight: 700;
    line-height: normal;
    letter-spacing: -0.28px;
    text-transform: uppercase;
    user-select: none;
  }
  &-avatar {
    display: flex;
    justify-content: center;
    width: 38px;

    i {
      color: var(--s-color-base-content-tertiary);
    }
  }
  &-name {
    flex: 1;
    margin-left: 8px;
  }
  &-info {
    flex-direction: column;
    justify-content: center;
    align-items: flex-end;
  }
  &-commission,
  &-return {
    display: flex;
    align-items: center;
    height: 21px;
    padding: 2px 6px;
    border-radius: 8px;
  }
  &-commission:not(&-commission--active),
  &-return:not(&-return--active) {
    font-style: normal;
    padding-right: 6px;
    cursor: pointer;
  }
  &-commission--active,
  &-return--active {
    background: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-element-pressed);
    color: var(--s-color-status-info);
    cursor: pointer;
    .chevron {
      color: var(--s-color-status-info);
    }
  }

  &-commission--desc .chevron,
  &-return--desc .chevron {
    transform: rotate(180deg);
  }

  &-return {
    margin-top: 4px;
  }

  i {
    color: var(--s-color-base-content-tertiary);
    margin-left: 4px;
  }
}

.empty,
.validators-list-scrollbar {
  height: 380px;
  padding-bottom: 64px;
}

.validators-list-scrollbar.el-scrollbar {
  margin-left: 0;
  margin-right: 0;

  > .el-scrollbar__wrap {
    display: flex;
    flex: 1;
    flex-flow: column nowrap;
    margin-bottom: 0 !important;
    overflow-x: hidden;
  }

  > .el-scrollbar__wrap > .el-scrollbar__view {
    display: flex;
    flex: 1;
    flex-flow: column nowrap;
  }

  > .el-scrollbar__bar.is-vertical {
    right: 2px;
  }
}

.list .validators-list-scrollbar {
  margin: 0 -24px;
}

.validators-list-scrollbar ul {
  list-style-type: none;
  padding: 0 24px 64px;
}

.validator {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 10px 0;
  border-bottom: 1px solid var(--s-color-base-border-secondary);

  &:last-child {
    border-bottom: none;
  }
}

.avatar,
.name {
  height: 100%;
}

.avatar {
  margin-right: 10px;

  .check {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: var(--s-color-theme-accent);

    i {
      color: var(--s-color-base-on-accent);
    }
  }
}

.name-and-address {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  margin-right: 10px;
  font-weight: 700;
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info {
  flex-shrink: 0;
  line-height: 150%;
  text-align: right;

  span {
    display: inline-block;
    margin-right: 8px;
  }

  .info-commission,
  .info-return {
    height: 21px;
    padding: 2px 6px;
    font-weight: 600;
  }

  .info-commission:not(.info-commission--active),
  .info-return:not(.info-return--active) {
    font-size: 14px;
    font-style: normal;
    letter-spacing: -0.32px;
  }

  .info-commission--active,
  .info-return--active {
    background: var(--s-color-utility-surface);
    border-radius: 8px;
    box-shadow: var(--s-shadow-element-pressed);
    color: var(--s-color-status-info);
    font-size: 14px;
  }
}

.select-area {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  width: calc(100% - 20px);
  height: 100%;
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  color: var(--s-color-brand-day);
  font-size: 16px;
}
</style>
