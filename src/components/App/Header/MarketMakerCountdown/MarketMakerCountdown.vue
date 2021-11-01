<template>
  <countdown v-if="accountMarketMakerInfo" unit="MM" :total="total" :count="accountMarketMakerInfo.count" />
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { Getter, Action, State } from 'vuex-class';

import Countdown from './Countdown.vue';

import type { AccountMarketMakerInfo } from '@sora-substrate/util';

@Component({
  components: {
    Countdown,
  },
})
export default class MarketMakerCountdown extends Mixins() {
  @Action('subscribeOnAccountMarketMakerInfo', { namespace: 'rewards' })
  subscribeOnAccountMarketMakerInfo!: AsyncVoidFn;

  @Action('unsubscribeAccountMarketMakerInfo', { namespace: 'rewards' })
  unsubscribeAccountMarketMakerInfo!: AsyncVoidFn;

  @Getter isLoggedIn!: boolean;
  @Getter nodeIsConnected!: boolean;

  @State((state) => state.rewards.accountMarketMakerInfo) accountMarketMakerInfo!: Nullable<AccountMarketMakerInfo>;

  @Watch('isLoggedIn')
  @Watch('nodeIsConnected')
  private async updateSubscriptions(value: boolean) {
    if (value) {
      await this.subscribeOnAccountMarketMakerInfo();
    } else {
      await this.unsubscribeAccountMarketMakerInfo();
    }
  }

  readonly total = 500;
}
</script>
