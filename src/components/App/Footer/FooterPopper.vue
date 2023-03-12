<template>
  <el-popover
    ref="popover"
    placement="top"
    trigger="click"
    :popper-class="computedPopperClass"
    :disabled="loading"
    :tabindex="tabindex"
  >
    <div
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
import { Component, Prop, Vue, Ref } from 'vue-property-decorator';
import { Status } from '@soramitsu/soramitsu-js-ui/lib/types';

const cssPopperClass = 'app-status__tooltip';

@Component
export default class FooterPopper extends Vue {
  @Prop({ required: true, type: String }) readonly status!: Status;
  @Prop({ required: true, type: String }) readonly icon!: string;
  @Prop({ type: String, default: '' }) readonly panelClass!: Nullable<string>;
  @Prop({ type: String, default: '' }) readonly actionText!: Nullable<string>;
  @Prop({ required: true, type: String }) readonly panelText!: string;

  @Ref('popover') popover!: any;

  get computedPopperClass(): string {
    const css = [cssPopperClass, this.status].filter((item) => !!item);
    return css.join(' ');
  }

  get computedClass(): string {
    const css = [this.panelClass, this.status].filter((item) => !!item);
    return css.join(' ');
  }

  get loading(): boolean {
    return this.status === Status.DEFAULT;
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

  handleBlur(): void {
    this.popover?.doClose();
  }
}
</script>

<style lang="scss">
$tooltip-placements: 'top'; // add another styles if needed
$status-classes: 'error', 'warning', 'success';

.app-status__tooltip.el-popover.el-popper {
  border-color: var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-mini); // border-radius: 12px;
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
      > :first-child {
        font-weight: 300;
        font-size: 12px;
        line-height: 150%;
      }
      > :last-child {
        font-weight: 500;
        font-size: 14px;
        line-height: 150%;
      }
    }
    &__desc {
      flex-wrap: wrap;
      margin-top: 8px;
      > * {
        font-weight: 400;
        font-size: 12px;
        line-height: 150%;
        padding: 6px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        margin-bottom: 8px;
      }
      > :first-child {
        margin-right: 8px;
      }
    }
    &__action {
      box-shadow: none;
      margin-left: 30px;
      background: #f7f3f4;
      color: #2a171f;
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
    background-image: url('~@/assets/img/status-pending.svg');
    @include loading;
  }
  &__text {
    margin-left: 6px;
  }
}
</style>
