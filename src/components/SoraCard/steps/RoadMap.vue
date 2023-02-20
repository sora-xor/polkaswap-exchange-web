<template>
  <div v-loading="parentLoading">
    <div class="map">
      <div class="map__text-info">
        <div class="map__section">
          <email-icon class="map__icon"></email-icon>
          <div class="text">
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
          <div class="text">
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
          <div class="text">
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
      :disabled="btnDisabled"
      type="primary"
      class="sora-card__btn s-typography-button--large"
      @click="handleConfirm"
    >
      <span class="text">{{ btnText }}</span>
    </s-button>
    <notification-enabling-page v-if="permissionDialogVisibility">
      {{ t('code.allowanceRequest') }}
    </notification-enabling-page>
  </div>
</template>

<script lang="ts">
import { getter, state } from '@/store/decorators';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Component, Mixins, Prop } from 'vue-property-decorator';
import EmailIcon from '@/assets/img/sora-card/email.svg?inline';
import CardIcon from '@/assets/img/sora-card/card.svg?inline';
import UserIcon from '@/assets/img/sora-card/user.svg?inline';
import { clearTokensFromLocalStorage } from '@/utils/card';
import { mixins, components, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

@Component({
  components: {
    EmailIcon,
    CardIcon,
    UserIcon,
    NotificationEnablingPage: components.NotificationEnablingPage,
  },
})
export default class RoadMap extends Mixins(TranslationMixin, mixins.LoadingMixin, mixins.CameraPermissionMixin) {
  @state.wallet.settings.soraNetwork soraNetwork!: WALLET_CONSTS.SoraNetwork;

  @getter.soraCard.isEuroBalanceEnough isEuroBalanceEnough!: boolean;

  @Prop({ default: false, type: Boolean }) readonly userApplied!: boolean;

  firstPointChecked = false;
  firstPointCurrent = true;
  secondPointChecked = false;
  secondPointCurrent = false;
  thirdPointChecked = false;
  thirdPointCurrent = false;

  btnText = 'LET’S START';
  btnDisabled = false;
  btnLoading = false;

  permissionDialogVisibility = false;

  async handleConfirm(): Promise<void> {
    try {
      const mediaDevicesAllowance = await this.checkMediaDevicesAllowance('SoraCard');

      if (!mediaDevicesAllowance) return;
    } catch (error) {
      console.error('[SoraCard]: Camera error.', error);
    }

    this.$emit('confirm');
  }

  mounted(): void {
    clearTokensFromLocalStorage();

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
  box-shadow: var(--s-shadow-dialog);
  padding: 20px $basic-spacing;
  margin-bottom: $basic-spacing;

  &__section {
    display: flex;
    align-items: center;
    width: 100%;

    .text {
      padding-top: $basic-spacing;
    }

    &:last-child .text {
      margin-bottom: $basic-spacing;
    }

    .line {
      height: 1px;
      width: 270px;
      margin-top: $basic-spacing;
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
        border-color: var(--s-color-theme-accent);
        background-color: rgba(248, 8, 123, 0.1);
      }

      &--checked {
        background-color: var(--s-color-theme-accent);
        border-color: var(--s-color-theme-accent);
      }
    }
  }

  &__icon {
    margin: 5px $basic-spacing 0 0;
    color: var(--s-color-base-content-tertiary);
  }

  &__point {
    font-weight: 600;
    font-size: var(--s-font-size-big);
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

.sora-card__btn {
  width: 100%;
}
</style>
