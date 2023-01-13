<template>
  <div class="disclaimer">
    <div class="disclaimer__header">
      <div class="disclaimer__title">Disclaimer</div>
      <div class="disclaimer__close-btn">X</div>
    </div>
    <div class="disclaimer__text">
      Disclaimer: This website is maintained by the SORA community. Before continuing to use this website, please review
      the Polkaswap FAQ and documentation, which includes a detailed explanation on how Polkaswap works, as well as the
      Polkaswap Memorandum and Terms of Services, and Privacy Policy. These documents are crucial to a secure and
      positive user experience. By using Polkaswap, you acknowledge that you have read and understand these documents.
      You also acknowledge the following: 1) your sole responsibility for compliance with all laws that may apply to
      your particular use of Polkaswap in your legal jurisdiction; 2) your understanding that the current version of
      Polkaswap is an alpha version: it has not been fully tested, and some functions may not perform as designed; and
      3) your understanding and voluntary acceptance of the risks involved in using Polkaswap, including, but not
      limited to, the risk of losing tokens. Once more, please do not continue without reading the FAQ, Polkaswap
      Memorandum and Terms of Services, and Privacy Policy.
    </div>
    <s-button
      v-if="showAcceptBtn"
      :loading="loadingAcceptBtn"
      type="primary"
      @click="handleAccept"
      class="disclaimer__accept-btn"
    >
      Accept
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { delay } from '@/utils';

@Component
export default class Disclaimer extends Mixins(TranslationMixin) {
  loadingAcceptBtn = false;
  showAcceptBtn = true;

  async handleAccept(): Promise<void> {
    this.loadingAcceptBtn = true;
    await delay(1500);
    this.showAcceptBtn = false;
  }
}
</script>

<style lang="scss" scoped>
.disclaimer {
  background-color: var(--s-color-utility-surface);
  border-radius: var(--s-border-radius-medium);
  box-shadow: -10px -10px 30px rgba(255, 255, 255, 0.9), 20px 20px 60px rgba(0, 0, 0, 0.1), inset 1px 1px 10px #ffffff;
  width: 25%;
  padding: 16px;
  position: absolute;
  top: 24px;
  right: 0;

  &__title {
    font-weight: 600;
    font-size: 16px;
    margin-bottom: 16px;
  }

  &__text {
    box-shadow: 1px 1px 5px #ffffff, inset -5px -5px 5px rgba(255, 255, 255, 0.5), inset 1px 1px 10px rgba(0, 0, 0, 0.1);
    border-radius: var(--s-border-radius-medium);
    background-color: #f4f0f1;
    padding: 16px;
  }

  &__accept-btn {
    margin-top: 16px;
    width: 100%;
  }

  &__close-btn {
    position: absolute;
    top: 0;
    right: 0;
  }
}
</style>
