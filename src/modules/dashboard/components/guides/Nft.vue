<template>
  <div>
    <h4 class="sbt-title">How to create an NFT:</h4>
    <div class="sbt-instructions">
      <div class="sbt-instructions__text-info">
        <div class="sbt-instructions__section">
          <span class="sbt-instructions__number">1</span>
          <div class="text">
            <h4 class="sbt-instructions__point">{{ 'Prepare image or IPFS link' }}</h4>
            <span class="sbt-instructions__point-desc">{{
              'Choose image from your local computer or provide link from IPFS storage solution.'
            }}</span>
            <div class="line" />
          </div>
        </div>
        <div class="sbt-instructions__section">
          <span class="sbt-instructions__number">2</span>
          <div class="text">
            <h4 class="sbt-instructions__point">{{ 'Enter NFT Details' }}</h4>
            <span class="sbt-instructions__point-desc">{{
              "Provide essential information such as the NFT's name and ticker symbol, as well as the image"
            }}</span>
            <div class="line" />
          </div>
        </div>
        <div class="sbt-instructions__section">
          <span class="sbt-instructions__number">3</span>
          <div class="text">
            <h4 class="sbt-instructions__point">{{ 'Review and sign the transaction' }}</h4>
            <span class="sbt-instructions__point-desc">{{
              'Review and sign the final creation transaction to complete the SBT setup.'
            }}</span>
            <div class="line" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Mixins } from 'vue-property-decorator';

export default class NftGuide extends Mixins(mixins.TranslationMixin) {}
</script>
