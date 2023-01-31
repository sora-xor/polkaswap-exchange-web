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

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class SettingsHeader extends Mixins(TranslationMixin) {
  readonly tooltipScopedSlot = 'tooltip-content';

  @Prop({ type: String, default: '' }) title!: string;
  @Prop({ type: String, default: '' }) tooltip!: string;

  get hasTooltipContent(): boolean {
    return !!this.tooltip || !!this.$scopedSlots[this.tooltipScopedSlot];
  }
}
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
