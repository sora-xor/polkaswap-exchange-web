import { describe, expect, it } from 'vitest';

import appShellLayoutSource from '@/app/shell/AppShellLayout.vue?raw';
import appShellSource from '@/app/shell/AppShell.vue?raw';

describe('App shell source', () => {
  it('wraps the app shell with the wallet notification provider so transaction toasts can render', () => {
    expect(appShellSource).toContain('<notification-provider>');
    expect(appShellSource).toContain('</notification-provider>');
    expect(appShellSource).toContain(
      "import WalletComponentNotificationProvider from '@/lib/soraneo-wallet/src/components/NotificationProvider.vue';"
    );
    expect(appShellSource).toContain("const NotificationProvider = WalletComponentNotificationProvider ?? 'div';");
  });

  it('loads dormant shell overlays through an async boundary', () => {
    expect(appShellSource).toContain("const AppShellOverlays = createAsyncComponent(() => import('./AppShellOverlays.vue'));");
    expect(appShellSource).not.toContain("import AppShellOverlays from './AppShellOverlays.vue';");
  });

  it('renders the desktop menu logo through the named AppMenu head slot', () => {
    expect(appShellLayoutSource).toContain('<template #head>');
    expect(appShellLayoutSource).toContain(
      '<app-logo-button class="app-logo--menu" :theme="libraryTheme" @click="goToSwap"></app-logo-button>'
    );
    expect(appShellLayoutSource).toContain('.app-logo--menu.app-logo.el-button');
    expect(appShellLayoutSource).toContain('display: none !important;');
    expect(appShellLayoutSource).not.toContain('slot="head"');
  });

  it('keeps the shell content border color tied to the Polkaswap theme token', () => {
    expect(appShellLayoutSource).toContain('border-color: var(--s-color-base-content-primary);');
    expect(appShellLayoutSource).toContain('border-style: none;');
  });

  it('loads the footer through an async boundary', () => {
    expect(appShellLayoutSource).toContain(
      "const AppFooter = createAsyncComponent(() => import('@/components/App/Footer/AppFooter.vue'));"
    );
    expect(appShellLayoutSource).not.toContain("import AppFooter from '@/components/App/Footer/AppFooter.vue';");
  });

  it('loads the disclaimer through an async boundary', () => {
    expect(appShellLayoutSource).toContain(
      "const AppDisclaimer = createAsyncComponent(() => import('@/components/App/Header/AppDisclaimer.vue'));"
    );
    expect(appShellLayoutSource).not.toContain("import AppDisclaimer from '@/components/App/Header/AppDisclaimer.vue';");
  });

  it('loads the header through an async boundary', () => {
    expect(appShellLayoutSource).toContain(
      "const AppHeader = createAsyncComponent(() => import('@/components/App/Header/AppHeader.vue'));"
    );
    expect(appShellLayoutSource).not.toContain("import AppHeader from '@/components/App/Header/AppHeader.vue';");
  });

  it('loads the menu logo through a direct async boundary', () => {
    expect(appShellLayoutSource).toContain(
      "const AppLogoButton = createAsyncComponent(() => import('@/components/App/Header/AppLogoButton.vue'));"
    );
    expect(appShellLayoutSource).not.toContain("import { AppLogoButton } from '@/app/shell/components';");
  });

  it('loads the sidebar menu through an async boundary', () => {
    expect(appShellLayoutSource).toContain(
      "const AppMenu = createAsyncComponent(() => import('@/components/App/Menu/AppMenu.vue'));"
    );
    expect(appShellLayoutSource).not.toContain("import AppMenu from '@/components/App/Menu/AppMenu.vue';");
  });
});
