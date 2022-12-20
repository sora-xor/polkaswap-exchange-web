<template>
  <div class="amount-table">
    <div class="amount-table-item">
      <div class="amount-table-item__title">{{ formatted.title }}</div>
      <template v-if="showTable">
        <div v-if="formatted.subtitle" class="amount-table-item__subtitle">{{ formatted.subtitle }}</div>
        <el-checkbox-group v-model="innerModel">
          <component :is="tableGroupComponent" class="amount-table-item-group" :disabled="disabled" size="big">
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
                    <reward-item-tooltip
                      v-if="formatted.total && index === 0"
                      :value="formatted.total.amount"
                      :asset="formatted.total.asset"
                    />
                  </formatted-amount-with-fiat-value>
                </div>
              </div>
              <div v-if="formatted.rewards && formatted.rewards.length !== 0" class="amount-table-item-content__body">
                <component
                  :is="tableItemComponent"
                  v-for="(rewardItem, index) in formatted.rewards"
                  :key="rewardItem.type"
                  :label="rewardItem.type"
                  :disabled="isDisabledRewardItem(rewardItem)"
                  :class="['amount-table-subitem', { complex: complexGroup }]"
                >
                  <s-divider v-if="!simpleGroup || index === 0" :class="['amount-table-divider', theme]" />
                  <div class="amount-table-subitem__title">
                    <template v-if="simpleGroup">—</template>
                    <template v-else-if="formatted.total">
                      {{ t('rewards.totalVested') }} {{ t('rewards.forText') }}
                    </template>
                    <template v-if="!complexGroup">
                      {{ rewardItem.title }}
                    </template>
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
                        <reward-item-tooltip v-if="limitItem.total" :value="limitItem.total" :asset="limitItem.asset" />
                      </formatted-amount-with-fiat-value>
                    </div>
                  </template>
                </component>
              </div>
            </div>
          </component>
        </el-checkbox-group>
      </template>
    </div>
    <slot />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Mixins, ModelSync } from 'vue-property-decorator';
import { components, mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';
import type { Asset } from '@sora-substrate/util/build/assets/types';
import type ElCheckbox from 'element-ui/lib/checkbox';
import type { RewardInfo } from '@sora-substrate/util/build/rewards/types';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { RewardsAmountTableItem, RewardInfoGroup } from '@/types/rewards';
import { asZeroValue } from '@/utils';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
    RewardItemTooltip: lazyComponent(Components.RewardItemTooltip),
  },
})
export default class AmountTable extends Mixins(mixins.FormattedAmountMixin, TranslationMixin) {
  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;

  @Prop({ default: () => {}, type: Object }) item!: RewardInfoGroup | RewardInfo;
  @Prop({ default: true, type: Boolean }) showTable!: boolean;
  @Prop({ default: false, type: Boolean }) simpleGroup!: boolean;
  @Prop({ default: false, type: Boolean }) complexGroup!: boolean;
  @Prop({ default: false, type: [Boolean, Array] }) value!: boolean | string[];
  @Prop({ default: false, type: Boolean }) isCodecString!: boolean;
  @Prop({ default: false, type: Boolean }) disabled!: boolean;
  @Prop({ default: Theme.LIGHT, type: String }) theme!: Theme;

  @ModelSync('value', 'input', { type: [Boolean, Array] })
  readonly innerModel!: boolean | string[];

  get formatted(): RewardsAmountTableItem {
    return this.formatItem(this.item);
  }

  get tableGroupComponent(): ElCheckbox | HTMLDivElement {
    return this.complexGroup ? 'div' : 'el-checkbox';
  }

  get tableItemComponent(): ElCheckbox | HTMLDivElement {
    return this.complexGroup ? 'el-checkbox' : 'div';
  }

  formatItem(item: RewardInfoGroup | RewardInfo): RewardsAmountTableItem {
    const toLimit = (asset: Asset, amount: string, total: string): { asset: Asset; amount: string; total: string } => ({
      amount,
      asset,
      total,
    });

    const key = `rewards.events.${item.type}`;
    const title = this.te(key) ? this.t(key) : item.type;
    const subtitle = 'title' in item ? item.title : '';
    const total = 'total' in item ? item.total : undefined;
    const rewards = 'rewards' in item && Array.isArray(item.rewards) ? item.rewards.map(this.formatItem) : [];
    const limit =
      'rewards' in item && Array.isArray(item.rewards)
        ? (item as RewardInfoGroup).limit
        : [
            toLimit(
              (item as RewardInfo).asset,
              (item as RewardInfo).amount,
              (item as any).total // TODO: remove any
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

  isDisabledRewardItem(item: RewardsAmountTableItem): boolean {
    return asZeroValue(item.limit?.[0]?.amount);
  }
}
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

  &-item {
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

    &__title {
      font-size: var(--s-font-size-mini);
      line-height: var(--s-line-height-medium);
      font-weight: 400;
      text-transform: uppercase;
      margin-bottom: $inner-spacing-mini;
    }

    &__subtitle {
      font-size: var(--s-font-size-small);
      line-height: var(--s-line-height-reset);
      font-weight: 300;
      text-transform: uppercase;
      margin-bottom: $inner-spacing-tiny;
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
    margin: $inner-spacing-mini 0;
    font-weight: 300;
    text-transform: uppercase;

    &.complex {
      display: flex;
      flex-flow: row nowrap;
    }

    &__title {
      line-height: var(--s-line-height-reset);
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
    margin-bottom: $inner-spacing-mini;
  }
}
</style>
