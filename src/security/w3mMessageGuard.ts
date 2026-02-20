const W3M_MESSAGE_PREFIXES = ['@w3m-app/', '@w3m-frame/'] as const;

export const DEFAULT_W3M_ALLOWED_ORIGINS = [
  'https://secure.walletconnect.org',
  'https://secure.walletconnect.com',
] as const;

type RegisterOptions = {
  /**
   * Additional origins that are allowed to emit `@w3m-*` postMessage events.
   * The default list targets WalletConnect's secure iframe origin(s).
   */
  allowedOrigins?: readonly string[];
};

const shouldGuardMessage = (data: unknown): boolean => {
  const type = (data as { type?: unknown } | null)?.type;
  if (typeof type !== 'string') return false;
  return W3M_MESSAGE_PREFIXES.some((prefix) => type.includes(prefix));
};

/**
 * Installs a capture-phase `message` handler that blocks `@w3m-*` postMessage traffic
 * unless it originates from a known WalletConnect secure iframe origin.
 *
 * This mitigates upstream code paths that parse message payloads without validating `event.origin`.
 *
 * @returns An unregister function.
 */
export function registerW3mMessageGuard(options: RegisterOptions = {}): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const allowed = new Set<string>([
    window.location.origin,
    ...DEFAULT_W3M_ALLOWED_ORIGINS,
    ...(options.allowedOrigins ?? []),
  ]);

  const handler = (event: MessageEvent) => {
    if (!shouldGuardMessage(event.data)) return;

    const origin = event.origin || 'null';
    if (allowed.has(origin)) return;

    // Block untrusted messages before downstream handlers (at-target bubble).
    event.stopImmediatePropagation();
  };

  window.addEventListener('message', handler, { capture: true });

  return () => {
    window.removeEventListener('message', handler, { capture: true });
  };
}
