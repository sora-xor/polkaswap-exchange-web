<template>
  <div :class="['amount-table', source ? `amount-table--${source}` : '']">
    <div class="amount-table-title">{{ title }}</div>
    <div v-if="showTable" class="amount-table-items">
      <div v-for="(formatted, index) in formattedItems" :key="index" class="amount-table-item">
        <s-divider v-if="index !== 0" :class="['amount-table-divider', theme]"></s-divider>
        <div v-if="formatted.subtitle" class="amount-table-item__subtitle">{{ formatted.subtitle }}</div>
        <label
          :class="[
            'amount-table-item-group',
            'rw-check',
            { 'is-checked': isChecked(formatted), 'is-disabled': isDisabledRewardItem(formatted) },
          ]"
        >
          <input
            class="rw-check__input"
            type="checkbox"
            :checked="isChecked(formatted)"
            :disabled="isDisabledRewardItem(formatted)"
            @change="handleToggle(formatted, $event)"
          />
          <span class="rw-check__box" aria-hidden="true">
            <svg viewBox="0 0 16 16" focusable="false"><path d="M3.5 8.5l3 3 6-7" /></svg>
          </span>
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
                  <span v-if="formatted.total && index === 0" class="amount-table-info" @click.prevent>
                    <rewards-item-tooltip
                      :value="formatted.total.amount"
                      :asset="formatted.total.asset"
                    ></rewards-item-tooltip>
                  </span>
                  <span v-else-if="limitItem.total" class="amount-table-info" @click.prevent>
                    <rewards-item-tooltip
                      :value="limitItem.total.amount"
                      :asset="limitItem.total.asset"
                    ></rewards-item-tooltip>
                  </span>
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
                      <span v-if="limitItem.total" class="amount-table-info" @click.prevent>
                        <rewards-item-tooltip :value="limitItem.total" :asset="limitItem.asset"></rewards-item-tooltip>
                      </span>
                    </formatted-amount-with-fiat-value>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </label>
      </div>
    </div>
    <slot></slot>
  </div>
</template>

