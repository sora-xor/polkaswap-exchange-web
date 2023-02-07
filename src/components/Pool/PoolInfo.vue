<template functional>
  <div class="pool-info">
    <slot name="prepend" />

    <div class="pool-info-content">
      <slot />
    </div>

    <div class="pool-info-buttons" v-if="$slots.buttons">
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
      width: 100%;

      &:not(:first-child),
      &:not(:last-child) {
        width: 50%;
      }
    }

    .el-button + .el-button {
      margin-left: $inner-spacing-small;
    }
  }
}
</style>
