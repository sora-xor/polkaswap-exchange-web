<template>
  <div class="settings-header">
    {{ title }}
    <s-tooltip
      v-if="hasTooltipContent"
      :content="tooltip"
      popper-class="info-tooltip info-tooltip--settings-header"
      placement="right-start"
    >
      <slot slot="content" :name="tooltipScopedSlot"/>
      <s-icon class="settings-header-hint" name="info-16" size="12px" />
    </s-tooltip>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'

import TranslationMixin from '@/components/mixins/TranslationMixin'

@Component
export default class SettingsHeader extends Mixins(TranslationMixin) {
  private tooltipScopedSlot = 'tooltip-content'

  @Prop({ type: String, default: '' }) title!: string
  @Prop({ type: String, default: '' }) tooltip!: string

  get hasTooltipContent (): boolean {
    return !!this.tooltip || !!this.$scopedSlots[this.tooltipScopedSlot]
  }
}
</script>

<style lang="scss">
.info-tooltip--settings-header {
  margin-top: -$inner-spacing-mini * 1.25;
  .popper__arrow {
    margin-top: $inner-spacing-mini * 0.5;
  }
}
</style>

<style lang="scss" scoped>
.settings-header {
  padding-bottom: $inner-spacing-mini;
  padding-left: $inner-spacing-mini / 2;
  color: var(--s-color-base-content-secondary);
  font-size: var(--s-font-size-small);
  line-height: var(--s-line-height-small);
  letter-spacing: var(--s-letter-spacing-small);
  font-weight: 800;

  .el-tooltip {
    vertical-align: middle;
  }

  &-hint {
    margin-left: $inner-spacing-mini / 2;
    cursor: pointer;
  }
}
</style>
