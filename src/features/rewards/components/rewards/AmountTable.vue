<template>
  <div class="amount-table">
    <div class="amount-table-title">{{ title }}</div>
    <el-checkbox-group v-if="showTable" v-model="innerModel">
      <div v-for="(formatted, index) in formattedItems" :key="index" class="amount-table-item">
        <s-divider v-if="index !== 0" :class="['amount-table-divider', theme]"></s-divider>
        <div v-if="formatted.subtitle" class="amount-table-item__subtitle">{{ formatted.subtitle }}</div>
        <el-checkbox
          :label="formatted.type[1]"
          :disabled="isDisabledRewardItem(formatted)"
          size="big"
          class="amount-table-item-group"
        >
          <div class="amount-table-item-content">
            <div class="amount-table-item-content__header">
              <div v-for="(limitItem, index) in formatted.limit" class="amount-table-item__amount" :key="index">
                <formatted-amount-with-fiat-value
                  value-class="amount-table-value"
                  with-left-shift
                  value-can-be-hidden
                  :value="
                    isCodecString
                      ? getFPNumberFromCodec(limitItem.amount, limitItem.asset.decimals).toLocaleString()
                      : limitItem.amount
                  "
                  :font-size-rate="FontSizeRate.MEDIUM"
                  :asset-symbol="limitItem.asset.symbol"
                  :fiat-value="
                    isCodecString
                      ? getFiatAmountByCodecString(limitItem.amount, limitItem.asset)
                      : getFiatAmountByString(limitItem.amount, limitItem.asset)
                  "
                  :fiat-font-size-rate="FontSizeRate.MEDIUM"
                >
                  <template v-if="formatted.total && index === 0">
                    <rewards-item-tooltip
                      :value="formatted.total.amount"
                      :asset="formatted.total.asset"
                    ></rewards-item-tooltip>
                  </template>
                  <template v-else-if="limitItem.total">
                    <rewards-item-tooltip
                      :value="limitItem.total.amount"
                      :asset="limitItem.total.asset"
                    ></rewards-item-tooltip>
                  </template>
                </formatted-amount-with-fiat-value>
              </div>
            </div>
            <div v-if="formatted.rewards && formatted.rewards.length !== 0" class="amount-table-item-content__body">
              <div v-for="(rewardItem, index) in formatted.rewards" :key="index" class="amount-table-subitem">
                <s-divider v-if="!simpleGroup || index === 0" :class="['amount-table-divider', theme]"></s-divider>
                <div class="amount-table-subitem__title">
                  <template v-if="simpleGroup">—</template>
                  <template v-else-if="formatted.total">
                    {{ t('rewards.totalVested') }} {{ t('rewards.forText') }}
                  </template>
                  {{ rewardItem.title }}
                </div>
                <template v-if="!simpleGroup && rewardItem.limit">
                  <div v-for="(limitItem, index) in rewardItem.limit" :key="index" class="amount-table-subitem__row">
                    <formatted-amount-with-fiat-value
                      value-class="amount-table-value"
                      with-left-shift
                      value-can-be-hidden
                      :value="formatCodecNumber(limitItem.amount)"
                      :font-size-rate="FontSizeRate.MEDIUM"
                      :asset-symbol="limitItem.asset.symbol"
                      :fiat-value="getFiatAmountByCodecString(limitItem.amount, limitItem.asset)"
                      :fiat-font-size-rate="FontSizeRate.MEDIUM"
                    >
                      <rewards-item-tooltip
                        v-if="limitItem.total"
                        :value="limitItem.total"
                        :asset="limitItem.asset"
                      ></rewards-item-tooltip>
                    </formatted-amount-with-fiat-value>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </el-checkbox>
      </div>
    </el-checkbox-group>
    <slot></slot>
  </div>
</template>

<script lang="ts" setup>
import { computed, toRefs } from 'vue';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useNumberFormatter } from '@/composables/useNumberFormatter';
import { useTranslation } from '@/composables/useTranslation';
import { Theme } from '@/consts/theme';
import { FontSizeRate } from '@/lib/soraneo-wallet/src/consts';
import type { RewardInfoGroup, RewardsAmountHeaderItem } from '@/types/rewards';
import { asZeroValue } from '@/utils';

import RewardsItemTooltip from './ItemTooltip.vue';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import type { RewardInfo, RewardTypedEvent } from '@sora-substrate/sdk/build/rewards/types';
import WalletComponentFormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';
import WalletComponentFormattedAmountWithFiatValue from '@/lib/soraneo-wallet/src/components/FormattedAmountWithFiatValue.vue';

interface RewardsAmountTableItem {
  type?: RewardTypedEvent;
  title?: string;
  subtitle?: string;
  total?: string | RewardsAmountHeaderItem;
  limit?: Array<RewardsAmountHeaderItem>;
  rewards?: Array<RewardsAmountTableItem>;
}

const toLimit = (asset: Asset, amount: string, total?: string): { asset: Asset; amount: string; total?: string } => ({
  amount,
  asset,
  total,
});

defineOptions({
  name: 'RewardsAmountTable',
  components: {
    FormattedAmount: WalletComponentFormattedAmount,
    FormattedAmountWithFiatValue: WalletComponentFormattedAmountWithFiatValue,
    RewardsItemTooltip,
  },
});

