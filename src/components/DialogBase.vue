<template>
  <s-dialog
    :visible.sync="isVisible"
    :title="title"
    :custom-class="computedCustomClasses"
    :show-close="false"
    v-bind="{
      width,
      borderRadius: 'medium',
      ...$attrs,
    }"
    class="dialog-wrapper"
  >
    <div class="cart">
      <div class="cart__bg-1"></div>
      <img src="img/stroke-img.png" loading="lazy" alt="" class="cart__stroke" />
      <button class="btn btn-close el-dialog__close" @click="closeDialog">
        <s-icon name="x-16" size="16" class="el-dialog__close-icon" />
        Close
      </button>
      <div class="dialog-content">
        <slot />
      </div>
    </div>
  </s-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';

import DialogMixin from '@/components/mixins/DialogMixin';

@Component
export default class DialogBase extends Mixins(DialogMixin) {
  @Prop({ default: '', type: String }) readonly customClass!: string;
  @Prop({ default: '', type: String }) readonly title!: string;
  @Prop({ default: '', type: String }) readonly width!: string;

  get computedCustomClasses(): string {
    const cssClasses: Array<string> = [];
    cssClasses.push('neumorphic');
    if (this.customClass) {
      cssClasses.push(this.customClass);
    }
    return cssClasses.join(' ');
  }
}
</script>

<style lang="scss">
$el-dialog-class: '.el-dialog';
$el-dialog-button-size: var(--s-size-medium);
$el-dialog-max-width: 464px;

.dialog-wrapper {
  #{$el-dialog-class} {
    max-width: $el-dialog-max-width;
    width: 100%;

    & > #{$el-dialog-class} {
      &__header {
        display: none !important;
      }
      &__body {
        position: relative;
        padding: 0;

        #{$el-dialog-class}__close {
          position: absolute;
          color: var(--s-color-base-content-primary);
          top: -48px;
          right: -48px;
          z-index: 1;

          &-icon {
            margin-right: 18px;
            color: #ff9ae9;
          }
        }

        .dialog-content {
          padding: 24px;
        }
      }
    }
  }
}
</style>
