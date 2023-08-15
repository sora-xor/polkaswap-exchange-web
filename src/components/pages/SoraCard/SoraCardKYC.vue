<template>
  <wallet-base
    v-loading="loading"
    :title="title"
    :show-back="showBackBtn"
    :title-center="true"
    @back="handleBack"
    class="sora-card"
  >
    <terms-and-conditions v-if="step === KycProcess.TermsAndConditions" @confirm="confirmToS" />
    <road-map v-else-if="step === KycProcess.RoadMap" @confirm="confirmSignIn" :userApplied="userApplied" />
    <phone v-else-if="step === KycProcess.Phone" @confirm="confirmPhone" :userApplied="userApplied" />
    <email v-else-if="step === KycProcess.Email" @confirm="confirmEmail" />
    <kyc-view v-else-if="step === KycProcess.KycView" @confirm-kyc="redirectToView" />
  </wallet-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';

enum KycProcess {
  TermsAndConditions,
  RoadMap,
  Phone,
  Email,
  KycView,
}

@Component({
  components: {
    WalletBase: components.WalletBase,
    TermsAndConditions: lazyComponent(Components.TermsAndConditions),
    RoadMap: lazyComponent(Components.RoadMap),
    Phone: lazyComponent(Components.Phone),
    Email: lazyComponent(Components.Email),
    KycView: lazyComponent(Components.KycView),
  },
})
export default class SoraCardKYC extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @Prop({ default: false, type: Boolean }) readonly userApplied!: boolean;
  @Prop({ default: false, type: Boolean }) readonly openKycForm!: boolean;

  step: KycProcess = KycProcess.TermsAndConditions;

  KycProcess = KycProcess;

  handleBack(): void {
    if (this.userApplied && this.step === KycProcess.RoadMap) {
      this.$emit('go-to-start');
      return;
    }

    if (this.step === KycProcess.TermsAndConditions) {
      this.$emit('go-to-start');
      return;
    }

    if (this.step === KycProcess.RoadMap) {
      this.step = KycProcess.TermsAndConditions;
      return;
    }

    if (this.step === KycProcess.Phone) {
      this.step = KycProcess.RoadMap;
      return;
    }

    if (this.step === KycProcess.Email) {
      this.step = KycProcess.Phone;
      return;
    }

    if (this.step === KycProcess.KycView) {
      this.step = KycProcess.RoadMap;
    }
  }

  get title(): string {
    switch (this.step) {
      case KycProcess.TermsAndConditions:
        return this.t('card.termsAndConditions');
      case KycProcess.RoadMap:
        return this.t('card.completeKYC');
      case KycProcess.Phone:
        return this.t('card.phoneConfirmation');
      case KycProcess.Email:
        return this.t('card.emailConfirmation');
      case KycProcess.KycView:
        return this.t('card.completeKYC');
      default:
        return '';
    }
  }

  get showBackBtn(): boolean {
    return !(this.step === KycProcess.KycView);
  }

  confirmToS(): void {
    this.step = KycProcess.RoadMap;
  }

  confirmSignIn(): void {
    this.step = KycProcess.Phone;
  }

  confirmPhone(state): void {
    if (state.startKyc) {
      this.step = KycProcess.KycView;
      return;
    }

    if (state.goToEmail) {
      this.step = KycProcess.Email;
      return;
    }

    if (state.showBanner) {
      this.$emit('go-to-start');
    }
  }

  confirmEmail(): void {
    this.step = KycProcess.KycView;
  }

  redirectToView(success: boolean): void {
    success ? this.$emit('go-to-start', success) : (this.step = KycProcess.RoadMap);
  }

  mounted(): void {
    if (this.userApplied) {
      this.step = KycProcess.RoadMap;
      return;
    }

    if (this.openKycForm) {
      this.step = KycProcess.KycView;
    }
  }
}
</script>

<style lang="scss" scoped>
.el-card {
  margin: var(--s-size-mini) auto 0;
}
.sora-card-kyc-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.post-disclaimer {
  color: var(--s-color-base-content-secondary);
  text-align: center;
  margin-top: 16px;
  font-size: 16px;
  width: 25%;
  line-height: 24px;
}
</style>

<style lang="scss">
.tos__disclaimer {
  width: 100%;
  background-color: var(--s-color-base-background);
  border-radius: var(--s-border-radius-small);
  box-shadow: var(--s-shadow-dialog);
  padding: 20px $basic-spacing;
  margin-bottom: $basic-spacing;
  position: relative;
  &-header {
    font-weight: 500;
    margin-bottom: 10px;
  }
  &-paragraph {
    color: var(--s-color-base-content-secondary);
    margin-bottom: calc(var(--s-basic-spacing) / 2);
  }
  &-warning.icon {
    position: absolute;
    background-color: #479aef;
    border: 2.25257px solid #f7f3f4;
    box-shadow: var(--s-shadow-element-pressed);
    top: 20px;
    right: 20px;
    border-radius: 50%;
    color: #fff;
    width: 46px;
    height: 46px;
    .s-icon-notifications-alert-triangle-24 {
      display: block;
      color: #fff;
      margin-top: 5px;
      margin-left: 7px;
    }
  }
  * {
    width: 85%;
  }
}
</style>
