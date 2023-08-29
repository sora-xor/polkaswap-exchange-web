<template>
  <div class="ad">
    <img
      v-if="showSoraCardAd"
      src="@/assets/img/ads/card.svg?inline"
      alt="soracard"
      @click="goTo(PageNames.SoraCard)"
    />
    <img v-if="showXstArticle" src="@/assets/img/ads/xst.svg?inline" alt="xst platform" @click="openArticle" />
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import { Links, PageNames } from '@/consts';
import { goTo } from '@/router';
import { action, getter } from '@/store/decorators';
import { VerificationStatus } from '@/types/card';

const ADS = {
  card: true,
  xst: true,
};

@Component
export default class AppAd extends Mixins(mixins.TranslationMixin) {
  @getter.settings.soraCardEnabled soraCardEnabled!: Nullable<boolean>;
  @getter.soraCard.currentStatus currentStatus!: VerificationStatus;

  @action.soraCard.getUserStatus private getUserStatus!: AsyncFnWithoutArgs;

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

  async chooseAdToShow(): Promise<void> {
    this.showSoraCardAd = false;
    this.showXstArticle = false;

    await this.getUserStatus();

    if (ADS.card && this.soraCardEnabled && !this.currentStatus) {
      // 20% chance to show SORA Card ad
      if (this.probability() > 0.8) {
        this.showSoraCardAd = true;
        return;
      }
    }

    if (ADS.xst && this.pageWasRendered) {
      // 35% chance to show XST ad
      if (this.probability() > 0.65) {
        this.showXstArticle = true;
      }
    }

    // To avoid quick show and disappearance of the banner when being rendered
    this.pageWasRendered = true;
  }

  openArticle(): void {
    window.open(Links.xstArticle, '_blank');
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
