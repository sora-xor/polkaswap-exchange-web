<template>
  <div class="ad">
    <div v-if="showSoraCardAd" class="ad-sora-card" @click="goTo(PageNames.SoraCard)">
      <span class="ad-call-to-action">
        {{ 'Get SORA Card' }}
      </span>
      <sora-card-banner />
    </div>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import SoraCardBanner from '@/assets/img/ads/soracard1.svg?inline';
import { PageNames } from '@/consts';
import { goTo } from '@/router';
import { getter } from '@/store/decorators';

@Component({
  components: {
    SoraCardBanner,
  },
})
export default class AppAd extends Mixins(mixins.TranslationMixin) {
  @getter.settings.soraCardEnabled soraCardEnabled!: Nullable<boolean>;

  goTo = goTo;
  PageNames = PageNames;

  @Watch('soraCardEnabled', { immediate: true })
  private checkAvailability(value: Nullable<boolean>): void {
    this.chooseAdToShow();
  }

  showSoraCardAd = false;

  chooseAdToShow(): void {
    // TODO: add check if already applied for SORA Card
    if (this.soraCardEnabled) {
      const probabilityToShowAd = Math.random();

      // 50% chance that message pops up
      if (probabilityToShowAd < 0.5) {
        this.showSoraCardAd = true;
      }
    }
  }
}
</script>

<style lang="scss">
.ad {
  &-call-to-action {
    position: absolute;
    color: #fff;
    font-weight: 700;
    position: absolute;
    width: 151px;
    height: 27px;
    left: 4%;
    top: calc(50% - 27px / 2);
    font-style: normal;
    font-weight: 600;
    font-size: 18px;
    line-height: 150%;
    text-align: center;
    letter-spacing: -0.02em;
    text-transform: uppercase;
  }

  &:hover {
    cursor: pointer;
  }
}
</style>
