<template>
  <div v-loading="parentLoading">
    <div class="map">
      <div class="map__text-info">
        <div class="map__section">
          <email-icon class="map__icon"></email-icon>
          <div>
            <h4 class="map__point">Verify contact info</h4>
            <span class="map__point-desc">Email and phone number</span>
            <div class="line"></div>
          </div>
          <div v-if="firstPointChecked" class="point point--checked">
            <s-icon name="basic-check-mark-24" size="12px" />
          </div>
          <div v-else-if="firstPointCurrent" class="point point--current" />
          <div v-else class="point" />
        </div>
        <div class="map__section">
          <user-icon class="map__icon"></user-icon>
          <div>
            <h4 class="map__point">Verify documents</h4>
            <span class="map__point-desc">Selfie with a document</span>
            <div class="line"></div>
          </div>
          <div v-if="secondPointChecked" class="point point--checked">
            <s-icon name="basic-check-mark-24" size="12px" />
          </div>
          <div v-else-if="secondPointCurrent" class="point point--current" />
          <div v-else class="point" />
        </div>
        <div class="map__section">
          <card-icon class="map__icon"></card-icon>
          <div>
            <h4 class="map__point">Submit personal data</h4>
            <span class="map__point-desc">Full name & proof of address</span>
            <div class="line line--last"></div>
          </div>
          <div v-if="thirdPointChecked" class="point point--checked">
            <s-icon name="basic-check-mark-24" size="12px" />
          </div>
          <div v-else-if="thirdPointCurrent" class="point point--current" />
          <div v-else class="point" />
        </div>
      </div>
    </div>

    <div id="authOpen"></div>

    <s-button
      :loading="btnLoading"
      type="primary"
      class="sora-card__btn s-typography-button--large"
      @click="handleConfirm"
    >
      <span class="text">{{ btnText() }}</span>
      <s-icon v-if="!btnLoading" name="arrows-arrow-top-right-24" size="18" />
    </s-button>
    <notification-enabling-page v-if="permissionDialogVisibility">
      {{ t('code.allowanceRequest') }}
    </notification-enabling-page>
  </div>
</template>

<script lang="ts">
import { loadScript, unloadScript } from 'vue-plugin-load-script';
import { action, state } from '@/store/decorators';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Component, Mixins, Prop } from 'vue-property-decorator';
import EmailIcon from '@/assets/img/sora-card/email.svg?inline';
import CardIcon from '@/assets/img/sora-card/card.svg?inline';
import UserIcon from '@/assets/img/sora-card/user.svg?inline';
import { clearTokensFromSessionStorage, delay } from '@/utils';
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import { CardIssueStatus } from '@/types/card';

@Component({
  components: {
    EmailIcon,
    CardIcon,
    UserIcon,
    NotificationEnablingPage: components.NotificationEnablingPage,
  },
})
export default class RoadMap extends Mixins(TranslationMixin, mixins.LoadingMixin, mixins.CameraPermissionMixin) {
  @state.soraCard.userKycStatus private userKycStatus!: CardIssueStatus;
  @action.soraCard.getUserKycStatus private getUserKycStatus!: AsyncFnWithoutArgs;

  @Prop({ default: false, type: Boolean }) readonly userApplied!: boolean;

  firstPointChecked = false;
  firstPointCurrent = true;
  secondPointChecked = false;
  secondPointCurrent = false;
  thirdPointChecked = false;
  thirdPointCurrent = false;

  permissionDialogVisibility = false;
  btnLoading = false;

  btnText(): string {
    if (sessionStorage.getItem('access-token')) {
      return 'FINISH THE KYC';
    }
    return 'LET’S START';
  }

