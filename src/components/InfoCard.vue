<template>
  <div class="card">
    <div v-if="title" class="card__title">{{ title }}</div>
    <slot />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import TranslationMixin from '@/components/mixins/TranslationMixin'

@Component
export default class InfoCard extends Mixins(TranslationMixin) {
  @Prop({ default: '', type: String }) readonly title!: string
}
</script>

<style lang="scss">
.card {
  &__title {
    line-height: $s-line-height-big;
    color: var(--s-color-base-content-primary);
    @include font-weight(600);
  }
  &__data {
    display: flex;
    justify-content: space-between;
    line-height: $s-line-height-big;
    color: var(--s-color-base-content-secondary);
    &_assets {
      color: var(--s-color-base-content-primary);
    }
  }
}
</style>

<style lang="scss" scoped>
.card {
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-small);
  margin: $inner-spacing-mini 0;
  padding: $inner-spacing-medium;
}
</style>
