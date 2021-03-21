<template>
  <s-tooltip
    v-bind="{
      popperClass: 'info-tooltip',
      theme: 'light',
      animation: 'none',
      ...$attrs
    }"
  >
    <slot slot="content" name="content"/>
    <!-- element-ui disabled tooltip disables wrapped button, this is the way to fix it -->
    <span>
      <slot/>
    </span>
  </s-tooltip>
</template>

<script lang="ts">
export default {}
</script>

<style lang="scss">
$tooltip-padding-top: $inner-spacing-mini * 0.5;
$tooltip-padding-bottom: $inner-spacing-mini * 0.75;

.el-tooltip__popper.is-light.s-border-radius-small /* .info-tooltip TODO: use it everywhere */ {
  max-width: 236px;
  padding: $tooltip-padding-top $inner-spacing-mini $tooltip-padding-bottom;
  line-height: $s-line-height-base;
  background-color: var(--s-color-brand-day);
  color: var(--s-color-utility-body);
  .popper__arrow {
    border-bottom-color: var(--s-color-brand-day);
    &::after {
      border-bottom-color: inherit;
    }
  }
  &[x-placement^="top"] .popper__arrow {
    border-top-color: var(--s-color-brand-day);
    &::after {
      border-top-color: inherit;
    }
  }
  &[x-placement^="bottom"] .popper__arrow {
    border-bottom-color: var(--s-color-brand-day);
    &::after {
      border-top-color: inherit;
    }
  }
  &[x-placement^="right"] .popper__arrow {
    border-right-color: var(--s-color-brand-day);
    &::after {
      border-right-color: inherit;
    }
  }
  &[x-placement^="left"] .popper__arrow {
    border-left-color: var(--s-color-brand-day);
    &::after {
      border-left-color: inherit;
    }
  }
}
</style>