  async handleConfirm(): Promise<void> {
    try {
      const mediaDevicesAllowance = await this.checkMediaDevicesAllowance('SoraCard');

      if (!mediaDevicesAllowance) return;
    } catch (error) {
      console.error('[KYC Sora Card]: Camera error.', error);
    }

    if (sessionStorage.getItem('access-token')) {
      await this.getUserKycStatus();

      if (this.userKycStatus === CardIssueStatus.Success) {
        this.$emit('confirm-start-kyc', false);
      } else {
        this.$emit('confirm-start-kyc', true);
      }

      unloadScript('https://auth-test.paywings.io/auth/sdk.js');
      return;
    }

    loadScript('https://auth-test.paywings.io/auth/sdk.js')
      .then(() => {
        const conf = {
          authURL: ' https://auth-test.soracard.com',
          elementBind: '#authOpen',
          accessTokenTypeID: 1,
          apiKey: '6974528a-ee11-4509-b549-a8d02c1aec0d',
          userTypeID: 2,
        };

        try {
          // @ts-expect-error injected class
          const auth = new PopupOAuth(conf).connect();
        } catch (error) {
          console.error('error', error);
        }
      })
      .catch((error) => {
        // Failed to fetch script
        console.error('error', error);
      });

    this.btnLoading = true;
    const accessToken = await this.getAccessToken();
    this.firstPointChecked = true;
    this.secondPointCurrent = true;
    this.btnLoading = false;
  }

  async getAccessToken(): Promise<string | null> {
    await this.waitOnAccessTokenAvailability();

    return sessionStorage.getItem('access-token');
  }

  async waitOnAccessTokenAvailability(ms = 300): Promise<void> {
    const accessToken = sessionStorage.getItem('access-token');

    if (accessToken) return;

    await delay(ms);
    return await this.waitOnAccessTokenAvailability();
  }

  mounted(): void {
    clearTokensFromSessionStorage();

    if (this.userApplied) {
      this.firstPointCurrent = true;
      this.secondPointChecked = true;
      this.thirdPointChecked = true;
    }
  }
}
</script>

<style lang="scss" scoped>
.map {
  display: flex;
  width: 100%;
  background-color: var(--s-color-base-background);
  border-radius: var(--s-border-radius-small);
  box-shadow: -5px -5px 10px #ffffff, 1px 1px 10px rgba(0, 0, 0, 0.1), inset 1px 1px 2px rgba(255, 255, 255, 0.8);
  padding: 20px 16px;
  margin-bottom: 16px;

  &__section {
    display: flex;
    align-items: flex-start;
    margin-top: 16px;
    width: 100%;

    .line {
      height: 1px;
      width: 270px;
      margin-top: 16px;
      background-color: var(--s-color-base-border-secondary);

      &--last {
        visibility: hidden;
        margin: 0;
      }
    }

    .dotted {
      width: 1px;
      height: 50px;
      background-color: #d9d9d9;
    }

    .point {
      align-self: center;
      margin-left: 30px;
      width: 20px;
      height: 20px;
      background-color: #f4f0f1;
      border-radius: 50%;
      border: 1px solid var(--s-color-base-content-secondary);

      &--current {
        border-color: #ee2233;
        background-color: #ffe5e8;
      }

      &--checked {
        background-color: #ee2233;
        border-color: #ee2233;
      }
    }
  }

  &__icon {
    margin: 5px 16px 0 0;
    color: var(--s-color-base-content-tertiary);
  }

  &__point {
    font-weight: 600;
    font-size: 18px;
  }

  &__text-info {
    width: 120%;
  }

  &__point-desc {
    color: var(--s-color-base-content-secondary);
    margin-top: 3px;
    display: block;
  }

  .s-icon-basic-check-mark-24 {
    color: #fff;
    position: relative;
    margin-left: 3px;
  }
}

.s-icon-arrows-arrow-top-right-24 {
  margin-left: 8px;
  color: #fff;
}

[design-system-theme='dark'] {
  .map {
    box-shadow: -5px -5px 10px rgba(155, 111, 165, 0.25), 2px 2px 15px #492067,
      inset 1px 1px 2px rgba(155, 111, 165, 0.25);
  }
}

.el-button.is-loading {
  background-color: unset !important;
}
</style>
