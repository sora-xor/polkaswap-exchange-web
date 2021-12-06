<template>
  <div class="container">
    <h3>{{ t('pageNotFound.title') }}</h3>
    <h2>{{ t('pageNotFound.body') }}</h2>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class PageNotFound extends Mixins(TranslationMixin) {}
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  h2 {
    margin-top: 0.25em;
    font-size: 3rem;
    color: var(--s-color-theme-accent);
  }
}
</style>
