<template>
  <wallet-base :title="title" :show-back="true" @back="handleBack" class="sora-card">
    <terms-and-conditions v-if="step === KycProcess.TermsAndConditions" @confirm-tos="confirmToS" />
    <road-map v-else-if="step === KycProcess.RoadMap" @confirm-start="confirmProcess" />
    <sms-code v-else-if="step === KycProcess.ConfirmPhone" @confirm-sms="confirmSendSms" :accessToken="accessToken" />
    <email v-else-if="step === KycProcess.ConfirmEmail" />
  </wallet-base>
</template>

<script lang="ts">
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';
import TranslationMixin from '../mixins/TranslationMixin';

enum KycProcess {
  TermsAndConditions,
  RoadMap,
  ConfirmPhone,
  ConfirmEmail,
}

@Component({
  components: {
    WalletBase: components.WalletBase,
    TermsAndConditions: lazyComponent(Components.TermsAndConditions),
    RoadMap: lazyComponent(Components.RoadMap),
    SmsCode: lazyComponent(Components.SmsCode),
    Email: lazyComponent(Components.Email),
  },
})
export default class SoraCardKYC extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  step: KycProcess = KycProcess.TermsAndConditions;
  accessToken = '';

  KycProcess = KycProcess;

  handleBack(): void {
    if (this.step === KycProcess.TermsAndConditions) {
      this.$emit('go-to-intro');
      return;
    }

    if (this.step === KycProcess.RoadMap) {
      this.step = KycProcess.TermsAndConditions;
      return;
    }

    if (this.step === KycProcess.ConfirmPhone) {
      this.step = KycProcess.RoadMap;
      return;
    }

    if (this.step === KycProcess.ConfirmEmail) {
      this.step = KycProcess.ConfirmPhone;
    }
  }

  get title(): string {
    switch (this.step) {
      case KycProcess.TermsAndConditions:
        return 'Terms & Conditions';
      case KycProcess.RoadMap:
        return 'Complete KYC';
      case KycProcess.ConfirmPhone:
        return 'Verify your phone number';
      case KycProcess.ConfirmEmail:
        return 'Verify your email';
      default:
        return '';
    }
  }

  confirmToS(): void {
    this.step = KycProcess.RoadMap;
  }

  confirmProcess(accessToken: string): void {
    this.accessToken = accessToken;
    this.step = KycProcess.ConfirmPhone;
  }

  confirmSendSms(): void {
    this.step = KycProcess.ConfirmEmail;
  }
}
</script>

<style lang="scss" scoped>
.el-card {
  margin: 24px auto 0;
}
</style>
