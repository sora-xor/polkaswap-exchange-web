<template>
  <div :class="['value-status-wrapper', status]">
    <slot />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'

const getStatusDefault = (value: number): string => {
  if (value > 0) return 'success'
  if (value < -5) return 'error'
  if (value < -1) return 'warning'
  return ''
}

@Component
export default class ValueStatusWrapper extends Vue {
  @Prop({ default: '', type: [String, Number] }) readonly value!: string | number
  @Prop({ default: getStatusDefault, type: Function }) readonly getStatus!: (value: number) => string

  get formatted (): number {
    const value = Number(this.value)

    return Number.isFinite(value) ? value : 0
  }

  get status (): string {
    return this.getStatus(this.formatted)
  }
}
</script>

<style lang="scss" scoped>
.value-status-wrapper {
  display: flex;
  flex-flow: row nowrap;

  &.success {
    color: var(--s-color-status-success);
  }
  &.warning {
    color: var(--s-color-status-warning);
  }
  &.error {
    color: var(--s-color-status-error);
  }
}
</style>
