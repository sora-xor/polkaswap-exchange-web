<template>
  <div class="validators">
    <div v-if="!isValidatorModeRecommended" class="search-container">
      <SearchInput
        v-model="search"
        class="validators-search"
        :placeholder="t('soraStaking.validatorsList.search')"
        @clear="clearSearch"
      >
        <template #right>
          <s-button class="filters-button" type="outline" size="mini" @click="openFilters">
            <div class="filters-button-content">
              <span>{{ t('soraStaking.validatorsFilterDialog.title') }}</span>
              <s-icon name="basic-settings-24" size="14px"></s-icon>
            </div>
          </s-button>
        </template>
      </SearchInput>
    </div>

    <div v-if="showSelectionControls && canToggleValidatorSelection" class="selection-controls" role="group">
      <s-button
        class="selection-control"
        type="outline"
        size="mini"
        :disabled="selectAllDisabled"
        @click="selectAllValidators"
      >
        {{ t('soraStaking.validatorsList.selectAll') }}
      </s-button>
      <s-button
        class="selection-control"
        type="outline"
        size="mini"
        :disabled="deselectAllDisabled"
        @click="deselectAllValidators"
      >
        {{ t('soraStaking.validatorsList.deselectAll') }}
      </s-button>
    </div>

    <div class="validators-table" role="table">
      <div class="table-header" role="row">
        <div class="table-header-avatar table-header-item" role="columnheader">
          <s-icon name="various-bone-24" size="14px"></s-icon>
        </div>
        <div class="table-header-name table-header-item" role="columnheader">
          {{ t('soraStaking.validatorsList.name') }}
        </div>
        <div
          v-button
          :class="['table-header-metric', 'table-header-item', commissionHeaderClass]"
          role="columnheader"
          @click="setCommissionSort"
        >
          <span>{{ t('soraStaking.validatorsList.commission') }}</span>
          <s-tooltip border-radius="mini" :content="t('soraStaking.validatorsList.commissionTooltip')">
            <s-icon name="info-16" size="14px"></s-icon>
          </s-tooltip>
          <s-icon class="chevron" name="arrows-chevron-top-rounded-24" size="18"></s-icon>
        </div>
        <div
          v-button
          :class="['table-header-metric', 'table-header-item', returnHeaderClass]"
          role="columnheader"
          @click="setReturnSort"
        >
          <span>{{ t('soraStaking.validatorsList.return') }}</span>
          <s-tooltip border-radius="mini" :content="t('comingSoonText')">
            <s-icon name="info-16" size="14px"></s-icon>
          </s-tooltip>
          <s-icon class="chevron" name="arrows-chevron-top-rounded-24" size="18"></s-icon>
        </div>
        <div
          v-button
          :class="['table-header-metric', 'table-header-item', stakedHeaderClass]"
          role="columnheader"
          @click="setStakedSort"
        >
          <span>{{ t('soraStaking.validatorsList.staked') }}</span>
          <s-tooltip border-radius="mini" :content="t('soraStaking.validatorsList.stakedTooltip')">
            <s-icon name="info-16" size="14px"></s-icon>
          </s-tooltip>
          <s-icon class="chevron" name="arrows-chevron-top-rounded-24" size="18"></s-icon>
        </div>
      </div>

      <div class="list" role="rowgroup">
        <div v-if="!filteredValidators.length" class="empty">
          <span>{{ emptyText }}</span>
        </div>
        <s-scrollbar v-else class="validators-list-scrollbar">
          <ul class="list">
            <li
              v-for="validator in filteredValidators"
              :key="validator.address"
              :class="['validator', { 'validator--selectable': canToggleValidatorSelection }]"
              role="row"
            >
              <div class="validator-cell validator-avatar" role="cell">
                <ValidatorAvatar class="avatar" :validator="validator">
                  <template #icon>
                    <div v-if="isSelected(validator)" class="check">
                      <s-icon name="basic-check-mark-24" size="12px"></s-icon>
                    </div>
                  </template>
                </ValidatorAvatar>
              </div>
              <div class="validator-cell name-and-address" role="cell">
                <div class="name" :id="getValidatorNameId(validator)">
                  {{ formatName(validator) }}
                </div>
                <FormattedAddress :value="validator.address" :symbols="16"></FormattedAddress>
              </div>
              <div class="validator-cell validator-commission" role="cell">
                <span :class="commissionClass">{{ formatCommission(validator.commission) }}%</span>
              </div>
              <div class="validator-cell validator-return" role="cell">
                <span :class="returnClass">{{ formatReturn(validator.apy) }}%</span>
              </div>
              <div class="validator-cell validator-staked" role="cell">
                <span
                  :class="stakedClass"
                  :title="formatStake(validator.stake?.total, stakingAsset?.decimals, stakingAsset?.symbol, 7)"
                >
                  {{ formatStake(validator.stake?.total, stakingAsset?.decimals, stakingAsset?.symbol) }}
                </span>
              </div>
              <button
                v-if="canToggleValidatorSelection"
                v-button
                type="button"
                class="select-area"
                :aria-labelledby="getValidatorNameId(validator)"
                :aria-pressed="isSelected(validator)"
                @click="toggleSelectValidator(validator)"
              ></button>
            </li>
          </ul>
        </s-scrollbar>
      </div>
    </div>
    <div class="blackout"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { FPNumber } from '@sora-substrate/sdk';