const props = withDefaults(
  defineProps<{
    items?: Array<RewardInfoGroup | RewardInfo>;
    title?: string;
    showTable?: boolean;
    simpleGroup?: boolean;
    modelValue?: boolean | string[];
    isCodecString?: boolean;
    theme?: Theme;
  }>(),
  {
    items: () => [],
    title: '',
    showTable: true,
    simpleGroup: false,
    modelValue: undefined,
    isCodecString: false,
    theme: Theme.LIGHT,
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean | string[]): void;
}>();

const { items, showTable, simpleGroup, isCodecString, theme } = toRefs(props);

const innerModel = computed({
  get: () => props.modelValue ?? false,
  set: (value: boolean | string[]) => {
    emit('update:modelValue', value);
  },
});

const { t, te } = useTranslation();
const { formatCodecNumber, getFPNumberFromCodec, getFiatAmountByCodecString, getFiatAmountByString, getFPNumber } =
  useFormattedAmount();
const { formatStringValue } = useNumberFormatter();

const formattedItems = computed<RewardsAmountTableItem[]>(() => items.value.map((item) => formatItem(item)));

function formatItem(item: RewardInfoGroup | RewardInfo): RewardsAmountTableItem {
  const isGroup = 'limit' in item && Array.isArray(item.limit);
  const [, rewardEvent] = item.type;
  const key = `rewards.events.${rewardEvent}`;
  const title = te(key) ? t(key) : '';
  const subtitle = 'title' in item ? (item.title ?? '') : '';
  const total = 'total' in item ? item.total : undefined;
  const rewards = isGroup ? item.rewards?.map(formatItem) : [];
  const limit =
    'limit' in item && Array.isArray((item as RewardInfoGroup).limit)
      ? (item as RewardInfoGroup).limit
      : [
          toLimit(
            (item as RewardInfo).asset,
            (item as RewardInfo).amount,
            (item as RewardInfo).total as string | undefined
          ),
        ];

  return {
    type: item.type,
    title,
    subtitle,
    limit,
    total,
    rewards,
  };
}

function isDisabledRewardItem(item: RewardsAmountTableItem): boolean {
  return asZeroValue(item.limit?.[0]?.amount ?? 0);
}

defineExpose({
  formattedItems,
  innerModel,
  isDisabledRewardItem,
});
</script>

<style lang="scss">
.amount-table {
  & .el-checkbox {
    color: inherit;

    & > * {
      display: flex;
    }

    &__label {
      white-space: normal;
      display: flex;
      flex: 1;
      flex-flow: column nowrap;
      color: inherit !important;
      padding-left: $inner-spacing-mini;
    }

    &__input {
      & .el-checkbox__inner {
        border-radius: 6px !important;

        &:after {
          content: '\ea1c';
          color: white;
          font-family: 'soramitsu-icons';
          border: none;
          transform: rotate(0) scaleY(0);
          left: 2px;
          top: 2px;
        }
      }
      &.is-checked {
        & .el-checkbox__inner {
          &:after {
            transform: rotate(0) scaleY(1);
          }
        }
      }
      &:not(.is-checked) {
        & .el-checkbox__inner {
          border: 2px solid var(--s-color-status-error);
        }
      }
      &.is-disabled {
        & .el-checkbox__inner {
          background-color: var(--s-color-base-on-disabled);
        }
      }
    }
  }

  .formatted-amount__container {
    width: 100%;
    text-align: left;
  }

  &-value {
    font-size: var(--s-font-size-medium);
    font-weight: 600;
    margin-right: auto;
  }

  &-item {
    &-group.el-checkbox.s-big {
      padding: 0;
      height: initial;
    }
    &__amount .formatted-amount--fiat-value {
      text-align: right;
    }
  }

  &-subitem {
    &.complex {
      .el-checkbox__input {
        margin-top: $inner-spacing-small;
      }
    }
  }

  &-divider.s-divider-secondary.dark {
    background-color: var(--s-color-base-content-secondary);
  }
}
</style>

<style lang="scss" scoped>
.amount-table {
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--s-border-radius-mini);
  padding: $inner-spacing-medium;

  &.rewards-table {
    .formatted-amount {
      flex-wrap: wrap;
    }
    .formatted-amount--fiat-value {
      font-weight: 400;
    }
  }

  &-title {
    font-size: var(--s-font-size-mini);
    line-height: var(--s-line-height-medium);
    font-weight: 400;
    text-transform: uppercase;
    margin-bottom: $inner-spacing-mini;
  }

  &-item {
    display: flex;
    flex-flow: column nowrap;
    gap: $inner-spacing-mini;

    & + & {
      margin-top: $inner-spacing-mini;
    }

    &-group {
      display: flex;
      flex-flow: nowrap;
    }

    &-content {
      display: flex;
      flex-flow: column nowrap;
      flex: 1;

      &__header {
        display: flex;
        flex: 1;
        flex-flow: column nowrap;
      }
    }

    &__subtitle {
      font-size: var(--s-font-size-mini);
      line-height: var(--s-line-height-reset);
      font-weight: 300;
      text-transform: uppercase;
    }

    &__amount {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      flex-wrap: wrap;
      line-height: 20px;
    }
  }

  &-subitem {
    font-weight: 300;
    text-transform: uppercase;

    &.complex {
      display: flex;
      flex-flow: row nowrap;
    }

    &__title {
      line-height: var(--s-line-height-reset);
      margin-top: $inner-spacing-mini;
    }

    &__row {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
    }
  }

  &-divider {
    opacity: 0.5;
    margin-top: 0;
    margin-bottom: 0;
  }
}
</style>
