<template>
  <div class="ad">
    <div v-if="showSoraCardAd" @click="goTo(PageNames.SoraCard)" class="ad-card-banner banner">
      <span class="ad-call-to-action">
        {{ 'Get SORA Card' }}
        <s-icon name="arrows-arrow-top-right-24" size="20" />
      </span>
      <card />
    </div>
    <div v-if="showXstArticle" @click="openArticle" class="ad-xst-banner banner">
      <span class="ad-call-to-action">
        {{ 'Learn of XST' }}
        <s-icon name="arrows-arrow-top-right-24" size="20" />
      </span>
      <xst />
    </div>
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

@Component({
  components: {
    Xst,
    Card,
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

  showSoraCardAd = false;
  showXstArticle = false;

  probability = () => Math.random();

  chooseAdToShow(): void {
    this.showSoraCardAd = false;
    this.showXstArticle = false;

    // TODO: add check if already applied for SORA Card
    if (this.soraCardEnabled) {
      // 20% chance to show SORA Card ad
      if (this.probability() > 0.5) {
        this.showSoraCardAd = true;
        return;
      }
    }

    // 10% chance to show XST ad
    if (this.probability() > 0.1) {
      this.showXstArticle = true;
    }
  }

  openArticle(): void {
    //
  }
}
</script>

<style lang="scss" scoped>
.ad {
  .banner {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 43px;
    border-radius: 32px;
  }
  &-card-banner {
    background: linear-gradient(89.07deg, #f8087b -45.39%, #ee2233 138.94%);
    box-shadow: -5px -5px 10px var(--s-color-base-on-accent), 1px 1px 10px rgba(0, 0, 0, 0.1),
      inset 1px 1px 2px rgba(255, 255, 255, 0.8);
  }

  &-xst-banner {
    background: linear-gradient(89.07deg, #f8087b -45.39%, #ff408c 138.94%);
  }

  &-call-to-action {
    color: #fff;
    font-weight: 600;
    font-size: 18px;
    margin-left: 16px;
    letter-spacing: -0.02em;
    text-transform: uppercase;
  }

  &:hover {
    cursor: pointer;
  }

  .s-icon-arrows-arrow-top-right-24 {
    position: relative;
    bottom: -2px;
    margin-left: 2px;
    margin-right: 14px;
    color: #fff;
  }
}
</style>
