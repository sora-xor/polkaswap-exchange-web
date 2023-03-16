<template>
  <div :class="classes">
    <s-icon class="price-change-arrow" :name="icon" size="14px" />
    <formatted-amount :value="formatted" :font-weight-rate="FontWeightRate.MEDIUM">%</formatted-amount>
  </div>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { Component, Prop, Vue } from 'vue-property-decorator';
import { components, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
  },
})
export default class PriceChange extends Vue {
  @Prop({ default: FPNumber.ZERO, type: Object }) readonly value!: FPNumber;

  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;

  get increased(): boolean {
    return FPNumber.gte(this.value, FPNumber.ZERO);
  }

  get icon(): string {
    return `arrows-arrow-bold-${this.increased ? 'top' : 'bottom'}-24`;
  }

  get classes(): Array<string> {
    const baseClass = 'price-change';
    const cssClasses: Array<string> = [baseClass];
    if (this.increased) {
      cssClasses.push(`${baseClass}--increased`);
    }
    return cssClasses;
  }

  get formatted(): string {
    const value = this.increased ? this.value : this.value.mul(new FPNumber(-1));
    const number = value.toFixed(2);

    return new FPNumber(number).toLocaleString();
  }
}
</script>

<style lang="scss" scoped>
.price-change {
  display: inline-flex;
  align-items: baseline;
  color: var(--s-color-theme-accent);
  font-size: var(--s-font-size-medium);
  font-weight: 600;
  line-height: var(--s-line-height-medium);

  &--increased {
    color: var(--s-color-theme-secondary-hover);
  }

  &-arrow {
    color: inherit;
  }
}
</style>
