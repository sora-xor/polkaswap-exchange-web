<template>
  <el-popover
    ref="popover"
    placement="top"
    trigger="click"
    :popper-class="computedPopperClass"
    :tabindex="tabindex"
    @show="handleShow"
  >
    <div
      v-button
      slot="reference"
      class="app-status__item s-flex"
      :class="computedClass"
      @keypress.enter="handleEnterClick"
      @blur="handleBlur"
    >
      <span v-if="loading" class="app-status__loading" />
      <s-icon v-else :name="icon" size="16" />
      <span class="app-status__text">{{ panelText }}</span>
    </div>
    <div class="item s-flex">
      <div class="item__title s-flex">
        <div class="item__label s-flex">
          <slot name="label" />
        </div>
        <s-button v-if="actionText" class="item__action" size="small" type="secondary" @click="handleActionClick">
          {{ actionText }}
        </s-button>
      </div>
      <div class="item__desc s-flex">
        <slot />
      </div>
    </div>
  </el-popover>
</template>

<script lang="ts">
import { Status } from '@soramitsu-ui/ui-vue2/lib/types';
import { Component, Prop, Vue, Ref } from 'vue-property-decorator';

import { delay } from '@/utils';

const cssPopperClass = 'app-status__tooltip';

@Component
export default class FooterPopper extends Vue {
  @Prop({ required: true, type: String }) readonly status!: Status;
  @Prop({ required: true, type: String }) readonly icon!: string;
  @Prop({ type: String, default: '' }) readonly panelClass!: Nullable<string>;
  @Prop({ type: String, default: '' }) readonly actionText!: Nullable<string>;
  @Prop({ required: true, type: String }) readonly panelText!: string;

  @Ref('popover') popover!: any;

  /** Fix issue with negative left values */
  async handleShow(): Promise<void> {
    await delay(100);
    const left = (this.popover?.popperElm as Nullable<HTMLElement>)?.style?.getPropertyValue('left');
    if (!left) return;
    if (left.includes('-')) {
      (this.popover?.popperElm as HTMLElement).style.setProperty('left', '0');
    }
  }

  get computedPopperClass(): string {
    const css = [cssPopperClass, this.status].filter((item) => !!item);
    return css.join(' ');
  }

  get computedClass(): string {
    const css = [this.panelClass, this.status].filter((item) => !!item);
    return css.join(' ');
  }

  get loading(): boolean {
    return this.status === Status.INFO;
  }

  get tabindex(): number {
    return this.loading ? -1 : 0;
  }

  handleActionClick(): void {
    this.$emit('action');
  }

  handleEnterClick(): void {
    this.popover?.doToggle();
  }

  /** Click outside or tab event on another popper */
  handleBlur(event: FocusEvent): void {
    const el: Nullable<HTMLElement> = this.popover.popperElm;
    const eventEl = event.relatedTarget as Nullable<HTMLElement>;
    if (!(el && eventEl)) return;
    if (!(el === eventEl || el.contains(eventEl))) {
      this.popover?.doClose();
    }
  }
}
</script>

<style lang="scss">
$tooltip-placements: 'top'; // add another styles if needed
$status-classes: 'error', 'warning', 'info', 'success';
$footer-label-line-height: 150%;
$footer-action-color: #2a171f;
$footer-action-background-color: #f7f3f4;

.app-status__tooltip.el-popover.el-popper {
  border-color: var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-mini);
  box-shadow: var(--s-shadow-tooltip);
  padding: $inner-spacing-mini $inner-spacing-small;
  color: var(--s-color-base-on-accent);

  @each $status in $status-classes {
    &.#{$status} {
      background-color: var(--s-color-status-#{$status});
      @each $placement in $tooltip-placements {
        &[x-placement^='#{$placement}'] .popper__arrow {
          border-#{$placement}-color: var(--s-color-base-border-secondary);
          &:after {
            border-#{$placement}-color: var(--s-color-status-#{$status});
          }
        }
      }
    }
  }

  .item {
    flex-direction: column;
    &__title {
      justify-content: space-between;
      align-items: center;
    }
    &__label {
      flex-direction: column;
      word-break: break-word;
      > :first-child {
        font-weight: 300;
        font-size: var(--s-font-size-mini);
        line-height: $footer-label-line-height;
      }
      > :last-child {
        font-weight: 500;
        font-size: var(--s-font-size-small);
        line-height: $footer-label-line-height;
      }
    }
    &__desc {
      flex-wrap: wrap;
      margin-top: $inner-spacing-mini;
      > * {
        font-weight: 400;
        font-size: var(--s-font-size-mini);
        line-height: $footer-label-line-height;
        padding: 6px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        margin-bottom: $inner-spacing-mini;
      }
      > :first-child {
        margin-right: $inner-spacing-mini;
      }
    }
    &__action {
      margin-left: 30px;
      &,
      &:hover,
      &:focus,
      &:active {
        box-shadow: none;
        background: $footer-action-background-color;
        color: $footer-action-color;
      }
    }
  }
}
</style>

<style lang="scss" scoped>
$status-classes: 'error', 'warning', 'success';

.app-status {
  &__item {
    @include app-status-item;

    @each $status in $status-classes {
      &.#{$status} i {
        color: var(--s-color-status-#{$status});
      }
    }
  }
  &__loading {
    height: var(--s-font-size-mini);
    width: var(--s-font-size-mini);
    background-image: url('@/assets/img/status-pending.svg');
    @include loading;
  }
  &__text {
    margin-left: 6px;
  }
}
</style>
