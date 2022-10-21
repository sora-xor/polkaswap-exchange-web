<template>
  <div class="sora-card">
    <div class="sora-card__no-spam">No spam! Only to secure your account</div>
    <s-input placeholder="Email" v-model="email" :disabled="loading"></s-input>
    <p class="sora-card__input-description">Follow the magic link that has been sent to your email</p>
    <s-icon v-if="isEmailSent" name="basic-check-mark-24" size="16px" />
    <s-button
      type="primary"
      :disabled="true"
      class="sora-card__btn s-typography-button--large"
      @click="handleSendEmail"
    >
      {{ buttonText }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { mixins } from '@soramitsu/soraneo-wallet-web';

@Component
export default class SmsCode extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  email = '';

  handleSendEmail(): void {}

  get buttonText() {
    return 'ENTER THE VERIFICATION CODE';
  }

  get isEmailSent(): boolean {
    return true;
  }
}
</script>

<style lang="scss" scoped>
.sora-card {
  .s-icon-basic-check-mark-24 {
    color: var(--s-color-status-success);
  }

  .sora-card__input-description {
    display: inline-block;
  }
}
</style>
