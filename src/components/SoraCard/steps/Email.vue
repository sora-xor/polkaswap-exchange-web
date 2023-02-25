<template>
  <div class="sora-card">
    <s-input maxlength="320" placeholder="Email" v-model="email" :disabled="loading" type="email" />
    <p class="sora-card__email-input-description">{{ emailInputDescription }}</p>
    <s-icon v-if="emailSent" name="basic-check-mark-24" size="16px" />
    <s-input
      class="sora-card__input-name"
      maxlength="50"
      placeholder="First Name"
      v-model="firstName"
      :disabled="loading"
    />
    <s-input maxlength="50" placeholder="Last Name" v-model="lastName" :disabled="loading" />
    <p class="sora-card__name-input-description">Use your real name.</p>
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
import { Component, Mixins, Watch } from 'vue-property-decorator';
import EmailValidator from 'email-validator';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { state } from '@/store/decorators';

const RESEND_INTERVAL = 59;

@Component
export default class SmsCode extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @state.soraCard.authLogin authLogin!: any;

  firstName = '';
  lastName = '';
  email = '';
  emailSent = false;
  emailSentFirstTime = false;
  emailResendText = '';
  emailResendCount = RESEND_INTERVAL;

  @Watch('emailResendCount', { immediate: true })
  private handleSmsCountChange(value: number): void {
    const digit = value.toString().length > 1 ? '' : '0';
    const countDown = `${digit}${value}`;
    this.emailResendText = `RESEND AVAILABLE IN 00:${countDown}`;
  }

  handleSendEmail(): void {
    this.startEmailCountDown();

    if (!this.emailSentFirstTime) {
      this.authLogin
        .UserMinimalRegistration({ Email: this.email, FirstName: this.firstName, LastName: this.lastName })
        .catch((error) => {
          console.error(error);
        });

      this.emailSentFirstTime = true;
      return;
    }

    this.authLogin.SendVerificationEmail().catch(function (error) {
      console.error(error);
    });

    this.emailSent = true;
  }

  get emailInputDescription(): string {
    if (this.emailSent) return 'We’ve sent you the magic link. Check your email!';
    return 'We’ll send you a verification email.';
  }

  get buttonText() {
    if (this.emailSent) return this.emailResendText;
    return 'SEND VERIFICATION EMAIL';
  }

  get sendBtnDisabled(): boolean {
    if (this.emailSent) return true;
    if (this.firstName && this.lastName) {
      return !EmailValidator.validate(this.email);
    }
    return true;
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
    if (!this.authLogin) return;

    this.authLogin
      .on('Verification-Email-Sent-Success', () => {
        this.emailSent = true;
      })
      .on('Verification-Email-ReSent-Success', () => {
        this.emailSent = true;
      })
      .on('Email-verified', () => {
        this.$emit('confirm');
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
  }

  &__btn {
    width: 100%;
  }
}
</style>
