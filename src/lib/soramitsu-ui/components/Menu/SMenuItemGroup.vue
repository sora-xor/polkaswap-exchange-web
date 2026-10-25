<script setup lang="ts">
defineOptions({ name: 'SMenuItemGroup' });
</script>

<template>
  <li class="s-menu-item-group el-menu-item-group" role="none">
    <ul class="el-menu-item-group__list" role="none">
      <slot />
    </ul>
  </li>
</template>

<style lang="scss">
.s-menu-item-group.el-menu-item-group {
  list-style: none;
  margin: 0;
  padding: 0;

  .el-menu-item-group__list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
}
</style>
