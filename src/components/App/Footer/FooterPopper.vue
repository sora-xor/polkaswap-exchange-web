<template>
  <el-popover :popper-class="computedPopperClass" placement="top" trigger="click">
    <slot />
    <slot slot="reference" name="reference" />
  </el-popover>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { Status } from '@soramitsu/soramitsu-js-ui/lib/types';

const cssPopperClass = 'app-status__tooltip';

@Component
export default class FooterPopper extends Vue {
  @Prop({ required: true, type: String }) readonly status!: Status;

  get computedPopperClass(): string {
    const css = [cssPopperClass, this.status].filter((item) => !!item);
    return css.join(' ');
  }
}
</script>

<style lang="scss">
$tooltip-placements: 'top';
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
}
</style>
