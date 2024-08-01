<template>
  <div v-button class="sort-button" @click="onClick">
    <slot />
    <s-icon name="arrows-chevron-top-rounded-24" :class="computedClasses" />
  </div>
</template>

<script lang="ts">
import { SortDirection } from '@soramitsu-ui/ui-vue2/lib/components/Table/consts';
import { Component, Prop, Vue } from 'vue-property-decorator';

interface SortData {
  order: string;
  property: string;
}

@Component
export default class SortButton extends Vue {
  @Prop({ default: '', type: String }) readonly name!: string;
  @Prop({ default: () => ({}), type: Object }) readonly sort!: SortData;
  @Prop({ default: SortDirection.DESC, type: String }) readonly defaultSort!: SortDirection;

  get active(): boolean {
    return this.name === this.sort.property;
  }

  get computedClasses(): Array<string> {
    const base = 'sort-icon';
    const classes = [base];

    if (this.active) {
      classes.push(`${base}--active`);
      classes.push(`${base}--${this.sort.order}`);
    }

    return classes;
  }

  onClick(): void {
    const order =
      this.name === this.sort.property
        ? this.sort.order === SortDirection.ASC
          ? SortDirection.DESC
          : SortDirection.ASC
        : this.defaultSort;

    this.$emit('change-sort', {
      property: this.name,
      order,
    });
  }
}
</script>

<style lang="scss">
.sort-button {
  cursor: pointer;

  & > * {
    vertical-align: middle;

    &:not(:last-child) {
      margin-right: $inner-spacing-tiny;
    }
  }
}
.sort-icon {
  display: inline-flex;
  vertical-align: bottom;

  &--active {
    color: var(--s-color-theme-accent) !important;
  }

  &--descending {
    transform: rotate(180deg);
  }

  @include icon-styles($hoverColor: var(--s-color-theme-accent-hover));
}
</style>
