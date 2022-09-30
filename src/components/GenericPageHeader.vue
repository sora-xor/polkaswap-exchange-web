<template>
  <div :class="headerClasses" ref="genericPageHeader" :tabindex="hasFocusReset ? 0 : -1">
    <s-button v-if="hasButtonBack" type="action" icon="arrows-chevron-left-rounded-24" @click="handleBack($event)" />
    <h3 class="page-header-title">
      <slot name="title">
        {{ title }}
      </slot>
      <s-tooltip
        v-if="tooltip"
        class="page-header-tooltip"
        popper-class="info-tooltip info-tooltip--page-header"
        border-radius="mini"
        :content="tooltip"
        :placement="tooltipPlacement"
      >
        <s-icon name="info-16" size="18px" />
      </s-tooltip>
    </h3>
    <slot />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class GenericPageHeader extends Mixins(TranslationMixin) {
  @Prop({ default: false, type: Boolean }) readonly hasButtonBack?: boolean;
  @Prop({ default: '', type: String }) readonly title!: string;
  @Prop({ default: '', type: String }) readonly tooltip?: string;
  @Prop({ default: 'right-start', type: String }) readonly tooltipPlacement?: string;
  @Prop({ default: '', type: String }) readonly resetFocus!: string;

  @Watch('resetFocus')
  private async resetBaseFocus(value: string) {
    if (value) {
      this.hasFocusReset = true;

      const editButtonRef = this.$refs.genericPageHeader as any;
      editButtonRef.focus();
      editButtonRef.blur();

      this.hasFocusReset = false;
    }
  }

  hasFocusReset = false;

  get headerClasses(): string {
    const baseClass = 'page-header';
    const classes = [baseClass];

    if (this.hasButtonBack) {
      classes.push(`${baseClass}--center`);
    }

    return classes.join(' ');
  }

  handleBack(event?: Event): void {
    this.$emit('back', event);
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
$title-padding: calc(#{var(--s-size-medium)} + #{$inner-spacing-small});

#{$page-header-class} {
  position: relative;
  display: flex;
  margin: 0 0 $inner-spacing-medium;
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
  }
  &-title {
    @include page-header-title;
    color: var(--s-color-base-content-primary);
    line-height: $tooltip-area-height;
    & + .el-button {
      right: 0;
      &--settings {
        margin-left: auto;
      }
    }
    .el-tooltip {
      @include focus-outline($borderRadius: 50%);
    }
  }
  &-tooltip {
    margin-top: auto;
    margin-bottom: auto;
    margin-left: $inner-spacing-mini;
    line-height: $tooltip-area-height;
    cursor: pointer;
  }
}
</style>
