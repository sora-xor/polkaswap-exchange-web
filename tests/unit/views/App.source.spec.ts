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
});
