<template>
  <referrals-confirm-invite-user v-if="showWalletOverlays" v-model:visible="showConfirmInviteUser"></referrals-confirm-invite-user>
  <bridge-transfer-notification v-if="showWalletOverlays"></bridge-transfer-notification>
  <app-mobile-popup v-model:visible="showSoraMobilePopup"></app-mobile-popup>
  <app-browser-notifs-enable-dialog
    v-if="showWalletOverlays"
    v-model:visible="showBrowserNotifPopup"
    @set-dark-page="setDarkPage"
  ></app-browser-notifs-enable-dialog>
  <app-browser-notifs-blocked-dialog
    v-if="showWalletOverlays"
    v-model:visible="showBrowserNotifBlockedPopup"
  ></app-browser-notifs-blocked-dialog>
  <app-browser-notifs-blocked-rotate-phone
    v-if="showWalletOverlays"
    v-model:visible="orientationWarningVisible"
  ></app-browser-notifs-blocked-rotate-phone>
  <app-browser-mst-notification-trxs
    v-if="showWalletOverlays"
    v-model:visible="showNotificationMST"
  ></app-browser-mst-notification-trxs>
  <notification-enabling-page v-if="showNotifsDarkPage">
    {{ t('browserNotificationDialog.pointer') }}
  </notification-enabling-page>
  <alerts></alerts>
  <confirm-dialog
    :chain-api="chainApi"
    :account="account"
    :visibility="isSignTxDialogVisible"
    :set-visibility="setSignTxDialogVisibility"
  ></confirm-dialog>
  <select-sora-account-dialog></select-sora-account-dialog>
  <app-browser-notifs-local-storage-override
    v-if="showWalletOverlays"
    v-model:visible="showErrorLocalStorageExceed"
    @delete-data-local-storage="clearLocalStorage"
  ></app-browser-notifs-local-storage-override>
</template>

<script setup lang="ts">
import Alerts from '@/components/App/Alerts/Alerts.vue';
import AppBrowserNotifsBlockedDialog from '@/components/App/BrowserNotification/BlockedDialog.vue';
import AppBrowserNotifsBlockedRotatePhone from '@/components/App/BrowserNotification/BlockedRotatePhone.vue';
import AppBrowserNotifsEnableDialog from '@/components/App/BrowserNotification/EnableDialog.vue';
import AppBrowserNotifsLocalStorageOverride from '@/components/App/BrowserNotification/LocalStorageOverride.vue';
import AppBrowserMstNotificationTrxs from '@/components/App/BrowserNotification/MstNotificationTrxs.vue';
import AppMobilePopup from '@/components/App/MobilePopup.vue';
import SelectSoraAccountDialog from '@/components/shared/Dialog/SelectSoraAccount.vue';
import { BridgeTransferNotification } from '@/features/bridge';
import { ReferralsConfirmInviteUser } from '@/features/referrals';

import { useAppShellContext } from './context';
import WalletComponentNotificationEnablingPage from '@/lib/soraneo-wallet/src/components/NotificationEnablingPage.vue';
import WalletComponentConfirmDialog from '@/lib/soraneo-wallet/src/components/ConfirmDialog.vue';

const NotificationEnablingPage = WalletComponentNotificationEnablingPage ?? 'div';
const ConfirmDialog = WalletComponentConfirmDialog ?? 'div';

const {
  account,
  chainApi,
  clearLocalStorage,
  isSignTxDialogVisible,
  orientationWarningVisible,
  setDarkPage,
  setSignTxDialogVisibility,
  showBrowserNotifBlockedPopup,
  showBrowserNotifPopup,
  showConfirmInviteUser,
  showErrorLocalStorageExceed,
  showNotifsDarkPage,
  showNotificationMST,
  showSoraMobilePopup,
  showWalletOverlays,
  t,
} = useAppShellContext();
</script>
