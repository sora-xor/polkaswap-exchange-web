<template>
  <div class="regular-guideline">
    <span>Create your token (or its available variations: NFT and SBT)</span>
    <p>Launch your unique token efficiently and securely using the established infrastructure of the SORA Network.</p>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Mixins } from 'vue-property-decorator';

export default class RegularGuide extends Mixins(mixins.TranslationMixin) {}
</script>

<style lang="scss">
.regular-guideline {
  min-height: 372px;

  span {
    display: flex;
    font-size: 15px;
    padding-top: 50px;
    text-align: center;
  }

  p {
    font-size: var(--s-font-size-medium);
    text-align: center;
    margin-top: 100px;
  }
}
</style>
