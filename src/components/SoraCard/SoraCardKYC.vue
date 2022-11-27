<template>
  <wallet-base v-loading="loading" :title="title" :show-back="showBack" @back="handleBack" class="sora-card">
    <terms-and-conditions v-if="step === KycProcess.TermsAndConditions" @confirm-tos="confirmToS" />
    <road-map v-else-if="step === KycProcess.RoadMap" @confirm-start="confirmProcess" />
    <kyc-view v-else-if="step === KycProcess.KycView" @confirm-kyc="confirmWindow" :accessToken="accessToken" />
    <confirmation-info v-else-if="step === KycProcess.ConfirmationInfo" />
  </wallet-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import TranslationMixin from '../mixins/TranslationMixin';

enum KycProcess {
  TermsAndConditions,
  RoadMap,
  KycView,
  ConfirmationInfo,
}

@Component({
  components: {
    WalletBase: components.WalletBase,
    TermsAndConditions: lazyComponent(Components.TermsAndConditions),
    RoadMap: lazyComponent(Components.RoadMap),
    KycView: lazyComponent(Components.KycView),
    ConfirmationInfo: lazyComponent(Components.ConfirmationInfo),
  },
})
export default class SoraCardKYC extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  step: KycProcess = KycProcess.TermsAndConditions;
  accessToken = '';
  isUserPassedKyc = false;

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

    if (this.step === KycProcess.KycView) {
      this.step = KycProcess.RoadMap;
      return;
    }

    if (this.step === KycProcess.ConfirmationInfo) {
      this.step = KycProcess.KycView;
    }
  }

  get showBack(): boolean {
    if (this.step === KycProcess.ConfirmationInfo) return false;
    return true;
  }

  get title(): string {
    switch (this.step) {
      case KycProcess.TermsAndConditions:
        return 'Terms & Conditions';
      case KycProcess.RoadMap:
        return 'Complete KYC';
      case KycProcess.KycView:
        return 'Complete KYC';
      case KycProcess.ConfirmationInfo:
        return '';
      default:
        return '';
    }
  }

  confirmToS(): void {
    if (sessionStorage.getItem('access-token')) {
      this.step = KycProcess.KycView;
    }
    this.step = KycProcess.RoadMap;
  }

  confirmProcess(accessToken: string): void {
    this.accessToken = accessToken;
    this.step = KycProcess.KycView;
  }

  confirmWindow(value: boolean): void {
    console.log('value', value);
    value ? (this.step = KycProcess.ConfirmationInfo) : (this.step = KycProcess.RoadMap);
  }

  mounted(): void {
    if (this.isUserPassedKyc) {
      this.step = KycProcess.KycView; // Write logic to redirect to confirmation window
    }
  }
}
</script>

<style lang="scss" scoped>
.el-card {
  margin: 24px auto 0;
}
</style>
