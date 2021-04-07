<template>
  <s-dialog
    :visible.sync="isVisible"
    :title="title"
    :custom-class="customClass"
    v-bind="{
      top: '80px',
      width: '496px',
      borderRadius: 'medium',
      ...$attrs
    }"
    class="dialog-wrapper"
  >
    <slot />
    <slot slot="footer" name="footer" />
  </s-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'

import DialogMixin from '@/components/mixins/DialogMixin'

@Component
export default class DialogBase extends Mixins(DialogMixin) {
  @Prop({ default: '', type: String }) readonly customClass!: string
  @Prop({ default: '', type: String }) readonly title!: string
}
</script>

<style lang="scss">
$el-dialog-class: '.el-dialog';
$el-dialog-button-size: var(--s-size-medium);

.dialog-wrapper {
  #{$el-dialog-class} #{$el-dialog-class} {
    &__header {
      padding: $inner-spacing-big $inner-spacing-big $inner-spacing-mini;
    }
    &__body {
      padding: $inner-spacing-mini $inner-spacing-big;
    }
    &__footer {
      padding: $inner-spacing-mini $inner-spacing-big $inner-spacing-big;
    }
  }
  #{$el-dialog-class}__header {
    display: inline-flex;
    align-items: center;
    width: 100%;
    #{$el-dialog-class}__title {
      font-size: var(--s-heading3-font-size);
      font-weight: normal;
      font-feature-settings: $s-font-feature-settings-title;
      line-height: $s-line-height-small;
      letter-spacing: $s-letter-spacing-small;
    }
  }
  #{$el-dialog-class}__headerbtn {
    position: static;
    margin-left: auto;
    height: $el-dialog-button-size;
    width: $el-dialog-button-size;
    background-color: var(--s-color-base-background);
    border-color: var(--s-color-base-background);
    border-radius: var(--s-border-radius-small);
    #{$el-dialog-class}__close {
      color: var(--s-color-base-content-primary);
      font-size: calc(#{$el-dialog-button-size} / 2);
      font-weight: $s-font-weight-big;
    }
    color: var(--s-color-base-content-primary);
    &:hover, &:active, &:focus {
      background-color: var(--s-color-base-background-hover);
      border-color: var(--s-color-base-background-hover);
      #{$el-dialog-class}__close {
        color: var(--s-color-base-content-primary);
      }
    }
  }
  #{$el-dialog-class}__footer {
    .el-button {
      padding: $inner-spacing-mini;
      width: 100%;
    }
  }
}
</style>
