<template>
  <div class="ad">
    <card v-if="showSoraCardAd" @click="goTo(PageNames.SoraCard)" />
    <xst v-if="showXstArticle" @click="openArticle" />
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import Card from '@/assets/img/ads/card.svg?inline';
import Xst from '@/assets/img/ads/xst.svg?inline';
import { PageNames } from '@/consts';
import { goTo } from '@/router';
import { getter } from '@/store/decorators';

const ADS = {
  card: true,
  xst: true,
};

@Component({
  components: {
    Card,
    Xst,
  },
})
export default class AppAd extends Mixins(mixins.TranslationMixin) {
  @getter.settings.soraCardEnabled soraCardEnabled!: Nullable<boolean>;

  goTo = goTo;
  PageNames = PageNames;

  @Watch('soraCardEnabled', { immediate: true })
  private checkCardAvailability(value: Nullable<boolean>): void {
    this.chooseAdToShow();
  }

  showSoraCardAd = ADS.card;
  showXstArticle = ADS.xst;
  pageWasRendered = false;

  probability = () => Math.random();

  chooseAdToShow(): void {
    this.showSoraCardAd = false;
    this.showXstArticle = false;

    // TODO: add check if already applied for SORA Card
    if (ADS.card && this.soraCardEnabled) {
      // 20% chance to show SORA Card ad
      if (this.probability() > 0.8) {
        this.showSoraCardAd = true;
        return;
      }
    }

    if (ADS.xst && this.pageWasRendered) {
      // 25% chance to show XST ad
      if (this.probability() > 0.75) {
        this.showXstArticle = true;
      }
    }

    // To avoid quick show and disappearance of the banner when being rendered
    this.pageWasRendered = true;
  }

  openArticle(): void {
    window.open('https://medium.com/sora-xor/xst-a-platform-for-synthetic-assets-on-sora-b45ca526d8d5', '_blank');
  }
}
</script>

<style lang="scss" scoped>
.ad {
  &:hover {
    cursor: pointer;
  }
}
</style>
