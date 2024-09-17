<template>
  <div class="regular-guideline">
    <s-image lazy fit="cover" draggable="false" :src="createImg" />
    <h3 class="regular-guideline__title">Create your token</h3>
    <p class="regular-guideline__desc">
      Easily launch your unique token—available in multiple formats like NFTs and SBTs—using the robust, secure
      infrastructure of the SORA Network
    </p>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Mixins } from 'vue-property-decorator';

export default class RegularGuide extends Mixins(mixins.TranslationMixin) {
  get createImg(): string {
    return `/asset-owner/token-creation.png`;
  }
}
</script>

<style lang="scss">
.regular-guideline {
  &__title {
    text-align: center;
    margin-bottom: $basic-spacing;
    font-weight: 500;
  }

  &__desc {
    text-align: center;
    font-size: var(--s-font-size-medium);
    color: var(--s-color-base-content-secondary);
    margin-bottom: var(--s-size-small);
  }
}
</style>
