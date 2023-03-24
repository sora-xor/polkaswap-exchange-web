<template>
  <a class="external-link p4" :href="href" target="_blank" rel="nofollow noopener">
    <span>{{ title }}</span>
  </a>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';

@Component
export default class ExternalLink extends Vue {
  @Prop({ default: '', type: String }) title!: string;
  @Prop({ default: '', type: String }) href!: string;
}
</script>

<style lang="scss" scoped>
.external-link {
  display: inline-block;
  text-decoration: none;
  color: var(--s-color-theme-accent);

  &__icon {
    margin-left: $inner-spacing-tiny;
    font-size: 0.75em !important;

    &,
    &:hover {
      color: var(--s-color-theme-accent) !important;
    }
  }
}
</style>
