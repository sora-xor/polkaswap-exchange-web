<template>
  <div class="price-change" :style="fontColor">
    <s-icon class="price-change-arrow" :name="icon" size="14px" />
    <formatted-amount :value="formatted" :font-weight-rate="FontWeightRate.MEDIUM">%</formatted-amount>
  </div>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { components, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop, Vue } from 'vue-property-decorator';

import { toPrecision } from '@/utils';

import ThemePaletteMixin from '../mixins/ThemePaletteMixin';

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
  },
})
export default class PriceChange extends Mixins(ThemePaletteMixin) {
  @Prop({ default: FPNumber.ZERO, type: Object })
  readonly value!: FPNumber;

  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;

  get increased(): boolean {
    return FPNumber.gte(this.value, FPNumber.ZERO);
  }

  get icon(): string {
    return `arrows-arrow-bold-${this.increased ? 'top' : 'bottom'}-24`;
  }

  get formatted(): string {
    const value = this.increased ? this.value : this.value.mul(new FPNumber(-1));
    const number = toPrecision(value, 2);

    return number.toLocaleString();
  }

  get fontColor(): string {
    const theme = this.getColorPalette();
    const color = this.isInversed(this.increased) ? theme.priceChange?.up : theme.priceChange?.down;

    return `color: ${color}`;
  }
}
</script>

<style lang="scss" scoped>
.price-change {
  display: inline-flex;
  align-items: baseline;
  font-size: inherit;
  font-weight: 600;
  line-height: var(--s-line-height-medium);

  &-arrow {
    color: inherit;
  }
}
</style>
