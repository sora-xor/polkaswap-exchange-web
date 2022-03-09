<template>
  <s-dialog
    class="dialog-wrapper"
    :visible.sync="isVisible"
    :title="title"
    :custom-class="computedCustomClasses"
    :show-close="false"
    v-bind="{
      width,
      borderRadius: 'medium',
      ...$attrs,
    }"
  >
    <template #title>
      <slot name="title">
        <span class="el-dialog__title">{{ title }}</span>
      </slot>
      <slot v-if="showCloseButton" name="close">
        <s-button class="el-dialog__close" type="action" icon="x-16" @click="closeDialog" />
      </slot>
    </template>
    <slot />
    <slot slot="footer" name="footer" />
  </s-dialog>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Mixins, Prop } from 'vue-property-decorator';
import SScrollbar from '@soramitsu/soramitsu-js-ui/lib/components/Scrollbar';

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

  async mounted(): Promise<void> {
    await this.$nextTick();
    const dialogWrapper = this.$el;
    const dialog = this.$el.childNodes[0];
    const handleClickOutside = (event: Event) => this.handleClickOutside(event, dialog);
    // Create scrollbar component dinamically. It should be done in js-ui-library
    const Scrollbar = Vue.extend(SScrollbar);
    const scrollbar = new Scrollbar({
      mounted: function () {
        this.$el.addEventListener('click', handleClickOutside);
      },
      destroyed: function () {
        this.$el.removeEventListener('click', handleClickOutside);
      },
    });
    scrollbar.$mount();
    dialogWrapper.appendChild(scrollbar.$el);
    const scrollbarView = scrollbar.$el.getElementsByClassName('el-scrollbar__view')[0];
    scrollbarView.appendChild(dialog);
  }

  /**
   * It's required cuz we've added scrollbar between dialog layers and default click outside directive doesn't work
   */
  private handleClickOutside(event: Event, el: Node): void {
    if (!(el === event.target || el.contains(event.target as Node)) && this.isVisible) {
      this.closeDialog();
    }
  }
}
</script>

<style lang="scss">
$el-dialog-class: '.el-dialog';
$el-dialog-button-size: var(--s-size-medium);
$el-dialog-max-width: 496px;

.dialog-wrapper {
  @include scrollbar;

  > .el-scrollbar {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    margin: 0;
  }

  #{$el-dialog-class} {
    background: var(--s-color-utility-surface);
    max-width: $el-dialog-max-width;
    width: 100%;

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
