const INTENT_DOMAIN = 'org.polkaswap.agent.intent';
const DIGEST_DOMAIN = 'org.polkaswap.agent.digest';

export const AGENT_INTENT_SCHEMA_VERSION = 1;
export const AGENT_INTENT_ID_PATTERN = /^polkaswap:(swap|transfer|add-liquidity|remove-liquidity):sha256:[0-9a-f]{64}$/;

type CanonicalJson = null | boolean | number | string | CanonicalJson[] | { [key: string]: CanonicalJson };

/**
 * Converts an intent payload into a deterministic JSON representation.
 *
 * Intent payloads are deliberately limited to JSON data. Object keys are sorted
 * by UTF-16 code unit order, undefined values are omitted from objects, and
 * unsupported or cyclic values are rejected instead of being hashed ambiguously.
 */
export function canonicalizeAgentIntent(value: unknown): string {
  const activeObjects = new WeakSet<object>();

  const canonicalize = (entry: unknown, path: string): CanonicalJson => {
    if (entry === null || typeof entry === 'string' || typeof entry === 'boolean') return entry;

    if (typeof entry === 'number') {
      if (!Number.isFinite(entry)) throw new TypeError(`Intent value at ${path} must be a finite number.`);
      return Object.is(entry, -0) ? 0 : entry;
    }

    if (Array.isArray(entry)) {
      if (activeObjects.has(entry)) throw new TypeError(`Intent value at ${path} must not be cyclic.`);
      activeObjects.add(entry);
      const result = entry.map((item, index) => {
        if (item === undefined || typeof item === 'function' || typeof item === 'symbol') {
          throw new TypeError(`Intent array value at ${path}[${index}] is not canonical JSON.`);
        }
        return canonicalize(item, `${path}[${index}]`);
      });
      activeObjects.delete(entry);
      return result;
    }

    if (typeof entry === 'object') {
      if (activeObjects.has(entry)) throw new TypeError(`Intent value at ${path} must not be cyclic.`);
      activeObjects.add(entry);

      const result = Object.create(null) as Record<string, CanonicalJson>;
      const record = entry as Record<string, unknown>;
      const keys = Object.keys(record).sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));

      for (const key of keys) {
        const item = record[key];
        if (item === undefined) continue;
        if (typeof item === 'function' || typeof item === 'symbol' || typeof item === 'bigint') {
          throw new TypeError(`Intent object value at ${path}.${key} is not canonical JSON.`);
        }
        result[key] = canonicalize(item, `${path}.${key}`);
      }

      activeObjects.delete(entry);
      return result;
    }

    throw new TypeError(`Intent value at ${path} is not canonical JSON.`);
  };

  return JSON.stringify(canonicalize(value, '$'));
}

/** Returns a lowercase SHA-256 digest without accepting an insecure fallback. */
export async function sha256Hex(value: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('Web Crypto SHA-256 is unavailable in this runtime.');

  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Creates a domain-separated digest for an immutable portion of an intent. */
export async function createAgentDigest(purpose: string, payload: unknown): Promise<string> {
  if (!/^[a-z][a-z0-9.-]{0,63}$/.test(purpose)) {
    throw new TypeError('Intent digest purpose must be a lowercase domain label.');
  }

  return sha256Hex(
    canonicalizeAgentIntent({
      domain: DIGEST_DOMAIN,
      schemaVersion: AGENT_INTENT_SCHEMA_VERSION,
      purpose,
      payload,
    })
  );
}

/** Returns an unpredictable 128-bit nonce without accepting an insecure fallback. */
export function createAgentIntentNonce(): string {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) throw new Error('Web Crypto randomness is unavailable in this runtime.');

  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates the full, domain-separated identifier for a normalized financial intent.
 */
export async function createAgentIntentId(
  action: 'swap' | 'transfer' | 'add-liquidity' | 'remove-liquidity',
  payload: unknown
): Promise<string> {
  const canonical = canonicalizeAgentIntent({
    domain: INTENT_DOMAIN,
    schemaVersion: AGENT_INTENT_SCHEMA_VERSION,
    action,
    payload,
  });
  const digest = await sha256Hex(canonical);

  return `polkaswap:${action}:sha256:${digest}`;
}
