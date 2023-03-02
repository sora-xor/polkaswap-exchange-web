<template>
  <el-popover :popper-class="computedPopperClass" placement="top" trigger="click">
    <slot slot="reference" name="reference" />
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
import { Component, Prop, Vue } from 'vue-property-decorator';
import { Status } from '@soramitsu/soramitsu-js-ui/lib/types';

const cssPopperClass = 'app-status__tooltip';

@Component
export default class FooterPopper extends Vue {
  @Prop({ required: true, type: String }) readonly status!: Status;
  @Prop({ type: String, default: '' }) readonly actionText!: Nullable<string>;

  get computedPopperClass(): string {
    const css = [cssPopperClass, this.status].filter((item) => !!item);
    return css.join(' ');
  }

  handleActionClick(): void {
    this.$emit('action');
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
    }
  }
}
</style>
