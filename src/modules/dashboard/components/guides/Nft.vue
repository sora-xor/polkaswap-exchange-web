<template>
  <div>
    <h4 class="sbt-title">How to create an NFT:</h4>
    <div class="sbt-instructions">
      <div class="sbt-instructions__text-info">
        <div class="sbt-instructions__section" v-for="(text, idx) in guideText" :key="idx">
          <span class="sbt-instructions__number">{{ idx + 1 }}</span>
          <div class="text">
            <h4 class="sbt-instructions__point">{{ text.title }}</h4>
            <span class="sbt-instructions__point-desc">{{ text.desc }}</span>
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

export default class NftGuide extends Mixins(mixins.TranslationMixin) {
  get guideText(): any {
    // TODO: add to localise when storage available
    return [
      {
        title: 'Prepare image or IPFS link',
        desc: 'Choose image from your local computer or provide link from IPFS storage solution.',
      },
      {
        title: 'Enter NFT Details',
        desc: "Provide essential information such as the NFT's name and ticker symbol, as well as the image",
      },
      {
        title: 'Review and sign the transaction',
        desc: 'Review and sign the final creation transaction to complete the SBT setup.',
      },
    ];
  }
}
</script>
