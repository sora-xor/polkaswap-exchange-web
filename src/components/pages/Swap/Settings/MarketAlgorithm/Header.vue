<template>
  <div class="settings-header">
    {{ title }}
    <s-tooltip
      v-if="hasTooltipContent"
      :content="tooltip"
      popper-class="info-tooltip info-tooltip--settings-header"
      placement="right-start"
      border-radius="mini"
      tabindex="-1"
    >
      <slot slot="content" :name="tooltipScopedSlot" />
      <s-icon class="settings-header-hint" name="info-16" size="14px" />
    </s-tooltip>
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs, useSlots } from 'vue';

const tooltipScopedSlot = 'tooltip-content';

defineOptions({ name: 'MarketAlgorithmHeader' });

const props = withDefaults(
  defineProps<{
    title?: string;
    tooltip?: string;
  }>(),
  {
    title: '',
    tooltip: '',
  }
);

const slots = useSlots();
const { title, tooltip } = toRefs(props);

const hasTooltipContent = computed(() => !!tooltip.value || !!slots[tooltipScopedSlot]);
</script>

<style lang="scss">
.info-tooltip--settings-header {
  margin-top: -$basic-spacing-small;
  .popper__arrow {
    margin-top: $basic-spacing-mini;
  }
}
</style>

<style lang="scss" scoped>
.settings-header {
  display: flex;
  align-items: center;
  margin-bottom: $inner-spacing-mini;
  padding-left: $inner-spacing-medium;
  color: var(--s-color-base-content-secondary);
  font-size: var(--s-font-size-small);
  line-height: var(--s-line-height-small);
  font-weight: 800;

  .el-tooltip {
    vertical-align: middle;
  }

  &-hint {
    margin-left: $inner-spacing-mini;
    cursor: pointer;
  }
}
</style>
