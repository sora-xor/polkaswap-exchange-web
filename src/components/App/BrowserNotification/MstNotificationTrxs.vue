<template>
  <div v-if="visible" class="notification-mst">
    <s-button class="close-button" @click="closeNotification"> <s-icon name="x-16" size="14" /> </s-button>

    <p>{{ t('mst.warningSwitch') }}</p>
    <s-button type="secondary" @click="handleButtonClick">{{ t('mst.seeActivity') }}</s-button>
  </div>
</template>

<script lang="ts">
import { api, mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { PageNames } from '@/consts';
import { mutation, state, action } from '@/store/decorators';

@Component({
  components: {
    DialogBase: components.DialogBase,
    SimpleNotification: components.SimpleNotification,
  },
})
export default class AppBrowserMstNotificationTrxs extends Mixins(
  mixins.TranslationMixin,
  mixins.NotificationMixin,
  mixins.DialogMixin
) {
  declare visible: boolean;
  @mutation.wallet.account.setIsMstAddressExist setIsMstAddressExist!: (isExist: boolean) => void;
  @mutation.wallet.account.setIsMST setIsMST!: (isMST: boolean) => void;
  @mutation.wallet.account.syncWithStorage syncWithStorage!: () => void;
  @state.wallet.account.isMST isMST!: boolean;

  @action.wallet.account.afterLogin afterLogin!: () => void;

  closeNotification() {
    this.$emit('update:visible', false);
  }

  handleButtonClick() {
    if (!this.isMST) {
      api.mst.switchAccount(true);
      this.setIsMST(true);
      this.syncWithStorage();
      this.afterLogin();
    }
    if (this.$route.name !== PageNames.Wallet) {
      this.$router.push({ name: PageNames.Wallet });
    }
    this.$nextTick(() => {
      this.$emit('update:visible', false);
    });
  }
}
</script>

<style lang="scss" scoped>
.notification-mst {
  position: fixed;
  top: 72px;
  right: 16px;
  width: 370px;
  height: 116px;
  z-index: $app-above-loader-layer;
  background-color: #a09a9d;
  border-radius: 12px;
  padding: 14px;
  p {
    color: #ffffff;
    max-width: 320px;
    font-size: 13px;
  }
  button {
    margin-top: 12px;
    font-size: 12px;
    box-shadow: unset !important;
    padding: 8px !important;
    &:hover {
      background: var(--s-color-base-content-tertiary) !important;
    }
  }
  .close-button {
    position: absolute;
    top: -8px;
    right: 8px;
    background: unset !important;
    border: none;
    cursor: pointer;
    &:hover {
      background: #a09a9d !important;
    }
  }
}
</style>
