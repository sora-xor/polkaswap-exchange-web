<template>
  <div class="card">
    <div v-if="title" class="card__title">{{ title }}</div>
    <slot></slot>
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
    font-weight: 600;
    line-height: $s-line-height-medium;
    color: var(--s-color-base-content-primary);
  }
  &__data {
    color: var(--s-color-base-content-tertiary);
    line-height: $s-line-height-medium;
    display: flex;
    justify-content: space-between;
  }
}
</style>

<style lang="scss" scoped>
.card {
  border: 1px solid var(--s-color-base-background-hover);
  box-sizing: border-box;
  border-radius: 12px;
  margin: $inner-spacing-mini 0;
  padding: $inner-spacing-medium;
}
</style>
