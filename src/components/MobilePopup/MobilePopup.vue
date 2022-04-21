<template>
  <dialog-base class="popup" :visible.sync="isVisible">
    <div class="popup-mobile">
      <div class="popup-info">
        <h3 class="popup-info__headline" v-html="t('mobilePopup.header')" />
        <p class="popup-info__text">
          {{ t('mobilePopup.info') }}
        </p>
        <div>
          <a :href="StoreLinks.AppStore" target="_blank" rel="nofollow noopener">
            <s-button class="logo logo__app-store">App Store</s-button>
          </a>
          <a :href="StoreLinks.GooglePlay" target="_blank" rel="nofollow noopener">
            <s-button class="logo logo__google-play">Google Play</s-button>
          </a>
        </div>
      </div>
      <div class="popup-app">
        <left-image />
        <div class="popup-app__left-image"></div>
        <div class="popup-app__link">
          <div class="popup-app__qr-code"></div>
        </div>
        <div class="popup-app__right-image"></div>
      </div>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import DialogBase from '../DialogBase.vue';
import DialogMixin from '../mixins/DialogMixin';
import TranslationMixin from '../mixins/TranslationMixin';
import { StoreLinks } from '../../consts';

import LeftImage from '@/assets/img/mobile/sora-app-left.svg?inline';

@Component({
  components: {
    DialogBase,
    LeftImage,
  },
})
export default class MobilePopup extends Mixins(DialogMixin, TranslationMixin) {
  @Prop({ type: String }) readonly fee!: string;

  StoreLinks = StoreLinks;

  handleConfirm(): void {
    this.closeDialog();
    this.$emit('confirm');
  }
}
</script>

<style lang="scss">
.popup .el-dialog {
  max-width: 660px;
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

.logo {
  font-size: 12px;

  &__app-store {
    background: url('@/assets/img/mobile/app-store-logo.svg') no-repeat !important;
    background-position: 10% center !important;
    background-size: 12px !important;
    color: var(--s-color-base-content-secondary) !important;
    width: 110px;
    height: var(--s-size-small) !important;
    margin-right: $inner-spacing-mini;
    padding-left: 30px !important;
  }

  &__google-play {
    background: url('@/assets/img/mobile/google-play-logo.svg') no-repeat !important;
    background-position: 10% center !important;
    background-size: 12px !important;
    color: var(--s-color-base-content-secondary) !important;
    width: 128px;
    padding-left: 30px !important;
    height: var(--s-size-small) !important;
  }
}

.popup-app {
  display: flex;
  position: relative;
  &__link {
    background-color: white;
    width: 105px;
    height: 105px;
    position: absolute;
    border-radius: 10%;
    box-shadow: -2px -2px 2px #ffffff, 1px 1px 10px rgba(0, 0, 0, 0.1), inset 1px 1px 2px rgba(255, 255, 255, 0.8);
    top: 15%;
    left: 40%;
  }
  &__qr-code {
    background: url('@/assets/img/mobile/qr_code_to_store.svg') no-repeat;
    margin: auto;
    height: 30px;
    width: 30px;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: scale(3) translate(-13.5%, -12%);
  }
  &__left-image {
    background: url('@/assets/img/mobile/sora-app-left.svg') no-repeat;
    height: 320px;
    width: 200px;
    margin-top: -50px;
  }
  &__right-image {
    background: url('@/assets/img/mobile/sora-app-right.svg') no-repeat;
    height: 260px;
    width: 150px;
    margin-left: -50px;
  }
}
</style>
