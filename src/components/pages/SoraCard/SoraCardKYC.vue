<template>
  <wallet-base
    v-loading="loading"
    :title="title"
    :show-back="true"
    :title-center="true"
    @back="handleBack"
    class="sora-card"
  >
    <terms-and-conditions v-if="step === KycProcess.TermsAndConditions" @confirm="confirmToS" />
    <phone v-else-if="step === KycProcess.Phone" @confirm="confirmPhone" />
    <email v-else-if="step === KycProcess.Email" @confirm="confirmEmail" />
    <payment v-else-if="step === KycProcess.Payment" @confirm="confirmPayment" />
    <guidance v-else-if="step === KycProcess.Guidance" @confirm="confirmReadiness" />
    <kyc-view v-else-if="step === KycProcess.KycView" @confirm="confirmKyc" />
  </wallet-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { CardUIViews } from '@/types/card';

enum KycProcess {
  TermsAndConditions,
  Phone,
  Email,
  Payment,
  Guidance,
  KycView,
}

@Component({
  components: {
    WalletBase: components.WalletBase,
    TermsAndConditions: lazyComponent(Components.TermsAndConditions),
    Guidance: lazyComponent(Components.Guidance),
    Phone: lazyComponent(Components.Phone),
    Email: lazyComponent(Components.Email),
    Payment: lazyComponent(Components.Payment),
    KycView: lazyComponent(Components.KycView),
  },
})
export default class SoraCardKYC extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @Prop({ default: false, type: Boolean }) readonly getReadyPage!: boolean;

  step: KycProcess = KycProcess.TermsAndConditions;

  KycProcess = KycProcess;

  handleBack(): void {
    if (this.step === KycProcess.TermsAndConditions) {
      this.$emit('go-to-start');
      return;
    }

    if (this.step === KycProcess.Phone) {
      this.step = KycProcess.TermsAndConditions;
      return;
    }

    if (this.step === KycProcess.Email) {
      this.step = KycProcess.Phone;
      return;
    }

    if (this.step === KycProcess.Payment) {
      this.step = KycProcess.TermsAndConditions;
      return;
    }

    if (this.step === KycProcess.Guidance) {
      this.step = KycProcess.TermsAndConditions;
      return;
    }

    if (this.step === KycProcess.KycView) {
      this.step = KycProcess.Guidance;
    }
  }

  get title(): string {
    switch (this.step) {
      case KycProcess.TermsAndConditions:
        return this.t('card.termsAndConditions');
      case KycProcess.Guidance:
        return this.t('card.getPrepared');
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

  confirmToS(): void {
    this.step = KycProcess.Phone;
  }

  confirmSignIn(): void {
    this.step = KycProcess.Phone;
  }

  confirmPayment(): void {
    this.step = KycProcess.Guidance;
  }

  confirmPhone(state: CardUIViews): void {
    switch (state) {
      case CardUIViews.Payment:
        this.step = KycProcess.Payment;
        break;
      case CardUIViews.Kyc:
        this.step = KycProcess.Guidance;
        break;
      case CardUIViews.Email:
        this.step = KycProcess.Email;
        break;
      case CardUIViews.KycResult:
        this.$emit('go-to-kyc-result');
        break;
      case CardUIViews.Start:
        this.$emit('go-to-start');
        break;
      case CardUIViews.Dashboard:
        this.$emit('go-to-dashboard');
        break;
    }
  }

  confirmEmail(state: CardUIViews): void {
    if (state === CardUIViews.Payment) {
      this.step = KycProcess.Payment;
    }

    if (state === CardUIViews.Kyc) {
      this.step = KycProcess.Guidance;
    }
  }

  confirmReadiness(): void {
    this.step = KycProcess.KycView;
  }

  confirmKyc(state: CardUIViews): void {
    if (state === CardUIViews.KycResult) {
      this.$emit('go-to-kyc-result');
      return;
    }

    this.$emit('go-to-start');
  }

  mounted(): void {
    if (this.getReadyPage) {
      this.step = KycProcess.Guidance;
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
  margin-top: $basic-spacing;
  font-size: $basic-spacing;
  width: 25%;
  line-height: var(--s-size-mini);
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
