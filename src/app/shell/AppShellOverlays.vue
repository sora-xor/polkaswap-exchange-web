<template>
  <referrals-confirm-invite-user
    v-if="showWalletOverlays && showConfirmInviteUser"
    v-model:visible="showConfirmInviteUser"
  ></referrals-confirm-invite-user>
  <bridge-transfer-notification v-if="showWalletOverlays"></bridge-transfer-notification>
  <app-mobile-popup v-if="showSoraMobilePopup" v-model:visible="showSoraMobilePopup"></app-mobile-popup>
  <app-browser-notifs-enable-dialog
    v-if="showWalletOverlays && showBrowserNotifPopup"
    v-model:visible="showBrowserNotifPopup"
    @set-dark-page="setDarkPage"
  ></app-browser-notifs-enable-dialog>
  <app-browser-notifs-blocked-dialog
    v-if="showWalletOverlays && showBrowserNotifBlockedPopup"
    v-model:visible="showBrowserNotifBlockedPopup"
  ></app-browser-notifs-blocked-dialog>
  <app-browser-notifs-blocked-rotate-phone
    v-if="showWalletOverlays && orientationWarningVisible"
    v-model:visible="orientationWarningVisible"
  ></app-browser-notifs-blocked-rotate-phone>
  <app-browser-mst-notification-trxs
    v-if="showWalletOverlays && showNotificationMST"
    v-model:visible="showNotificationMST"
  ></app-browser-mst-notification-trxs>
  <notification-enabling-page v-if="showNotifsDarkPage">
    {{ t('browserNotificationDialog.pointer') }}
  </notification-enabling-page>
  <alerts v-if="showAlertSettingsPopup"></alerts>
  <confirm-dialog
    v-if="isSignTxDialogVisible && chainApi"
    :chain-api="chainApi"
    :account="account"
    :visibility="isSignTxDialogVisible"
    :set-visibility="setSignTxDialogVisibility"
  ></confirm-dialog>
  <select-sora-account-dialog v-if="showSoraAccountDialog"></select-sora-account-dialog>
  <app-browser-notifs-local-storage-override
    v-if="showWalletOverlays && showErrorLocalStorageExceed"
    v-model:visible="showErrorLocalStorageExceed"
    @delete-data-local-storage="clearLocalStorage"
  ></app-browser-notifs-local-storage-override>
</template>

<script setup lang="ts">
import { useAppShellContext } from './context';
import {
  Alerts,
  AppBrowserMstNotificationTrxs,
  AppBrowserNotifsBlockedDialog,
  AppBrowserNotifsBlockedRotatePhone,
  AppBrowserNotifsEnableDialog,
  AppBrowserNotifsLocalStorageOverride,
  AppMobilePopup,
  BridgeTransferNotification,
  ConfirmDialog,
  NotificationEnablingPage,
  ReferralsConfirmInviteUser,
  SelectSoraAccountDialog,
} from './components';

const {
  account,
  chainApi,
  clearLocalStorage,
  isSignTxDialogVisible,
  orientationWarningVisible,
  setDarkPage,
  setSignTxDialogVisibility,
  showAlertSettingsPopup,
  showBrowserNotifBlockedPopup,
  showBrowserNotifPopup,
  showConfirmInviteUser,
  showErrorLocalStorageExceed,
  showNotifsDarkPage,
  showNotificationMST,
  showSoraAccountDialog,
  showSoraMobilePopup,
  showWalletOverlays,
  t,
} = useAppShellContext();
</script>
