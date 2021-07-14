<template>
  <div @click="onClick" class="sort-button">
    <slot/>
    <s-icon name="arrows-chevron-top-rounded-24" :class="computedClasses" />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import { SortDirection } from '@soramitsu/soramitsu-js-ui/src/components/Table/consts'

interface SortData {
  order: string;
  property: string;
}

@Component
export default class SortButton extends Vue {
  @Prop({ default: '', type: String }) readonly name!: string
  @Prop({ default: () => ({}), type: Object }) readonly sort!: SortData

  get active (): boolean {
    return this.name === this.sort.property
  }

  get computedClasses (): Array<string> {
    const base = 'sort-icon'
    const classes = [base]

    if (this.active) {
      classes.push(`${base}--active`)
      classes.push(`${base}--${this.sort.order}`)
    }

    return classes
  }

  onClick (): void {
    this.$emit('change-sort', {
      property: this.name,
      order: this.sort.order === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC
    })
  }
}
</script>

<style lang="scss">
.sort-button {
  cursor: pointer;
  display: flex;
  margin: auto;
}
.sort-icon {
  display: inline-flex;

  &--active {
    color: var(--s-color-theme-accent) !important;
  }

  &--descending {
    transform: rotate(180deg);
  }
}
</style>
