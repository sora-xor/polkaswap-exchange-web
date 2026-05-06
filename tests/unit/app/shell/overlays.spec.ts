import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const showConfirmInviteUser = ref(true);
const showWalletOverlays = ref(true);
const showSoraMobilePopup = ref(true);
const showBrowserNotifPopup = ref(true);
const showBrowserNotifBlockedPopup = ref(true);
const orientationWarningVisible = ref(true);
const showNotificationMST = ref(true);
const showNotifsDarkPage = ref(false);
const showErrorLocalStorageExceed = ref(true);
const isSignTxDialogVisible = ref(true);
const account = ref({ address: '5mock-account' });
const chainApi = { isReady: true };

const clearLocalStorage = vi.fn();
const setDarkPage = vi.fn();
const setSignTxDialogVisibility = vi.fn();
const tMock = vi.fn((key: string) => key);

const createVisibleStub = (name: string, extraProps: string[] = []) =>
  defineComponent({
    name,
    props: ['visible', ...extraProps],
    emits: ['update:visible', 'set-dark-page', 'delete-data-local-storage'],
    template: `<div :class="['${name}']"><slot /></div>`,
  });

vi.mock('@/app/shell/context', () => ({
  useAppShellContext: () => ({
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
    t: tMock,
  }),
}));

vi.mock('@/components/App/Alerts/Alerts.vue', () => ({
  default: defineComponent({ name: 'AlertsStub', template: '<div class="alerts-stub" />' }),
}));
vi.mock('@/components/App/BrowserNotification/BlockedDialog.vue', () => ({
  default: createVisibleStub('AppBrowserNotifsBlockedDialogStub'),
}));
vi.mock('@/components/App/BrowserNotification/BlockedRotatePhone.vue', () => ({
  default: createVisibleStub('AppBrowserNotifsBlockedRotatePhoneStub'),
}));
vi.mock('@/components/App/BrowserNotification/EnableDialog.vue', () => ({
  default: createVisibleStub('AppBrowserNotifsEnableDialogStub'),
}));
vi.mock('@/components/App/BrowserNotification/LocalStorageOverride.vue', () => ({
  default: createVisibleStub('AppBrowserNotifsLocalStorageOverrideStub'),
}));
vi.mock('@/components/App/BrowserNotification/MstNotificationTrxs.vue', () => ({
  default: createVisibleStub('AppBrowserMstNotificationTrxsStub'),
}));
vi.mock('@/components/App/MobilePopup.vue', () => ({
  default: createVisibleStub('AppMobilePopupStub'),
}));
vi.mock('@/components/shared/Dialog/SelectSoraAccount.vue', () => ({
  default: defineComponent({
    name: 'SelectSoraAccountDialogStub',
    template: '<div class="select-sora-account-dialog-stub" />',
  }),
}));
vi.mock('@/features/bridge', () => ({
  BridgeTransferNotification: defineComponent({
    name: 'BridgeTransferNotificationStub',
    template: '<div class="bridge-transfer-notification-stub" />',
  }),
}));
vi.mock('@/features/referrals', () => ({
  ReferralsConfirmInviteUser: createVisibleStub('ReferralsConfirmInviteUserStub'),
}));
vi.mock('@/lib/soraneo-wallet/src/components/NotificationEnablingPage.vue', () => ({
  default: defineComponent({
    name: 'NotificationEnablingPageStub',
    template: '<div class="notification-enabling-page-stub"><slot /></div>',
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/components/ConfirmDialog.vue', () => ({
  default: defineComponent({
    name: 'ConfirmDialogStub',
    props: ['chainApi', 'account', 'visibility', 'setVisibility'],
    template: '<div class="confirm-dialog-stub" />',
  }),
}));

let AppShellOverlays: (typeof import('@/app/shell/AppShellOverlays.vue'))['default'];

beforeEach(async () => {
  showConfirmInviteUser.value = true;
  showWalletOverlays.value = true;
  showSoraMobilePopup.value = true;
  showBrowserNotifPopup.value = true;
  showBrowserNotifBlockedPopup.value = true;
  orientationWarningVisible.value = true;
  showNotificationMST.value = true;
  showNotifsDarkPage.value = false;
  showErrorLocalStorageExceed.value = true;
  isSignTxDialogVisible.value = true;
  account.value = { address: '5mock-account' };
  clearLocalStorage.mockClear();
  setDarkPage.mockClear();
  setSignTxDialogVisibility.mockClear();
  tMock.mockClear();

  AppShellOverlays = (await import('@/app/shell/AppShellOverlays.vue')).default;
});

describe('AppShellOverlays', () => {
  it('renders wallet-scoped overlays and passes confirm dialog state through the shell context', () => {
    const wrapper = mount(AppShellOverlays);

    expect(wrapper.findComponent({ name: 'ReferralsConfirmInviteUserStub' }).props('visible')).toBe(true);
    expect(wrapper.findComponent({ name: 'BridgeTransferNotificationStub' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'AppBrowserNotifsEnableDialogStub' }).props('visible')).toBe(true);
    expect(wrapper.findComponent({ name: 'AppBrowserNotifsBlockedDialogStub' }).props('visible')).toBe(true);
    expect(wrapper.findComponent({ name: 'AppBrowserNotifsBlockedRotatePhoneStub' }).props('visible')).toBe(true);
    expect(wrapper.findComponent({ name: 'AppBrowserMstNotificationTrxsStub' }).props('visible')).toBe(true);
    expect(wrapper.findComponent({ name: 'AppBrowserNotifsLocalStorageOverrideStub' }).props('visible')).toBe(true);
    expect(wrapper.findComponent({ name: 'AppMobilePopupStub' }).props('visible')).toBe(true);
    expect(wrapper.findComponent({ name: 'AlertsStub' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'SelectSoraAccountDialogStub' }).exists()).toBe(true);

    const confirmDialog = wrapper.findComponent({ name: 'ConfirmDialogStub' });
    expect(confirmDialog.props('chainApi')).toBe(chainApi);
    expect(confirmDialog.props('account')).toEqual({ address: '5mock-account' });
    expect(confirmDialog.props('visibility')).toBe(true);
    expect(confirmDialog.props('setVisibility')).toBe(setSignTxDialogVisibility);
  });

  it('keeps global overlays mounted while hiding wallet-bound overlays during wallet teardown', () => {
    showWalletOverlays.value = false;

    const wrapper = mount(AppShellOverlays);

    expect(wrapper.findComponent({ name: 'ReferralsConfirmInviteUserStub' }).exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'BridgeTransferNotificationStub' }).exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'AppBrowserNotifsEnableDialogStub' }).exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'AppBrowserNotifsLocalStorageOverrideStub' }).exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'AppMobilePopupStub' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'AlertsStub' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'ConfirmDialogStub' }).exists()).toBe(true);
  });

  it('wires dark-page and local-storage actions through the shell context and renders notification copy', async () => {
    showNotifsDarkPage.value = true;

    const wrapper = mount(AppShellOverlays);

    expect(wrapper.find('.notification-enabling-page-stub').text()).toContain('browserNotificationDialog.pointer');

    await wrapper.findComponent({ name: 'AppBrowserNotifsEnableDialogStub' }).vm.$emit('set-dark-page', true);
    await wrapper
      .findComponent({ name: 'AppBrowserNotifsLocalStorageOverrideStub' })
      .vm.$emit('delete-data-local-storage');

    expect(setDarkPage).toHaveBeenCalledWith(true);
    expect(clearLocalStorage).toHaveBeenCalledTimes(1);
    expect(tMock).toHaveBeenCalledWith('browserNotificationDialog.pointer');
  });
});
