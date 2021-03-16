<template>
  <div :class="headerClasses">
    <s-button v-if="hasButtonBack" type="action" size="medium" icon="chevron-left-rounded" @click="handleBack" />
    <h3 class="page-header-title">{{ title }}</h3>
    <s-tooltip
      v-if="!!tooltip"
      class="page-header-tooltip"
      popper-class="info-tooltip info-tooltip--page-header"
      :content="tooltip"
      theme="light"
      :placement="tooltipPlacement"
      animation="none"
      :show-arrow="false"
    >
      <s-icon name="info" size="16" />
    </s-tooltip>
    <!-- TODO: Add appropriate icon -->
    <s-button v-if="hasButtonHistory" class="el-button--history" type="action" size="medium" icon="time" @click="handleViewTransactionsHistory" />
    <slot />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import router from '@/router'
import { PageNames } from '@/consts'

@Component
export default class GenericPageHeader extends Mixins(TranslationMixin) {
  @Prop({ default: false, type: Boolean }) readonly hasButtonBack!: boolean
  @Prop({ default: PageNames.Pool, type: String }) readonly backPageName!: string
  @Prop({ default: false, type: Boolean }) readonly hasButtonHistory!: boolean
  @Prop({ default: '', type: String }) readonly title!: string
  @Prop({ default: '', type: String }) readonly tooltip!: string
  @Prop({ default: 'bottom-end', type: String }) readonly tooltipPlacement!: string

  get headerClasses (): string {
    const baseClass = 'page-header'
    const classes = [baseClass]

    if (this.hasButtonBack) {
      classes.push(`${baseClass}--center`)
    }

    return classes.join(' ')
  }

  handleBack (): void {
    router.push({ name: this.backPageName })
  }

  handleViewTransactionsHistory (): void {
    router.push({ name: PageNames.BridgeTransactionsHistory })
  }
}
</script>

<style lang="scss">
.info-tooltip--page-header {
  margin-top: #{$inner-spacing-mini / 2} !important;
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
  margin-bottom: $inner-spacing-medium;
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
      right: 0;
      bottom: 0;
    }
  }
  &-title {
    line-height: $tooltip-area-height;
    font-feature-settings: $s-font-feature-settings-title;
    letter-spacing: $s-letter-spacing-small;
    & + .el-button {
      right: 0;
    }
  }
  &-tooltip {
    margin-top: auto;
    margin-bottom: auto;
    margin-left: $inner-spacing-mini;
    height: $tooltip-size;
    width: $tooltip-size;
    padding-left: 1px;
    border-radius: 50%;
    color: var(--s-color-base-content-tertiary);
    text-align: center;
    cursor: pointer;
    &:before {
      font-size: var(--s-icon-font-size-mini);
      line-height: $tooltip-size;
    }
  }
  .el-button--history {
    margin-left: auto;
  }
}
</style>
