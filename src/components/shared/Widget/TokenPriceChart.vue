<template>
  <price-chart-widget v-bind="$attrs" :base-asset="selectedToken" is-available class="token-price-chart">
    <template v-if="!predefinedToken" #types>
      <token-select-button
        :icon="selectTokenIcon"
        :token="selectedToken"
        :tabindex="tokenTabIndex"
        @click.stop="handleSelectToken"
      />
      <select-token
        disabled-custom
        :visible.sync="showSelectTokenDialog"
        :append-to-body="false"
        :asset="selectedToken"
        @select="changeToken"
      />
    </template>
  </price-chart-widget>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import WithTokenSelectMixin from '@/components/mixins/Widget/WithTokenSelect';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';

@Component({
  components: {
    PriceChartWidget: lazyComponent(Components.PriceChartWidget),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    SelectToken: lazyComponent(Components.SelectToken),
  },
})
export default class TokenPriceChartWidget extends Mixins(WithTokenSelectMixin) {}
</script>
