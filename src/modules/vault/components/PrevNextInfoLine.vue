<template>
  <info-line class="prev-next-info-line" :label="label" :label-tooltip="tooltip">
    <formatted-amount
      class="prev"
      :value="prev"
      :asset-symbol="firstSymbol"
      :font-size-rate="fontSize"
      :font-weight-rate="fontWeight"
    />
    <span class="divider">→</span>
    <formatted-amount
      class="next"
      :value="next"
      :asset-symbol="symbol"
      :font-size-rate="fontSize"
      :font-weight-rate="fontWeight"
    />
  </info-line>
</template>

<script lang="ts">
import { components, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
    InfoLine: components.InfoLine,
  },
})
export default class PrevNextInfoLine extends Vue {
  readonly fontSize = WALLET_CONSTS.FontSizeRate.MEDIUM;
  readonly fontWeight = WALLET_CONSTS.FontWeightRate.SMALL;

  @Prop({ default: '0', type: String }) readonly prev!: string;
  @Prop({ default: '0', type: String }) readonly next!: string;
  @Prop({ default: '', type: String }) readonly symbol!: string;
  @Prop({ default: '', type: String }) readonly label!: string;
  @Prop({ default: '', type: String }) readonly tooltip!: string;

  get isPercentSymbol(): boolean {
    return this.symbol === '%';
  }

  get firstSymbol(): string {
    if (this.isPercentSymbol) return this.symbol;
    return '';
  }
}
</script>

<style lang="scss" scoped>
.divider {
  margin: 0 4px;
  font-weight: 600;
}
</style>