import ValidatorAvatar from '@/modules/staking/sora/components/ValidatorAvatar.vue';
import { useSoraStaking } from '@/modules/staking/sora/composables/useSoraStaking';
import { useValidatorsFormatting } from '@/modules/staking/sora/composables/useValidatorsFormatting';
import { emptyValidatorsFilter, recommendedValidatorsFilter, ValidatorsListMode } from '@/modules/staking/sora/consts';

import type { ValidatorsFilter } from '@/modules/staking/sora/types';
import type { ValidatorInfoFull } from '@sora-substrate/sdk/build/staking/types';
import SearchInput from '@/lib/soraneo-wallet/src/components/Input/SearchInput.vue';
import WalletComponentFormattedAddress from '@/lib/soraneo-wallet/src/components/shared/FormattedAddress.vue';

defineOptions({
  inheritAttrs: false,
  components: {
    FormattedAddress: WalletComponentFormattedAddress,
  },
});

enum Sort {
  COMMISSION_ASC = 'commission-asc',
  COMMISSION_DESC = 'commission-desc',
  RETURN_ASC = 'return-asc',
  RETURN_DESC = 'return-desc',
  STAKED_ASC = 'staked-asc',
  STAKED_DESC = 'staked-desc',
}

const props = defineProps<{
  mode: ValidatorsListMode;
  selectedValidators?: ValidatorInfoFull[];
  showSelectionControls?: boolean;
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
  stakingAsset,
} = useSoraStaking();
const { formatName, decodeName, formatCommission, formatReturn, formatStake } = useValidatorsFormatting();

const search = ref('');
const sort = ref<Sort>(Sort.RETURN_DESC);
/**
 * Prevents recommended auto-selection from overwriting validator checkmarks after the user changes them.
 */
const hasUserChangedSelection = ref(false);

const isValidatorModeRecommended = computed(() => props.mode === ValidatorsListMode.RECOMMENDED);
const canToggleValidatorSelection = computed(
  () => props.mode === ValidatorsListMode.RECOMMENDED || props.mode === ValidatorsListMode.SELECT
);
/**
 * Normalizes external selected-validator props so malformed entries cannot break row toggling.
 */
const isValidatorWithAddress = (value: unknown): value is ValidatorInfoFull =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Partial<ValidatorInfoFull>).address === 'string' &&
  Boolean((value as Partial<ValidatorInfoFull>).address);

const selectedValidators = computed(() =>
  Array.isArray(props.selectedValidators) ? props.selectedValidators.filter(isValidatorWithAddress) : []
);

const selectedValidatorAddresses = computed(
  () => new Set(selectedValidators.value.map((validator) => validator.address))
);

/**
 * Removes duplicate validator addresses while preserving the first complete payload returned by upstream data.
 */
