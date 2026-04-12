import { describe, expect, it } from 'vitest';

import appSource from '@/App.vue?raw';

describe('App source', () => {
  it('wraps the app shell with the wallet notification provider so transaction toasts can render', () => {
    expect(appSource).toContain('<notification-provider>');
    expect(appSource).toContain('</notification-provider>');
    expect(appSource).toContain('NotificationProvider: components.NotificationProvider');
  });

  it('renders the desktop menu logo through the named AppMenu head slot', () => {
    expect(appSource).toContain('<template #head>');
    expect(appSource).toContain('<app-logo-button class="app-logo--menu" :theme="libraryTheme" @click="goToSwap"></app-logo-button>');
    expect(appSource).not.toContain('slot="head"');
  });
});
