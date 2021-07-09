<template>
  <span class="formatted-amount">
    <span class="formatted-amount__integer">{{ formatted.main }}</span>
    <span class="formatted-amount__decimals">{{ formatted.other }} {{ currency }}</span>
  </span>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { FPNumber } from '@sora-substrate/util'

interface FormattedAmountValues {
  main: string;
  other: string;
}

@Component
export default class FormattedAmount extends Vue {
  @Prop({ default: '', type: String }) value!: string
  @Prop({ default: '', type: String }) currency!: string

  get formatted (): FormattedAmountValues {
    const [int, other] = this.value.split(FPNumber.DELIMITERS_CONFIG.decimal)

    const main = other ? int + FPNumber.DELIMITERS_CONFIG.decimal : int

    return {
      main,
      other
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