<script lang="ts" setup>
import { computed, toRefs } from 'vue';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useNumberFormatter } from '@/composables/useNumberFormatter';
import { useTranslation } from '@/composables/useTranslation';
import { Theme } from '@/consts/theme';
import type { RewardSourceId } from '@/features/rewards/utils/analytics';
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
    /** Reward source of this group; it gets the accent color its bar and legend use in the analytics cards. */
    source?: RewardSourceId;
  }>(),
  {
    items: () => [],
    title: '',
    showTable: true,
    simpleGroup: false,
    modelValue: undefined,
    isCodecString: false,
    theme: Theme.LIGHT,
    source: undefined,
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

/** A group is ticked when its tag is in the list (several groups) or when the single flag is on. */
function isChecked(item: RewardsAmountTableItem): boolean {
  if (isDisabledRewardItem(item)) return false;

  const model = innerModel.value;

  return Array.isArray(model) ? model.includes(item.type?.[1] ?? '') : Boolean(model);
}

/** Ticks or unticks a group: adds or removes its tag from the list, or sets the single flag. */
function handleToggle(item: RewardsAmountTableItem, event: Event): void {
  const checked = (event.target as HTMLInputElement).checked;
  const model = innerModel.value;

  if (!Array.isArray(model)) {
    innerModel.value = checked;
    return;
  }

  const tag = item.type?.[1] ?? '';

  innerModel.value = checked ? [...new Set([...model, tag])] : model.filter((value) => value !== tag);
}

defineExpose({
  formattedItems,
  innerModel,
  isDisabledRewardItem,
  isChecked,
  handleToggle,
});
</script>

<style lang="scss">
.amount-table {
  // A native checkbox, drawn as a rounded box in the source's color. The input stays in the DOM for keyboard and
  // screen reader use; the box only paints its state.
  .rw-check {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: $inner-spacing-small;
    width: 100%;
    cursor: pointer;
  }

  .rw-check.is-disabled {
    cursor: default;
    opacity: 0.55;
  }

  .rw-check__input {
    position: absolute;
    width: 22px;
    height: 22px;
    margin: 0;
    opacity: 0;
    cursor: inherit;
  }

  .rw-check__box {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    margin-top: 1px;
    border: 2px solid color-mix(in srgb, var(--rw-ink, currentColor) 38%, transparent);
    border-radius: 7px;
    color: #fff;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease,
      transform 0.2s ease;

    svg {
      width: 14px;
      height: 14px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    path {
      stroke-dasharray: 20;
      stroke-dashoffset: 20;
      transition: stroke-dashoffset 0.28s ease 0.05s;
    }
  }

  .rw-check:not(.is-disabled):hover .rw-check__box {
    border-color: var(--rw-source-color, currentColor);
  }

  .rw-check__input:focus-visible + .rw-check__box {
    outline: 2px solid var(--s-color-focus-ring, #ab0555);
    outline-offset: 2px;
  }

  .rw-check.is-checked .rw-check__box {
    border-color: var(--rw-source-color, var(--s-color-theme-accent));
    background: var(--rw-source-color, var(--s-color-theme-accent));
  }

  .rw-check.is-checked .rw-check__box path {
    stroke-dashoffset: 0;
  }

  .rw-check:not(.is-disabled):active .rw-check__box {
    transform: scale(0.92);
  }

  .amount-table-info {
    display: inline-flex;
    cursor: default;
  }

  .formatted-amount__container {
    width: 100%;
    text-align: left;
  }

  &-value {
    font-size: var(--s-font-size-medium);
    font-weight: 600;
    margin-inline-end: auto;
  }

  &-item {
    &__amount .formatted-amount--fiat-value {
      text-align: right;
    }
  }

  &-divider.s-divider-secondary.dark {
    background-color: var(--s-color-base-content-secondary);
  }

  // The list sits on a theme surface, not on the old gradient, so fiat values wear the muted text color.
  .formatted-amount--fiat-value {
    color: var(--rw-muted, var(--s-color-base-content-secondary));
  }
}
</style>

<style lang="scss" scoped>
.amount-table {
  --rw-source-color: transparent;

  position: relative;
  min-width: 0;
  padding: 16px 18px 16px 24px;
  border: 1px solid var(--rw-line, var(--s-color-base-border-secondary));
  border-radius: 20px;
  background: color-mix(in srgb, var(--rw-ink, var(--s-color-base-content-primary)) 4%, transparent);
  color: var(--rw-ink, var(--s-color-base-content-primary));
  transition: border-color 0.25s ease;

  // A short bar in the source's chart color, the same color as its swatch in the analytics cards.
  &::before {
    content: '';
    position: absolute;
    inset-block: 16px;
    inset-inline-start: 0;
    width: 4px;
    border-radius: 0 4px 4px 0;
    background: var(--rw-source-color);

    [dir='rtl'] & {
      border-radius: 4px 0 0 4px;
    }
  }

  &--liquidity {
    --rw-source-color: var(--rw-src-liquidity, #d8267a);
  }

  &--strategic {
    --rw-source-color: var(--rw-src-strategic, #5b6ee1);
  }

  &--crowdloan {
    --rw-source-color: var(--rw-src-crowdloan, #d9741a);
  }

  &--external {
    --rw-source-color: var(--rw-src-external, #0e9680);
  }

  &:hover {
    border-color: color-mix(in srgb, var(--rw-source-color) 45%, var(--rw-line, var(--s-color-base-border-secondary)));
  }

  &.rewards-table {
    .formatted-amount {
      flex-wrap: wrap;
    }
    .formatted-amount--fiat-value {
      font-weight: 400;
    }
  }

  &-title {
    margin-bottom: $inner-spacing-mini;
    color: var(--rw-muted, var(--s-color-base-content-secondary));
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    line-height: 1.4;
    text-transform: uppercase;
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
      min-width: 0;

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

@media (prefers-reduced-motion: reduce) {
  .amount-table {
    transition: none;
  }

  .amount-table .rw-check__box,
  .amount-table .rw-check__box path {
    transition: none;
  }
}
</style>
