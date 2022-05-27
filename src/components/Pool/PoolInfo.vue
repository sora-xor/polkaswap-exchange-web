<template>
  <div class="pool-info">
    <slot name="prepend" />

    <div class="pool-info-content">
      <slot />
    </div>

    <div class="pool-info-buttons">
      <slot name="buttons" />
    </div>

    <slot name="append" />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class PoolInfo extends Vue {}
</script>

<style lang="scss">
.pool-info {
  & > *:not(:last-child) {
    margin-bottom: $inner-spacing-medium;
  }

  &-buttons {
    display: flex;
    justify-content: center;

    > * {
      width: 50%;
    }

    .el-button + .el-button {
      margin-left: $inner-spacing-small;
    }
  }
}
</style>
