<template>
  <s-row v-if="poolAsset" flex align="middle">
    <pair-token-logo
      v-if="isFarm && baseAsset"
      key="pair"
      :first-token="baseAsset"
      :second-token="poolAsset"
      class="dialog-title-logo"
    />
    <token-logo v-else key="token" :token="poolAsset" class="dialog-title-logo" />
    <span class="dialog-title-text">
      <template v-if="isFarm">{{ baseAsset.symbol }}-</template>{{ poolAsset.symbol }}
    </span>
  </s-row>
</template>

<script lang="ts">
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import { Components } from '@/consts';
import type { DemeterAsset } from '@/modules/demeterFarming/types';
import { lazyComponent } from '@/router';

@Component({
  components: {
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    TokenLogo: components.TokenLogo,
  },
})
export default class DialogTitle extends Mixins() {
  @Prop({ default: () => null, type: Object }) readonly baseAsset!: DemeterAsset;
  @Prop({ default: () => null, type: Object }) readonly poolAsset!: DemeterAsset;
  @Prop({ default: false, type: Boolean }) readonly isFarm!: DemeterAsset;
}
</script>

<style lang="scss" scoped>
.dialog-title {
  &-text {
    font-size: var(--s-heading2-font-size);
    font-weight: 800;
  }
  &-logo {
    margin-right: $inner-spacing-mini;
  }
}
</style>
