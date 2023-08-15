<template>
  <div>
    <div class="sora-card container sora-card-hub" v-loading="loading">
      <h3 class="sora-card-hub-title">SORA Card</h3>
      <s-image src="card/sora-card-front.png" lazy fit="cover" draggable="false" class="unselectable" />
      <p class="sora-card-hub-text">Card management coming soon</p>
      <div class="sora-card-hub-options">
        <s-button v-for="option in options" :key="option.icon" type="tertiary" @click="handleClick">
          <component :is="option.icon" />
          {{ option.text }}
        </s-button>
      </div>
    </div>

    <div class="sora-card container" v-loading="loading">
      <span>Account information</span>
    </div>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import ExchangeIcon from '@/assets/img/sora-card/hub/exchange.svg?inline';
import FreezeIcon from '@/assets/img/sora-card/hub/freeze.svg?inline';
import TopUpIcon from '@/assets/img/sora-card/hub/topup.svg?inline';
import TransferIcon from '@/assets/img/sora-card/hub/transfer.svg?inline';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { action, getter, mutation, state } from '@/store/decorators';
import { VerificationStatus } from '@/types/card';
import { clearPayWingsKeysFromLocalStorage } from '@/utils/card';

enum OptionsIcon {
  TopUp = 'TopUpIcon',
  Transfer = 'TransferIcon',
  Freeze = 'FreezeIcon',
  Exchange = 'ExchangeIcon',
}

type Options = { icon: OptionsIcon; text: string };

@Component({
  components: {
    TopUpIcon,
    TransferIcon,
    FreezeIcon,
    ExchangeIcon,
  },
})
export default class Dashboard extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  readonly options: Array<Options> = [
    { icon: OptionsIcon.TopUp, text: 'Top Up' },
    { icon: OptionsIcon.Transfer, text: 'Transfer' },
    { icon: OptionsIcon.Freeze, text: 'Freeze' },
    { icon: OptionsIcon.Exchange, text: 'Exchange' },
  ];

  handleClick(): void {}
}
</script>

<style lang="scss" scoped>
.sora-card {
}
</style>
