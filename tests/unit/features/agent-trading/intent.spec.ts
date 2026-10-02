import { describe, expect, it } from 'vitest';

import {
  AGENT_INTENT_ID_PATTERN,
  canonicalizeAgentIntent,
  createAgentDigest,
  createAgentIntentId,
  createAgentIntentNonce,
  sha256Hex,
} from '@/features/agent-trading/intent';

describe('agent intent digests', () => {
  it('canonicalizes object keys without changing array order', () => {
    expect(canonicalizeAgentIntent({ z: 1, nested: { b: true, a: 'first' }, omitted: undefined, list: [2, 1] })).toBe(
      '{"list":[2,1],"nested":{"a":"first","b":true},"z":1}'
    );
    expect(canonicalizeAgentIntent(JSON.parse('{"__proto__":"bound","constructor":"plain"}'))).toBe(
      '{"__proto__":"bound","constructor":"plain"}'
    );
  });

  it('computes the standard SHA-256 test vector', async () => {
    await expect(sha256Hex('abc')).resolves.toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('creates deterministic, full-length, domain-separated intent identifiers', async () => {
    const first = await createAgentIntentId('swap', { amount: '1', assets: ['0xin', '0xout'] });
    const reordered = await createAgentIntentId('swap', { assets: ['0xin', '0xout'], amount: '1' });
    const differentAction = await createAgentIntentId('transfer', { amount: '1', assets: ['0xin', '0xout'] });

    expect(first).toBe(reordered);
    expect(first).toMatch(AGENT_INTENT_ID_PATTERN);
    expect(first).toMatch(/^polkaswap:swap:sha256:[0-9a-f]{64}$/);
    expect(differentAction).not.toBe(first);
  });

  it('does not collide for payloads that collided under the removed 32-bit hash', async () => {
    const left = await createAgentIntentId('swap', { nonce: '5c7149c-3tnnxy-ie' });
    const right = await createAgentIntentId('swap', { nonce: 'ffd0eb30-1e1xyq3-1f5d' });

    expect(left).not.toBe(right);
    expect(left).toMatch(/:sha256:[0-9a-f]{64}$/);
    expect(right).toMatch(/:sha256:[0-9a-f]{64}$/);
  });

  it('separates component purposes and generates unique 128-bit nonces', async () => {
    const quoteDigest = await createAgentDigest('swap.quote', { amount: '1' });
    const callDigest = await createAgentDigest('swap.call', { amount: '1' });
    const nonces = new Set(Array.from({ length: 32 }, () => createAgentIntentNonce()));

    expect(quoteDigest).not.toBe(callDigest);
    expect(nonces.size).toBe(32);
    expect([...nonces].every((nonce) => /^[0-9a-f]{32}$/.test(nonce))).toBe(true);
  });

  it('rejects ambiguous non-JSON and cyclic payloads', async () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    expect(() => canonicalizeAgentIntent({ amount: Number.POSITIVE_INFINITY })).toThrow(/finite number/);
    expect(() => canonicalizeAgentIntent([undefined])).toThrow(/not canonical JSON/);
    expect(() => canonicalizeAgentIntent(cyclic)).toThrow(/must not be cyclic/);
  });
});
