const W3M_MESSAGE_PREFIXES = ['@w3m-app/', '@w3m-frame/'] as const;

/** Generous JSON-message limits applied before upstream wallet schema validation. */
export const W3M_MESSAGE_LIMITS = {
  collectionEntries: 2_048,
  nodes: 16_384,
  depth: 32,
  stringBytes: 1_048_576,
  discriminatorBytes: 256,
} as const;

export const DEFAULT_W3M_ALLOWED_ORIGINS = [
  'https://secure.walletconnect.org',
  'https://secure.walletconnect.com',
  'https://verify.walletconnect.org',
  'https://verify.walletconnect.com',
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

/** Counts UTF-8 bytes without allocating an encoded copy, stopping as soon as the budget is exceeded. */
function boundedStringBytes(value: string, budget: number): number {
  if (value.length > budget) return budget + 1;
  let bytes = 0;
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) bytes++;
    else if (code <= 0x7ff) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index++;
      } else bytes += 3;
    } else bytes += 3;
    if (bytes > budget) return bytes;
  }
  return bytes;
}

/**
 * Bounds work before Zod sees a wallet message (GHSA-mrhx-c7xc-m3w5).
 * Iterative traversal accepts ordinary JSON data and shared references, but rejects
 * cycles, accessors and exotic objects. It never serializes the untrusted payload.
 */
export function isBoundedW3mMessage(data: unknown): boolean {
  const pending: Array<{ value: unknown; depth: number; leave?: boolean }> = [{ value: data, depth: 0 }];
  const ancestors = new WeakSet<object>();
  let nodes = 0;
  let stringBytes = 0;

  try {
    // Union errors repeat invalid discriminator strings across branches.
    // Bound the top-level type before walking any payload or invoking Zod.
    if (data !== null && typeof data === 'object') {
      const type = Object.getOwnPropertyDescriptor(data, 'type');
      if (
        type &&
        'value' in type &&
        typeof type.value === 'string' &&
        boundedStringBytes(type.value, W3M_MESSAGE_LIMITS.discriminatorBytes) > W3M_MESSAGE_LIMITS.discriminatorBytes
      )
        return false;
    }
    while (pending.length) {
      const { value, depth, leave } = pending.pop()!;
      if (leave) {
        ancestors.delete(value as object);
        continue;
      }
      if (++nodes > W3M_MESSAGE_LIMITS.nodes || depth > W3M_MESSAGE_LIMITS.depth) return false;
      if (typeof value === 'string') {
        stringBytes += boundedStringBytes(value, W3M_MESSAGE_LIMITS.stringBytes - stringBytes);
        if (stringBytes > W3M_MESSAGE_LIMITS.stringBytes) return false;
        continue;
      }
      if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') continue;
      if (typeof value !== 'object' || ancestors.has(value)) return false;
      if (Array.isArray(value)) {
        if (value.length > W3M_MESSAGE_LIMITS.collectionEntries) return false;
        // Zod visits every array slot, including holes that object enumeration skips.
        // Require dense enumerable entries so every parsed slot consumes our node budget.
        for (let index = 0; index < value.length; index++) {
          if (!Object.getOwnPropertyDescriptor(value, String(index))?.enumerable) return false;
        }
      } else {
        const prototype = Object.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null) return false;
      }
      ancestors.add(value);
      pending.push({ value, depth, leave: true });
      let entries = 0;
      for (const key in value) {
        if (!Object.hasOwn(value, key)) continue;
        if (++entries > W3M_MESSAGE_LIMITS.collectionEntries) return false;
        stringBytes += boundedStringBytes(key, W3M_MESSAGE_LIMITS.stringBytes - stringBytes);
        if (stringBytes > W3M_MESSAGE_LIMITS.stringBytes) return false;
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !('value' in descriptor)) return false;
        // RPC method names also discriminate nested unions; transaction calldata has no such restriction.
        if (
          key === 'method' &&
          typeof descriptor.value === 'string' &&
          boundedStringBytes(descriptor.value, W3M_MESSAGE_LIMITS.discriminatorBytes) >
            W3M_MESSAGE_LIMITS.discriminatorBytes
        )
          return false;
        if (nodes + pending.length >= W3M_MESSAGE_LIMITS.nodes) return false;
        pending.push({ value: descriptor.value, depth: depth + 1 });
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Installs a capture-phase `message` handler that blocks `@w3m-*` postMessage traffic
 * unless it originates from a known WalletConnect iframe origin and stays within
 * the bounded JSON-message limits above. Opaque origins are never trusted.
 *
 * This mitigates upstream code paths that parse message payloads without validating `event.origin`.
 *
 * @returns An unregister function.
 */
export function registerW3mMessageGuard(options: RegisterOptions = {}): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const allowed = new Set<string>(
    [window.location.origin, ...DEFAULT_W3M_ALLOWED_ORIGINS, ...(options.allowedOrigins ?? [])].filter(
      (origin) => !!origin && origin !== 'null'
    )
  );

  const handler = (event: MessageEvent) => {
    if (!shouldGuardMessage(event.data)) return;

    const origin = event.origin || 'null';
    if (allowed.has(origin) && isBoundedW3mMessage(event.data)) return;

    // Block untrusted messages before downstream handlers (at-target bubble).
    event.stopImmediatePropagation();
  };

  window.addEventListener('message', handler, { capture: true });

  return () => {
    window.removeEventListener('message', handler, { capture: true });
  };
}
