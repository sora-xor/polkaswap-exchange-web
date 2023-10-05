<template>
  <div class="sora-card">
    <s-input
      maxlength="320"
      :placeholder="t('card.emailPlaceholder')"
      v-model="email"
      :disabled="loading"
      type="email"
    />
    <p :class="computedClassEmail">{{ emailInputDescription }}</p>
    <template v-if="emailSent">
      <s-icon name="basic-check-mark-24" size="16px" />
      <p v-if="emailSent" class="sora-card__email-input-description">{{ t('card.emailSpamReminder') }}</p>
    </template>
    <div v-if="showNameInputs">
      <s-input
        class="sora-card__input-name"
        maxlength="50"
        :placeholder="t('card.firstNamePlaceholder')"
        v-model="firstName"
        :disabled="loading"
      />
      <s-input maxlength="50" :placeholder="t('card.lastNamePlaceholder')" v-model="lastName" :disabled="loading" />
      <p class="sora-card__name-input-description">{{ t('card.personalNameInputDesc') }}</p>
    </div>
    <s-button
      type="primary"
      :disabled="sendBtnDisabled"
      class="sora-card__btn s-typography-button--large"
      @click="handleSendEmail"
    >
      <span class="text">
        {{ buttonText }}
      </span>
    </s-button>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import EmailValidator from 'email-validator';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { getter, state } from '@/store/decorators';
import { CardUIViews } from '@/types/card';

const RESEND_INTERVAL = 59;

@Component
export default class SmsCode extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @state.soraCard.authLogin private authLogin!: any;

  @getter.soraCard.isEuroBalanceEnough private isEuroBalanceEnough!: boolean;

  private emailCountDown = '';
  private prefilledEmail = '';
  private unconfirmedEmail = '';
  private emailSentFirstTime = false;
  private emailResendCount = RESEND_INTERVAL;

  firstName = '';
  lastName = '';
  email = '';
  emailSent = false;

  @Watch('emailResendCount', { immediate: true })
  private handleSmsCountChange(value: number): void {
    const digit = value.toString().length > 1 ? '' : '0';
    this.emailCountDown = `00:${digit}${value}`;
  }

  handleSendEmail(): void {
    this.startEmailCountDown();

    if (this.isPrefilledEmailValid || this.isEmailMismatch) {
      // user wants to change unconfirmed email
      if (this.prefilledEmail !== this.email) {
        this.authLogin.ChangeUnconfirmedEmail({ Email: this.email }).catch((error) => {
          console.error('[SoraCard]: Error while changing email', error);
        });

        this.unconfirmedEmail = this.email;
        this.emailSent = true;

        return;
      }
    }

    // user signs on for the first time
    if (!this.emailSentFirstTime && !this.isPrefilledEmailValid) {
      this.authLogin
        .UserMinimalRegistration({ Email: this.email, FirstName: this.firstName, LastName: this.lastName })
        .catch((error) => {
          console.error('[SoraCard]: Error while email setup', error);
        });

      this.unconfirmedEmail = this.email;
      this.emailSentFirstTime = true;
      return;
    }

    // user tries to resend email several times
    this.authLogin.SendVerificationEmail().catch((error) => {
      console.error('[SoraCard]: Error while resending email', error);
    });

    this.emailSent = true;
  }

  get emailInputDescription(): string {
    if (this.emailSent) return this.t('card.emailInputAfterSendDesc');
    return this.t('card.emailInputBeforeSendDesc');
  }

  get computedClassEmail(): string {
    const base = ['sora-card__email-input-description'];

    if (this.emailSent) base.push('sora-card__email-input-description--sent');

    return base.join(' ');
  }

  get buttonText() {
    if (this.emailSent && this.emailCountDown) {
      return this.t('card.resendInBtn', { value: this.emailCountDown });
    }
    return this.t('card.sendEmailLinkBtn');
  }

  get sendBtnDisabled(): boolean {
    if (this.emailSent) return true;

    if (this.isPrefilledEmailValid) {
      if (EmailValidator.validate(this.email)) {
        return false;
      }

      return true;
    } else {
      if (this.firstName && this.lastName) {
        return !EmailValidator.validate(this.email);
      }

      return true;
    }
  }

  get showNameInputs(): boolean {
    return this.prefilledEmail === 'undefined' || !this.prefilledEmail;
  }

  get isPrefilledEmailValid(): boolean {
    if (this.prefilledEmail !== 'undefined' || !!this.prefilledEmail) {
      return EmailValidator.validate(this.prefilledEmail);
    }
    return false;
  }

  get isEmailMismatch(): boolean {
    if (!this.unconfirmedEmail) return false;
    return this.unconfirmedEmail !== this.email;
  }

  startEmailCountDown(): void {
    const interval = setInterval(() => {
      this.emailResendCount--;

      if (this.emailResendCount < 0) {
        this.emailSent = false;
        this.emailResendCount = RESEND_INTERVAL;
        clearInterval(interval);
      }
    }, 1000);
  }

  mounted(): void {
    this.prefilledEmail = localStorage.getItem('PW-Email') || 'undefined';

    if (this.prefilledEmail !== 'undefined') {
      this.email = this.prefilledEmail;
    }

    if (!this.authLogin) return;

    this.authLogin
      .on('Verification-Email-Sent-Success', () => {
        this.emailSent = true;
      })
      .on('Verification-Email-ReSent-Success', () => {
        this.emailSent = true;
      })
      .on('Email-verified', () => {
        this.unconfirmedEmail = '';
        if (this.isEuroBalanceEnough) {
          this.$emit('confirm', CardUIViews.Kyc);
        } else {
          this.$emit('confirm', CardUIViews.Payment);
        }
      });
  }
}
</script>

<style lang="scss" scoped>
.sora-card {
  .s-typography-button--large.sora-card__btn {
    margin-top: 0;
  }
  .s-icon-basic-check-mark-24 {
    color: var(--s-color-status-success);
  }

  &__input-name {
    margin-bottom: $basic-spacing;
  }

  &__name-input-description {
    color: var(--s-color-base-content-primary);
    font-size: var(--s-font-size-extra-small);
    font-weight: 300;
    line-height: var(--s-line-height-base);
    padding: var(--s-basic-spacing) var(--s-basic-spacing) calc(var(--s-basic-spacing) * 2)
      calc(var(--s-basic-spacing) * 1.5);
  }

  &__email-input-description {
    display: inline-block;
    color: var(--s-color-base-content-primary);
    font-size: var(--s-font-size-extra-small);
    font-weight: 300;
    line-height: var(--s-line-height-base);
    padding: var(--s-basic-spacing) var(--s-basic-spacing) calc(var(--s-basic-spacing) * 2)
      calc(var(--s-basic-spacing) * 1.5);

    &--sent {
      padding-bottom: 0;
    }
  }

  &__btn {
    width: 100%;
  }
}
</style>
