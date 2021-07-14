<template>
  <span class="formatted-amount">
    <span class="formatted-amount__integer">{{ formatted.integer }}</span>
    <span class="formatted-amount__decimals">
      <slot :decimal="formatted.decimal">{{ formatted.decimal }}</slot>
    </span>
  </span>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { FPNumber } from '@sora-substrate/util'

interface FormattedAmountValues {
  integer: string;
  decimal: string;
}

@Component
export default class FormattedAmount extends Vue {
  @Prop({ default: '', type: String }) value!: string

  get formatted (): FormattedAmountValues {
    const [int, decimal] = this.value.split(FPNumber.DELIMITERS_CONFIG.decimal)

    const integer = decimal ? int + FPNumber.DELIMITERS_CONFIG.decimal : int

    return {
      integer,
      decimal
    }
  }
}
</script>

<style lang="scss" scoped>
.formatted-amount {
  &__decimals {
    font-size: 0.875em;
  }
}
</style>
