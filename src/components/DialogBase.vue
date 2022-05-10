<template>
  <s-dialog
    :visible.sync="isVisible"
    :title="title"
    :custom-class="computedCustomClasses"
    :show-close="false"
    v-bind="{
      width,
      ...$attrs,
    }"
    class="dialog-wrapper"
  >
    <div class="cart">
      <div class="cart__bg-1"></div>
      <img src="img/cloud-pink.png" loading="lazy" alt="" class="cloud-pink" />
      <img src="img/cloud-perple.png" loading="lazy" alt="" class="cloud-perple" />
      <div class="blur-circle-1"></div>
      <div class="blur-circle-2"></div>
      <div class="cart__content">
        <button class="popup__close" @click="closeDialog">
          <img src="img/close.png" loading="lazy" alt="" class="popup__close-img" />
          <span class="popup__close-text">Close</span>
        </button>
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
  @Prop({ default: true, type: Boolean }) readonly showCloseButton!: boolean;

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
$el-dialog-max-width: 504px;

.dialog-wrapper {
  #{$el-dialog-class} {
    max-width: $el-dialog-max-width;
    width: 100%;
    border-radius: none !important;
    background: transparent !important;
    z-index: 3;

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
      }
    }
  }
}
</style>
