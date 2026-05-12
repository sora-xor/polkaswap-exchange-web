import { afterEach, describe, expect, it } from 'vitest';

import {
  hasTelegramLaunchParams,
  hasTelegramWebApp,
  loadTelegramWebAppScript,
  shouldLoadTelegramMiniApp,
  TELEGRAM_WEB_APP_SCRIPT_SRC,
} from '@/utils/telegramLaunch';

describe('utils/telegramLaunch', () => {
  afterEach(() => {
    delete (window as any).Telegram;
    document.head.querySelectorAll(`script[src="${TELEGRAM_WEB_APP_SCRIPT_SRC}"]`).forEach((script) => {
      script.remove();
    });
    window.history.replaceState({}, '', '/');
  });

  it('does not request the Telegram SDK for normal web URLs', async () => {
    window.history.replaceState({}, '', '/#/swap');

    await loadTelegramWebAppScript();

    expect(hasTelegramLaunchParams()).toBe(false);
    expect(hasTelegramWebApp()).toBe(false);
    expect(shouldLoadTelegramMiniApp()).toBe(false);
    expect(document.head.querySelector(`script[src="${TELEGRAM_WEB_APP_SCRIPT_SRC}"]`)).toBeNull();
  });

  it('loads the Telegram SDK asynchronously for Telegram launch URLs', async () => {
    window.history.replaceState({}, '', '/?tgWebAppData=telegram-init');

    const pending = loadTelegramWebAppScript();
    const script = document.head.querySelector<HTMLScriptElement>(`script[src="${TELEGRAM_WEB_APP_SCRIPT_SRC}"]`);

    expect(hasTelegramLaunchParams()).toBe(true);
    expect(shouldLoadTelegramMiniApp()).toBe(true);
    expect(script).toBeTruthy();
    expect(script?.async).toBe(true);

    (window as any).Telegram = { WebApp: {} };
    script?.dispatchEvent(new Event('load'));
    await pending;

    expect(hasTelegramWebApp()).toBe(true);
  });
});
