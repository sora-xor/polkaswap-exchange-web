import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_W3M_ALLOWED_ORIGINS, registerW3mMessageGuard } from '@/security/w3mMessageGuard';

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

  it('allows @w3m-* messages from trusted WalletConnect origins', () => {
    const unregister = registerW3mMessageGuard();
    const listener = vi.fn();

    window.addEventListener('message', listener);

    for (const origin of DEFAULT_W3M_ALLOWED_ORIGINS) {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: '@w3m-frame/FRAME_READY' },
          origin,
        })
      );
    }

    expect(listener).toHaveBeenCalledTimes(DEFAULT_W3M_ALLOWED_ORIGINS.length);

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
