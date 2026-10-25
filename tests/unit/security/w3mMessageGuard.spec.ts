import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_W3M_ALLOWED_ORIGINS,
  isBoundedW3mMessage,
  registerW3mMessageGuard,
  W3M_MESSAGE_LIMITS,
} from '@/security/w3mMessageGuard';

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

  it('rejects opaque origins even when the app itself has a file origin', () => {
    const actualWindow = window;
    const listener = vi.fn();
    vi.stubGlobal('window', {
      location: { origin: 'null' },
      addEventListener: actualWindow.addEventListener.bind(actualWindow),
      removeEventListener: actualWindow.removeEventListener.bind(actualWindow),
    });
    const unregister = registerW3mMessageGuard({ allowedOrigins: ['null'] });
    actualWindow.addEventListener('message', listener);
    try {
      for (const origin of ['null', '']) {
        actualWindow.dispatchEvent(new MessageEvent('message', { data: { type: '@w3m-frame/READY' }, origin }));
      }
      expect(listener).not.toHaveBeenCalled();
    } finally {
      actualWindow.removeEventListener('message', listener);
      unregister();
      vi.unstubAllGlobals();
    }
  });

  it('preserves normal wallet requests and blocks oversized payloads from trusted origins', () => {
    const unregister = registerW3mMessageGuard();
    const listener = vi.fn();
    window.addEventListener('message', listener);
    const request = {
      type: '@w3m-app/RPC_REQUEST',
      payload: {
        method: 'eth_sendTransaction',
        params: [{ to: `0x${'1'.repeat(40)}`, data: `0x${'ab'.repeat(131_072)}`, value: '0x0' }],
      },
    };
    try {
      window.dispatchEvent(new MessageEvent('message', { data: request, origin: DEFAULT_W3M_ALLOWED_ORIGINS[0] }));
      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].data).toBe(request);
      listener.mockClear();
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: '@w3m-frame/GET_USER_SUCCESS', payload: { accounts: Array(2_049).fill({}) } },
          origin: DEFAULT_W3M_ALLOWED_ORIGINS[0],
        })
      );
      expect(listener).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('message', listener);
      unregister();
    }
  });
});

describe('bounded wallet message inspection', () => {
  it('accepts JSON values and shared references without changing the input', () => {
    const account = { address: '0x123', chainId: 1 };
    const message = { accounts: [account, account], optional: undefined, enabled: true, result: null };
    expect(isBoundedW3mMessage(message)).toBe(true);
    expect(message.accounts[0]).toBe(message.accounts[1]);
    expect(isBoundedW3mMessage(Object.assign(Object.create(null), { type: '@w3m-frame/READY' }))).toBe(true);
  });

  it('rejects oversized arrays and objects before schema validation', () => {
    expect(isBoundedW3mMessage(Array(W3M_MESSAGE_LIMITS.collectionEntries + 1))).toBe(false);
    expect(
      isBoundedW3mMessage(Object.fromEntries(Array.from({ length: 2_049 }, (_, index) => [`key${index}`, null])))
    ).toBe(false);
    expect(isBoundedW3mMessage(Array.from({ length: 16 }, () => Array(1_100).fill(null)))).toBe(false);
  });

  it('caps nesting and rejects cycles while accepting the depth boundary', () => {
    let nested: unknown = null;
    for (let depth = 0; depth < W3M_MESSAGE_LIMITS.depth; depth++) nested = { nested };
    expect(isBoundedW3mMessage(nested)).toBe(true);
    expect(isBoundedW3mMessage({ nested })).toBe(false);
    const cycle: { child?: unknown } = {};
    cycle.child = cycle;
    expect(isBoundedW3mMessage(cycle)).toBe(false);
  });

  it('rejects sparse wallet collections that Zod would expand into validation errors', () => {
    const sparseCalls = Array(W3M_MESSAGE_LIMITS.collectionEntries);
    const request = {
      type: '@w3m-app/RPC_REQUEST',
      payload: {
        method: 'wallet_sendCalls',
        params: Array.from({ length: W3M_MESSAGE_LIMITS.collectionEntries }, () => ({
          calls: Array(W3M_MESSAGE_LIMITS.collectionEntries),
        })),
      },
    };
    expect(isBoundedW3mMessage(request)).toBe(false);
    expect(isBoundedW3mMessage({ calls: [sparseCalls, sparseCalls] })).toBe(false);
    expect(isBoundedW3mMessage([undefined, null, { to: '0x123', value: '0x0' }])).toBe(true);
    const hiddenSlot = Object.defineProperty([], '0', { value: null, enumerable: false });
    expect(isBoundedW3mMessage(hiddenSlot)).toBe(false);
  });

  it('counts aggregate UTF-8 string bytes including keys without encoding a large buffer', () => {
    const limit = W3M_MESSAGE_LIMITS.stringBytes;
    expect(isBoundedW3mMessage('a'.repeat(limit))).toBe(true);
    expect(isBoundedW3mMessage('a'.repeat(limit + 1))).toBe(false);
    expect(isBoundedW3mMessage('é'.repeat(limit / 2))).toBe(true);
    expect(isBoundedW3mMessage('界'.repeat(Math.ceil(limit / 3)))).toBe(false);
    expect(isBoundedW3mMessage('😀'.repeat(limit / 4))).toBe(true);
    expect(isBoundedW3mMessage(`${'😀'.repeat(limit / 4)}a`)).toBe(false);
    expect(isBoundedW3mMessage(`${'a'.repeat(limit - 3)}\ud800`)).toBe(true);
    expect(isBoundedW3mMessage({ ['a'.repeat(limit)]: 'extra' })).toBe(false);
    expect(isBoundedW3mMessage(['a'.repeat(limit / 2), 'a'.repeat(limit / 2)])).toBe(false);
  });

  it('bounds message types and nested RPC methods before union errors can amplify them', () => {
    expect(isBoundedW3mMessage({ type: `@w3m-frame/${'x'.repeat(16_384)}` })).toBe(false);
    expect(
      isBoundedW3mMessage({ type: '@w3m-app/RPC_REQUEST', payload: { method: `eth_${'x'.repeat(16_384)}` } })
    ).toBe(false);
    expect(isBoundedW3mMessage({ payload: { nested: { method: 'é'.repeat(129) } } })).toBe(false);
    expect(isBoundedW3mMessage({ type: 'x'.repeat(W3M_MESSAGE_LIMITS.discriminatorBytes) })).toBe(true);
    expect(isBoundedW3mMessage({ payload: { method: 'é'.repeat(128) } })).toBe(true);
    expect(
      isBoundedW3mMessage({
        type: '@w3m-app/RPC_REQUEST',
        payload: { method: 'eth_sendTransaction', params: [{ data: `0x${'ab'.repeat(131_072)}` }] },
      })
    ).toBe(true);
  });

  it('rejects getters and non-JSON objects without invoking accessors', () => {
    const getter = vi.fn(() => 'unsafe');
    const value = Object.defineProperty({}, 'value', { enumerable: true, get: getter });
    expect(isBoundedW3mMessage(value)).toBe(false);
    expect(getter).not.toHaveBeenCalled();
    for (const exotic of [new Map(), new Set(), new Date(), new Uint8Array(4), () => undefined, 1n, Symbol('x')]) {
      expect(isBoundedW3mMessage(exotic)).toBe(false);
    }
  });
});
