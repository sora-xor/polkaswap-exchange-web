<template>
  <s-tooltip
    v-bind="{
      animation: 'none',
      popperClass: 'wallet-tooltip',
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
.el-tooltip__popper.is-light.wallet-tooltip {
  padding: 4px 8px 6px;
  background-color: var(--s-color-brand-day);
  color: var(--s-color-utility-body);

  & .popper__arrow {
    border-bottom-color: var(--s-color-brand-day);

    &:after {
      border-bottom-color: var(--s-color-brand-day);
    }
  }
}
</style>