const uniqueValidatorsByAddress = (list: ValidatorInfoFull[]): ValidatorInfoFull[] => {
  const seen = new Set<string>();

  return list.filter((validator) => {
    if (seen.has(validator.address)) return false;

    seen.add(validator.address);
    return true;
  });
};

const validValidators = computed(() =>
  uniqueValidatorsByAddress(Array.isArray(validators.value) ? validators.value.filter(isValidatorWithAddress) : [])
);

/**
 * Normalizes nominated-validator store data before filtering so malformed persisted payloads cannot match rows.
 */
const nominatedValidatorAddresses = computed(() => {
  const myValidators = stakingInfo.value?.myValidators;

  return Array.isArray(myValidators) ? myValidators : [];
});

const calcSortClass = (base: string, value: Sort, asc: Sort, desc: Sort) => ({
  [base]: true,
  [`${base}--active`]: value === asc || value === desc,
  [`${base}--asc`]: value === asc,
  [`${base}--desc`]: value === desc,
});

/**
 * Treats malformed indexer percentage strings as zero so bad rows cannot poison table sorting.
 */
const parseSortMetric = (value: string | undefined): number => {
  const normalizedValue = String(value ?? '').trim();

  if (!/^\d+(\.\d+)?$/.test(normalizedValue)) return 0;

  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Keeps malformed max-nomination values from selecting an unsafe number of validators.
 */
const normalizeNominationLimit = (value: number | null, fallback: number): number => {
  if (value === null) return fallback;
  if (!Number.isFinite(value)) return 0;

  return Math.max(0, Math.floor(value));
};

/**
 * Parses indexed staking totals defensively so malformed rows sort as zero instead of breaking the list.
 */
const parseCodecStake = (value: string | undefined): FPNumber => {
  const normalizedValue = (value ?? '0').replace(/[,\s]/g, '');

  if (!/^\d+$/.test(normalizedValue)) return FPNumber.ZERO;

  try {
    const stake = FPNumber.fromCodecValue(normalizedValue, stakingAsset.value?.decimals);
    return stake.isFinity() ? stake : FPNumber.ZERO;
  } catch {
    return FPNumber.ZERO;
  }
};

/**
 * Compares staking exposure totals as codec amounts to avoid precision loss on large token values.
 */
const compareCodecStake = (first: string | undefined, second: string | undefined): number => {
  const firstStake = parseCodecStake(first);
  const secondStake = parseCodecStake(second);

  if (FPNumber.eq(firstStake, secondStake)) return 0;

  return FPNumber.lt(firstStake, secondStake) ? -1 : 1;
};

const sortedValidators = computed(() => {
  const list = [...validValidators.value];

  return list.sort((a, b) => {
    switch (sort.value) {
      case Sort.COMMISSION_ASC:
        return parseSortMetric(a.commission) - parseSortMetric(b.commission);
      case Sort.COMMISSION_DESC:
        return parseSortMetric(b.commission) - parseSortMetric(a.commission);
      case Sort.RETURN_ASC:
        return parseSortMetric(a.apy) - parseSortMetric(b.apy);
      case Sort.RETURN_DESC:
        return parseSortMetric(b.apy) - parseSortMetric(a.apy);
      case Sort.STAKED_ASC:
        return compareCodecStake(a.stake?.total, b.stake?.total);
      case Sort.STAKED_DESC:
        return compareCodecStake(b.stake?.total, a.stake?.total);
      default:
        return 0;
    }
  });
});

const applyFilter = (list: ValidatorInfoFull[], filter: ValidatorsFilter, term = '') =>
  list.filter((validator) => {
    const identityInfo = validator.identity?.info;

    if (filter.hasIdentity && (!identityInfo || !Object.keys(identityInfo).length)) return false;
    if (filter.notSlashed && validator.blocked) return false;
    if (filter.notOversubscribed && validator.isOversubscribed) return false;
    if (filter.twoValidatorsPerIdentity && validator.isOversubscribed) {
      const sameIdentity = list.filter((item) => item.identity?.info?.display === identityInfo?.display);
      if (sameIdentity.length > 2) return false;
    }

    const name = String(decodeName(validator));
    return name.toLowerCase().includes(term.trim().toLowerCase());
  });

const filteredValidators = computed(() => {
  const currentList = sortedValidators.value;
  const baseFilter = validatorsFilter.value ?? emptyValidatorsFilter;

  switch (props.mode) {
    case ValidatorsListMode.RECOMMENDED:
      return applyFilter(currentList, recommendedValidatorsFilter).slice(
        0,
        normalizeNominationLimit(maxNominations.value, currentList.length)
      );
    case ValidatorsListMode.USER:
      return applyFilter(currentList, baseFilter, search.value).filter((validator) =>
        nominatedValidatorAddresses.value.includes(validator.address)
      );
    default:
      return applyFilter(currentList, baseFilter, search.value);
  }
});

const selectAllDisabled = computed(
  () =>
    !filteredValidators.value.length ||
    filteredValidators.value.every((validator) => selectedValidatorAddresses.value.has(validator.address))
);

const deselectAllDisabled = computed(() => selectedValidators.value.length === 0);

const emptyText = computed(() => {
  if (props.mode === ValidatorsListMode.USER && nominatedValidatorAddresses.value.length === 0) {
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
const stakedHeaderClass = computed(() =>
  calcSortClass('table-header-staked', sort.value, Sort.STAKED_ASC, Sort.STAKED_DESC)
);
const commissionClass = computed(() =>
  calcSortClass('info-commission', sort.value, Sort.COMMISSION_ASC, Sort.COMMISSION_DESC)
);
const returnClass = computed(() => calcSortClass('info-return', sort.value, Sort.RETURN_ASC, Sort.RETURN_DESC));
const stakedClass = computed(() => calcSortClass('info-staked', sort.value, Sort.STAKED_ASC, Sort.STAKED_DESC));

/**
 * Returns a stable DOM id used to make the full-row selection button accessible by validator name.
 */
const getValidatorNameId = (validator: ValidatorInfoFull): string => `validator-name-${validator.address}`;

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

/**
 * Toggles stake sorting with the highest exposure first so the most-backed validators surface immediately.
 */
const setStakedSort = () => {
  sort.value =
    sort.value === Sort.STAKED_DESC
      ? Sort.STAKED_ASC
      : sort.value === Sort.STAKED_ASC
        ? Sort.STAKED_DESC
        : Sort.STAKED_DESC;
};

const toggleSelectValidator = (validator: ValidatorInfoFull) => {
  if (!canToggleValidatorSelection.value) return;

  hasUserChangedSelection.value = true;
  const selected = [...selectedValidators.value];
  const index = selected.findIndex((item) => item.address === validator.address);

  if (index > -1) {
    emit(
      'update:selected',
      selected.filter((item) => item.address !== validator.address)
    );
  } else {
    selected.push(validator);
    emit('update:selected', selected);
  }
};

const isSelected = (validator: ValidatorInfoFull) =>
  selectedValidators.value.some((item) => item.address === validator.address);

/**
 * Adds the currently visible validator rows to the selected set without duplicating addresses.
 */
const selectAllValidators = () => {
  if (!canToggleValidatorSelection.value || !filteredValidators.value.length) return;

  hasUserChangedSelection.value = true;
  const selectedAddresses = new Set<string>();
  const nextSelection = [...selectedValidators.value, ...filteredValidators.value].reduce<ValidatorInfoFull[]>(
    (buffer, validator) => {
      if (selectedAddresses.has(validator.address)) return buffer;

      selectedAddresses.add(validator.address);
      buffer.push(validator);
      return buffer;
    },
    []
  );

  emit('update:selected', nextSelection);
};

/**
 * Clears all selected validators for the current editable selection flow.
 */
const deselectAllValidators = () => {
  if (!canToggleValidatorSelection.value || !selectedValidators.value.length) return;

  hasUserChangedSelection.value = true;
  emit('update:selected', []);
};

/**
 * Resets the search term through the shared search input clear action.
 */
const clearSearch = () => {
  search.value = '';
};

const openFilters = () => {
  setShowValidatorsFilterDialog(true);
};

onMounted(() => {
  setValidatorsFilter(emptyValidatorsFilter);
});

watch(
  () => props.mode,
  () => {
    hasUserChangedSelection.value = false;
  }
);

watch(
  () => [filteredValidators.value, props.mode],
  () => {
    if (isValidatorModeRecommended.value && !hasUserChangedSelection.value) {
      emit('update:selected', filteredValidators.value);
    }
  },
  { immediate: true }
);

defineExpose({
  toggleSelectValidator,
  setCommissionSort,
  setReturnSort,
  setStakedSort,
  openFilters,
  getValidatorNameId,
  selectAllValidators,
  deselectAllValidators,
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
  --validators-table-columns: 44px minmax(176px, 1fr) minmax(120px, 0.52fr) minmax(132px, 0.56fr) minmax(150px, 0.64fr);
  --validators-table-gap: 12px;
  --validators-table-min-width: 694px;

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

.selection-controls {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.selection-control {
  min-width: 112px;
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

.validators-table {
  overflow-x: auto;
  overflow-y: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: var(--validators-table-columns);
  column-gap: var(--validators-table-gap);
  align-items: center;
  min-width: var(--validators-table-min-width);
  height: 52px;
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
    justify-content: center;

    i {
      color: var(--s-color-base-content-tertiary);
    }
  }
  &-name {
    min-width: 0;
  }
  &-commission,
  &-return,
  &-staked {
    justify-content: flex-end;
    align-items: center;
    min-width: 0;
    height: 28px;
    padding: 4px 6px;
    border-radius: 8px;
    white-space: nowrap;
  }
  &-commission:not(&-commission--active),
  &-return:not(&-return--active),
  &-staked:not(&-staked--active) {
    font-style: normal;
    padding-right: 6px;
    cursor: pointer;
  }
  &-commission--active,
  &-return--active,
  &-staked--active {
    background: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-element-pressed);
    color: var(--s-color-status-info);
    cursor: pointer;
    .chevron {
      color: var(--s-color-status-info);
    }
  }

  &-commission--desc .chevron,
  &-return--desc .chevron,
  &-staked--desc .chevron {
    transform: rotate(180deg);
  }

  &-staked {
    color: var(--s-color-base-content-tertiary);
  }

  i {
    color: var(--s-color-base-content-tertiary);
    margin-left: 4px;
  }
}

.empty,
.validators-list-scrollbar {
  height: var(--validators-list-height, 380px);
  padding-bottom: 64px;
}

.validators-list-scrollbar.el-scrollbar {
  min-width: var(--validators-table-min-width);

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

.validators-list-scrollbar ul {
  list-style-type: none;
  padding: 0 0 64px;
}

.validator {
  position: relative;
  display: grid;
  grid-template-columns: var(--validators-table-columns);
  column-gap: var(--validators-table-gap);
  align-items: center;
  min-width: var(--validators-table-min-width);
  min-height: 60px;
  padding: 10px 0;
  border-bottom: 1px solid var(--s-color-base-border-secondary);

  &:last-child {
    border-bottom: none;
  }

  &--selectable {
    cursor: pointer;

    &:hover {
      background: var(--s-color-base-background-hover);
    }
  }
}

.validator-cell {
  min-width: 0;
}

.validator-avatar {
  display: flex;
  justify-content: center;
}

.avatar {
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
  flex-direction: column;
  font-weight: 700;
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.validator-commission,
.validator-return,
.validator-staked {
  line-height: 1.5;
  text-align: right;

  span {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: bottom;
    white-space: nowrap;
  }

  .info-commission,
  .info-return,
  .info-staked {
    height: 24px;
    padding: 2px 6px;
    font-weight: 600;
  }

  .info-commission:not(.info-commission--active),
  .info-return:not(.info-return--active),
  .info-staked:not(.info-staked--active) {
    font-size: 14px;
    font-style: normal;
    letter-spacing: 0;
  }

  .info-commission--active,
  .info-return--active,
  .info-staked--active {
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
  padding: 0;
  border: 0;
  appearance: none;
  background: transparent;

  &:focus-visible {
    outline: 2px solid var(--s-color-theme-accent);
    outline-offset: -2px;
  }
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
