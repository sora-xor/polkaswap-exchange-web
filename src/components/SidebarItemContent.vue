<template>
  <component :is="tag" :class="classes">
    <div class="icon-container">
      <s-icon :name="icon" size="24" />
    </div>
    <span>{{ title }}</span>
  </component>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'

import TranslationMixin from './mixins/TranslationMixin'

@Component
export default class SidebarItemContent extends Mixins(TranslationMixin) {
  @Prop({ default: '', type: String }) readonly icon!: string
  @Prop({ default: '', type: String }) readonly title!: string
  @Prop({ default: 'div', type: String }) readonly tag!: string

  get classes (): Array<string> {
    const base = 'sidebar-item-content'
    const classes = [base]

    if (this.tag === 'a') {
      classes.push(`${base}--link`)
    }

    return classes
  }
}
</script>

<style lang="scss" scoped>
.sidebar-item-content {
  display: flex;

  &--link {
    &, &:hover, &:focus, &:visited {
      text-decoration: none;
      color: inherit;
    }
  }
}

.icon-container {
  width: var(--s-size-mini);
  margin-right: $inner-spacing-small;
}
</style>
