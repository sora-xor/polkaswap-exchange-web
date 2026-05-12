import { createAsyncComponent } from '@/shared/ui/async';

export const AlertList = createAsyncComponent(() => import('@/components/App/Alerts/AlertList.vue'));
export const CreateAlert = createAsyncComponent(() => import('@/components/App/Alerts/CreateAlert.vue'));
export const AlertsSelectToken = createAsyncComponent(() => import('@/components/shared/SelectAsset/SelectToken.vue'));
export const AppMarketing = createAsyncComponent(() => import('@/components/App/Header/AppMarketing.vue'));
export const AppLogoButton = createAsyncComponent(() => import('@/components/App/Header/AppLogoButton.vue'));
export const SelectLanguageDialog = createAsyncComponent(
  () => import('@/components/App/Settings/Language/SelectLanguageDialog.vue')
);
export const SelectCurrencyDialog = createAsyncComponent(
  () => import('@/components/App/Settings/Currency/SelectCurrencyDialog.vue')
);
export const RotatePhoneDialog = createAsyncComponent(
  () => import('@/components/App/Settings/Telegram/RotatePhoneDialog.vue')
);
export const AccelerationAccessDialog = createAsyncComponent(
  () => import('@/components/App/Settings/Telegram/AccelerationAccessDialog.vue')
);
export const PairTokenLogo = createAsyncComponent(() => import('@/components/shared/PairTokenLogo.vue'));
export const SelectNodeDialog = createAsyncComponent(
  () => import('@/components/App/Settings/Node/SelectNodeDialog.vue')
);
export const SelectIndexer = createAsyncComponent(() => import('@/components/App/Footer/Indexer/SelectIndexer.vue'));
export const BridgeTransferNotification = createAsyncComponent(
  () => import('@/components/pages/Bridge/TransferNotification.vue')
);
export const ReferralsConfirmInviteUser = createAsyncComponent(
  () => import('@/features/referrals/components/ConfirmInviteUser.vue')
);
