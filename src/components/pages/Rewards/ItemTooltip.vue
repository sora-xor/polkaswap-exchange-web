<template>
  <s-popover-panel popper-class="reward-item-tooltip" placement="right" trigger="hover">
    <div class="reward-item-tooltip-content">
      <div>{{ t('rewards.totalVested') }}:</div>
      <formatted-amount
        class="reward-item-tooltip-value"
        value-can-be-hidden
        symbol-as-decimal
        :value="value"
        :font-size-rate="FontSizeRate.MEDIUM"
        :asset-symbol="asset.symbol"
      ></formatted-amount>
    </div>
    <template #reference>
      <s-icon name="info-16" size="14px" class="reward-item-tooltip-value-icon" tabindex="-1"></s-icon>
    </template>
  </s-popover-panel>
</template>

<script lang="ts" setup>
import { components } from '@/shims/wallet-components';
import { toRefs } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { FontSizeRate } from '@/shims/wallet-consts';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

defineOptions({
  name: 'RewardsItemTooltip',
  components: {
    FormattedAmount: components.FormattedAmount,
  },
});

const props = defineProps<{
  value: string;
  asset: Asset;
}>();

const { t } = useTranslation();

const { value, asset } = toRefs(props);
</script>

<style lang="scss">
$tooltip-placements: 'left', 'right';

.reward-item-tooltip {
  &.el-popover.el-popper {
    border-color: var(--s-color-base-border-secondary);
    border-radius: var(--s-border-radius-mini);
    box-shadow: var(--s-shadow-dialog);
    background-color: var(--s-color-status-success);
    padding: $inner-spacing-mini $inner-spacing-small;

    @each $placement in $tooltip-placements {
      &[x-placement^='#{$placement}'] .popper__arrow {
        border-#{$placement}-color: var(--s-color-base-border-secondary);
        &:after {
          border-#{$placement}-color: var(--s-color-status-success);
        }
      }
    }
  }

  &-content {
    font-size: var(--s-font-size-small);
    line-height: var(--s-line-height-small);
    text-transform: uppercase;
  }

  &-value {
    font-size: var(--s-font-size-medium);
    font-weight: 600;
    margin-right: auto;

    &-icon {
      margin-left: $inner-spacing-tiny;
      color: var(--s-color-base-content-tertiary);
    }
  }
}
</style>
