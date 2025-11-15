<template>
  <div class="pool-info">
    <slot name="prepend"></slot>

    <div class="pool-info-content">
      <slot></slot>
    </div>

    <div v-if="$slots.buttons" class="pool-info-buttons">
      <slot name="buttons"></slot>
    </div>

    <slot name="append"></slot>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'PoolInfo',
});
</script>

<style lang="scss">
.pool-info {
  display: flex;
  flex-direction: column;

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
