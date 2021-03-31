<template>
  <div class="settings-header">
    {{ title }}
    <branded-tooltip
      v-if="hasTooltipContent"
      :content="tooltip"
      popper-class="info-tooltip"
      placement="right-start"
    >
      <slot slot="content" :name="tooltipScopedSlot"/>
      <s-icon class="settings-header-hint" name="info-16" size="12px" />
    </branded-tooltip>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'

import { lazyComponent } from '@/router'
import { Components } from '@/consts'

import TranslationMixin from '@/components/mixins/TranslationMixin'

@Component({
  components: {
    BrandedTooltip: lazyComponent(Components.BrandedTooltip)
  }
})
export default class SettingsHeader extends Mixins(TranslationMixin) {
  private tooltipScopedSlot = 'tooltip-content'

  @Prop({ type: String, default: '' }) title!: string
  @Prop({ type: String, default: '' }) tooltip!: string

  get hasTooltipContent (): boolean {
    return !!this.tooltip || !!this.$scopedSlots[this.tooltipScopedSlot]
  }
}
</script>

<style lang="scss" scoped>
.settings-header {
  padding-bottom: $inner-spacing-mini;
  padding-left: $inner-spacing-mini / 2;
  color: var(--s-color-base-content-tertiary);
  font-size: $s-font-size-settings;
  line-height: $s-line-height-base;
  letter-spacing: $s-letter-spacing-type;
  font-weight: 700;

  &-hint {
    margin-left: $inner-spacing-mini / 2;
    cursor: pointer;
  }
}
</style>
