<template>
  <wallet-base v-loading="loading" :title="title" :show-back="true" @back="handleBack" class="sora-card">
    <terms-and-conditions v-if="step === KycProcess.TermsAndConditions" @confirm-tos="confirmToS" />
    <road-map v-else-if="step === KycProcess.RoadMap" @confirm-start-kyc="confirmProcess" :userApplied="userApplied" />
    <kyc-view v-else-if="step === KycProcess.KycView" @confirm-kyc="redirectToView" />
  </wallet-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import TranslationMixin from '../mixins/TranslationMixin';

enum KycProcess {
  TermsAndConditions,
  RoadMap,
  KycView,
}

@Component({
  components: {
    WalletBase: components.WalletBase,
    TermsAndConditions: lazyComponent(Components.TermsAndConditions),
    RoadMap: lazyComponent(Components.RoadMap),
    KycView: lazyComponent(Components.KycView),
  },
})
export default class SoraCardKYC extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @Prop({ default: false, type: Boolean }) readonly userApplied!: boolean;

  step: KycProcess = KycProcess.TermsAndConditions;

  KycProcess = KycProcess;

  handleBack(): void {
    if (this.step === KycProcess.TermsAndConditions) {
      this.$emit('go-to-start');
      return;
    }

    if (this.step === KycProcess.RoadMap) {
      this.step = KycProcess.TermsAndConditions;
      return;
    }

    if (this.step === KycProcess.KycView) {
      this.step = KycProcess.RoadMap;
    }
  }

  get title(): string {
    switch (this.step) {
      case KycProcess.TermsAndConditions:
        return 'Terms & Conditions';
      case KycProcess.RoadMap:
        return 'Complete KYC';
      case KycProcess.KycView:
        return 'Complete KYC';
      default:
        return '';
    }
  }

  confirmToS(): void {
    this.step = KycProcess.RoadMap;
  }

  confirmProcess(startKyc: boolean): void {
    if (startKyc) {
      this.step = KycProcess.KycView;
      return;
    }

    const withoutCheck = true;
    this.$emit('go-to-start', withoutCheck);
  }

  redirectToView(success: boolean): void {
    success ? this.$emit('go-to-start', success) : (this.step = KycProcess.RoadMap);
  }

  mounted(): void {
    if (this.userApplied) {
      this.step = KycProcess.RoadMap;
    }
  }
}
</script>

<style lang="scss" scoped>
.el-card {
  margin: var(--s-size-mini) auto 0;
}
</style>
