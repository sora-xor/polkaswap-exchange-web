<template>
  <s-dialog
    :visible.sync="isVisible"
    :title="title"
    :custom-class="computedCustomClasses"
    :show-close="false"
    v-bind="{
      width: width || '496px',
      borderRadius: 'medium',
      ...$attrs
    }"
    class="dialog-wrapper"
  >
    <template #title>
      <slot name="title">
        <span class="el-dialog__title">{{ title }}</span>
      </slot>
      <slot name="close">
        <s-button class="el-dialog__close" type="action" icon="x-16" @click="isVisible = false" />
      </slot>
    </template>
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
  @Prop({ default: '', type: String }) readonly width!: string

  get computedCustomClasses (): string {
    const cssClasses: Array<string> = []
    cssClasses.push('neumorphic')
    if (this.customClass) {
      cssClasses.push(this.customClass)
    }
    return cssClasses.join(' ')
  }
}
</script>

<style lang="scss">
$el-dialog-class: '.el-dialog';
$el-dialog-button-size: var(--s-size-medium);

.dialog-wrapper {
  #{$el-dialog-class} {
    background: var(--s-color-utility-surface);

    & > #{$el-dialog-class} {
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
      justify-content: space-between;
      width: 100%;

      #{$el-dialog-class}__title {
        font-size: var(--s-heading3-font-size);
        font-weight: 300 !important;
        line-height: var(--s-line-height-small);
        letter-spacing: var(--s-letter-spacing-mini);
      }

      #{$el-dialog-class}__close {
        i {
          font-size: var(--s-icon-font-size-big) !important;
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
}
</style>
