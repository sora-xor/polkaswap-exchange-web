<template>
  <div :class="headerClasses">
    <s-button v-if="hasButtonBack" type="action" icon="arrows-chevron-left-rounded-24" @click="handleBack" />
    <h3 class="page-header-title">{{ title }}</h3>
    <branded-tooltip
      v-if="!!tooltip"
      class="page-header-tooltip"
      popper-class="info-tooltip info-tooltip--page-header"
      :content="tooltip"
      :placement="tooltipPlacement"
    >
      <s-icon name="info-16" />
    </branded-tooltip>
    <slot />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import { lazyComponent } from '@/router'
import { Components } from '@/consts'

@Component({
  components: {
    BrandedTooltip: lazyComponent(Components.BrandedTooltip)
  }
})
export default class GenericPageHeader extends Mixins(TranslationMixin) {
  @Prop({ default: false, type: Boolean }) readonly hasButtonBack?: boolean
  @Prop({ default: '', type: String }) readonly title!: string
  @Prop({ default: '', type: String }) readonly tooltip?: string
  @Prop({ default: 'right-start', type: String }) readonly tooltipPlacement?: string

  get headerClasses (): string {
    const baseClass = 'page-header'
    const classes = [baseClass]

    if (this.hasButtonBack) {
      classes.push(`${baseClass}--center`)
    }

    return classes.join(' ')
  }

  handleBack (): void {
    this.$emit('back')
  }
}
</script>

<style lang="scss">
.info-tooltip--page-header {
  margin-top: 0 !important;
}
</style>

<style lang="scss" scoped>
$page-header-class: '.page-header';
$tooltip-area-height: var(--s-size-medium);
$tooltip-size: var(--s-size-mini);
$title-padding: calc(#{var(--s-size-small)} + #{$inner-spacing-small});

#{$page-header-class} {
  position: relative;
  display: flex;
  margin: 0 0 $inner-spacing-medium;
  padding: 0 $inner-spacing-small;
  width: 100%;
  &--center {
    .el-button {
      position: absolute;
    }
    #{$page-header-class}-title {
      width: 100%;
      padding-right: $title-padding;
      padding-left: $title-padding;
      text-align: center;
    }
    #{$page-header-class}-tooltip {
      position: absolute;
      top: 0;
      right: $inner-spacing-small;
      bottom: 0;
    }
  }
  &-title {
    line-height: $tooltip-area-height;
    font-feature-settings: $s-font-feature-settings-title;
    font-weight: 300;
    letter-spacing: $s-letter-spacing-small;
    & + .el-button {
      right: 0;
      &--settings {
        margin-left: auto;
      }
    }
  }
  &-tooltip .s-icon-info-16 {
    margin-top: auto;
    margin-bottom: auto;
    margin-left: $inner-spacing-mini;
    height: $tooltip-size;
    width: $tooltip-size;
    padding-left: 1px;
    border-radius: 50%;
    line-height: $tooltip-area-height;
    color: var(--s-color-base-content-tertiary);
    text-align: center;
    cursor: pointer;
    &:before {
      font-size: var(--s-icon-font-size-mini);
      line-height: $tooltip-size;
    }
  }
}
</style>
