import { describe, expect, it, vi } from 'vitest';

import { registerW3mMessageGuard } from '@/security/w3mMessageGuard';

describe('w3m message guard', () => {
  it('blocks @w3m-* messages from untrusted origins', () => {
    const unregister = registerW3mMessageGuard();
    const listener = vi.fn();

    window.addEventListener('message', listener);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: '@w3m-app/CONNECT_EMAIL' },
        origin: 'https://evil.example',
      })
    );

    expect(listener).not.toHaveBeenCalled();

    window.removeEventListener('message', listener);
    unregister();
  });

  it('allows @w3m-* messages from the WalletConnect secure iframe origin', () => {
    const unregister = registerW3mMessageGuard();
    const listener = vi.fn();

    window.addEventListener('message', listener);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: '@w3m-frame/FRAME_READY' },
        origin: 'https://secure.walletconnect.org',
      })
    );

    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener('message', listener);
    unregister();
  });

  it('does not block unrelated messages', () => {
    const unregister = registerW3mMessageGuard();
    const listener = vi.fn();

    window.addEventListener('message', listener);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'UNRELATED_EVENT' },
        origin: 'https://evil.example',
      })
    );

    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener('message', listener);
    unregister();
  });
});
