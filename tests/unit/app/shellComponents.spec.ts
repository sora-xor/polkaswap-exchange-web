import { describe, expect, it, vi } from 'vitest';

const createAsyncComponentMock = vi.hoisted(() => vi.fn((loader: () => Promise<unknown>) => loader));

vi.mock('@/shared/ui/async', () => ({
  createAsyncComponent: createAsyncComponentMock,
}));

vi.mock('@/components/App/Alerts/AlertList.vue', () => ({ default: { name: 'AlertListComponent' } }));
vi.mock('@/components/App/Alerts/Alerts.vue', () => ({ default: { name: 'AlertsComponent' } }));
vi.mock('@/components/App/Alerts/CreateAlert.vue', () => ({ default: { name: 'CreateAlertComponent' } }));
vi.mock('@/components/shared/SelectAsset/SelectToken.vue', () => ({ default: { name: 'SelectTokenComponent' } }));
vi.mock('@/components/App/Header/AppMarketing.vue', () => ({ default: { name: 'AppMarketingComponent' } }));
vi.mock('@/components/App/Header/AppLogoButton.vue', () => ({ default: { name: 'AppLogoButtonComponent' } }));
vi.mock('@/components/App/MobilePopup.vue', () => ({ default: { name: 'AppMobilePopupComponent' } }));
vi.mock('@/components/App/BrowserNotification/BlockedDialog.vue', () => ({
  default: { name: 'AppBrowserNotifsBlockedDialogComponent' },
}));
vi.mock('@/components/App/BrowserNotification/BlockedRotatePhone.vue', () => ({
  default: { name: 'AppBrowserNotifsBlockedRotatePhoneComponent' },
}));
vi.mock('@/components/App/BrowserNotification/EnableDialog.vue', () => ({
  default: { name: 'AppBrowserNotifsEnableDialogComponent' },
}));
vi.mock('@/components/App/BrowserNotification/LocalStorageOverride.vue', () => ({
  default: { name: 'AppBrowserNotifsLocalStorageOverrideComponent' },
}));
vi.mock('@/components/App/BrowserNotification/MstNotificationTrxs.vue', () => ({
  default: { name: 'AppBrowserMstNotificationTrxsComponent' },
}));
vi.mock('@/components/App/Settings/Language/SelectLanguageDialog.vue', () => ({
  default: { name: 'SelectLanguageDialogComponent' },
}));
vi.mock('@/components/App/Settings/Currency/SelectCurrencyDialog.vue', () => ({
  default: { name: 'SelectCurrencyDialogComponent' },
}));
vi.mock('@/components/App/Settings/Telegram/RotatePhoneDialog.vue', () => ({
  default: { name: 'RotatePhoneDialogComponent' },
}));
vi.mock('@/components/App/Settings/Telegram/AccelerationAccessDialog.vue', () => ({
  default: { name: 'AccelerationAccessDialogComponent' },
}));
vi.mock('@/components/shared/PairTokenLogo.vue', () => ({ default: { name: 'PairTokenLogoComponent' } }));
vi.mock('@/components/App/Settings/Node/SelectNodeDialog.vue', () => ({
  default: { name: 'SelectNodeDialogComponent' },
}));
vi.mock('@/components/App/Footer/Indexer/SelectIndexer.vue', () => ({ default: { name: 'SelectIndexerComponent' } }));
vi.mock('@/features/bridge/components/TransferNotification.vue', () => ({
  default: { name: 'BridgeTransferNotificationComponent' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/ConfirmDialog.vue', () => ({
  default: { name: 'ConfirmDialogComponent' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/NotificationEnablingPage.vue', () => ({
  default: { name: 'NotificationEnablingPageComponent' },
}));
vi.mock('@/features/referrals/components/ConfirmInviteUser.vue', () => ({
  default: { name: 'ReferralsConfirmInviteUserComponent' },
}));
vi.mock('@/components/shared/Dialog/SelectSoraAccount.vue', () => ({
  default: { name: 'SelectSoraAccountDialogComponent' },
}));

import * as shellComponents from '@/app/shell/components';

describe('app shell async components', () => {
  it('resolves each shell boundary through its async loader callback', async () => {
    const registry = [
      ['AlertList', shellComponents.AlertList, 'AlertListComponent'],
      ['Alerts', shellComponents.Alerts, 'AlertsComponent'],
      ['CreateAlert', shellComponents.CreateAlert, 'CreateAlertComponent'],
      ['AlertsSelectToken', shellComponents.AlertsSelectToken, 'SelectTokenComponent'],
      ['AppMarketing', shellComponents.AppMarketing, 'AppMarketingComponent'],
      ['AppLogoButton', shellComponents.AppLogoButton, 'AppLogoButtonComponent'],
      ['AppMobilePopup', shellComponents.AppMobilePopup, 'AppMobilePopupComponent'],
      [
        'AppBrowserNotifsBlockedDialog',
        shellComponents.AppBrowserNotifsBlockedDialog,
        'AppBrowserNotifsBlockedDialogComponent',
      ],
      [
        'AppBrowserNotifsBlockedRotatePhone',
        shellComponents.AppBrowserNotifsBlockedRotatePhone,
        'AppBrowserNotifsBlockedRotatePhoneComponent',
      ],
      [
        'AppBrowserNotifsEnableDialog',
        shellComponents.AppBrowserNotifsEnableDialog,
        'AppBrowserNotifsEnableDialogComponent',
      ],
      [
        'AppBrowserNotifsLocalStorageOverride',
        shellComponents.AppBrowserNotifsLocalStorageOverride,
        'AppBrowserNotifsLocalStorageOverrideComponent',
      ],
      [
        'AppBrowserMstNotificationTrxs',
        shellComponents.AppBrowserMstNotificationTrxs,
        'AppBrowserMstNotificationTrxsComponent',
      ],
      ['SelectLanguageDialog', shellComponents.SelectLanguageDialog, 'SelectLanguageDialogComponent'],
      ['SelectCurrencyDialog', shellComponents.SelectCurrencyDialog, 'SelectCurrencyDialogComponent'],
      ['RotatePhoneDialog', shellComponents.RotatePhoneDialog, 'RotatePhoneDialogComponent'],
      ['AccelerationAccessDialog', shellComponents.AccelerationAccessDialog, 'AccelerationAccessDialogComponent'],
      ['PairTokenLogo', shellComponents.PairTokenLogo, 'PairTokenLogoComponent'],
      ['SelectNodeDialog', shellComponents.SelectNodeDialog, 'SelectNodeDialogComponent'],
      ['SelectIndexer', shellComponents.SelectIndexer, 'SelectIndexerComponent'],
      ['BridgeTransferNotification', shellComponents.BridgeTransferNotification, 'BridgeTransferNotificationComponent'],
      ['ConfirmDialog', shellComponents.ConfirmDialog, 'ConfirmDialogComponent'],
      ['NotificationEnablingPage', shellComponents.NotificationEnablingPage, 'NotificationEnablingPageComponent'],
      ['ReferralsConfirmInviteUser', shellComponents.ReferralsConfirmInviteUser, 'ReferralsConfirmInviteUserComponent'],
      ['SelectSoraAccountDialog', shellComponents.SelectSoraAccountDialog, 'SelectSoraAccountDialogComponent'],
    ] as const;

    expect(createAsyncComponentMock).toHaveBeenCalledTimes(registry.length);

    for (const [name, loader, componentName] of registry) {
      expect(typeof loader, `${name} should be wrapped as a loader callback`).toBe('function');
      await expect(loader()).resolves.toMatchObject({ default: { name: componentName } });
    }
  });
});
