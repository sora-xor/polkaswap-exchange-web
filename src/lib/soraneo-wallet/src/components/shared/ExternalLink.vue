<template>
  <a class="external-link" :class="defaultClass" :href="href" target="_blank" rel="nofollow noopener">
    <span>{{ title }}</span>
  </a>
</template>

<script lang="ts" setup>
withDefaults(
  defineProps<{
    title?: string;
    href?: string;
    defaultClass?: string;
  }>(),
  {
    title: '',
    href: '',
    defaultClass: 'p4',
  }
);
</script>

<style lang="scss" scoped>
.external-link {
  display: inline-block;
  text-decoration: none;
  color: var(--s-color-theme-accent);

  @include focus-outline;
}
</style>
