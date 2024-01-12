<template>
  <dialog-base class="popup" :visible.sync="isVisible">
    <div class="popup-mobile">
      <div class="popup-info">
        <h3 class="popup-info__headline" v-html="t('mobilePopup.header', { polkaswapHighlight })" />
        <p class="popup-info__text">
          {{ t('mobilePopup.info') }}
        </p>
        <div>
          <a :href="StoreLinks.AppStore" target="_blank" rel="nofollow noopener" tabindex="-1">
            <s-button class="logo logo__app-store">App Store</s-button>
          </a>
          <a :href="StoreLinks.GooglePlay" target="_blank" rel="nofollow noopener" tabindex="-1">
            <s-button class="logo logo__google-play">Google Play</s-button>
          </a>
        </div>
      </div>
      <div class="popup-app">
        <img src="@/assets/img/mobile/sora-app-left.png?inline" alt="mobile-left" class="popup-app__left-image" />
        <img src="@/assets/img/mobile/qr-code.svg?inline" alt="qr-code" class="popup-app__qr-code" />
        <img src="@/assets/img/mobile/sora-app-right.png?inline" alt="mobile-right" class="popup-app__right-image" />
      </div>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { StoreLinks, app } from '@/consts';

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class AppMobilePopup extends Mixins(mixins.DialogMixin, TranslationMixin) {
  @Prop({ type: String }) readonly fee!: string;

  StoreLinks = StoreLinks;

  get polkaswapHighlight(): string {
    return `<span class="popup-info__headline--highlight">${app.name}</span>`;
  }

  handleConfirm(): void {
    this.closeDialog();
    this.$emit('confirm');
  }
}
</script>

<style lang="scss">
.popup .el-dialog {
  max-width: 660px !important;
  margin-top: 22vh !important;
}

.popup-info {
  &__headline {
    margin-bottom: $basic-spacing;
    font-weight: 500;
    text-transform: unset;
    &--highlight {
      color: var(--s-color-theme-accent);
    }
  }

  &__text {
    margin-bottom: $basic-spacing;
  }
}
</style>

<style lang="scss" scoped>
.popup-mobile {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
}

@include mobile-app-logos;

.popup-app {
  display: flex;
  position: relative;
  &__qr-code {
    width: 244px;
    height: 244px;
    position: absolute;
    left: 20%;
    border-radius: 8%;
  }
  &__left-image {
    height: 320px;
    width: 200px;
    margin-top: -50px;
  }
  &__right-image {
    height: 260px;
    width: 150px;
    margin-left: -50px;
  }
}
</style>
