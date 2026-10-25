import { afterEach, describe, expect, it, vi } from 'vitest';

import { purgePolkaswapCache, readBunnyApiKey, runPurgeCli } from '../../../../scripts/ipfs/purge-bunny.mjs';

const apiKey = 'test-only-bunny-key';
const zoneUrl = 'https://api.bunny.net/pullzone/5860217';
const zone = { Id: 5860217, Name: 'polkaswap', Hostnames: [{ Value: 'polkaswap.io' }] };

/** Build a fresh offline response that also models sensitive Bunny zone fields. */
function zoneResponse(payload: unknown = zone) {
  return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

/** Capture CLI output without touching the process streams or exit status. */
function captureOutput() {
  return { stdout: { write: vi.fn() }, stderr: { write: vi.fn() } };
}

afterEach(() => vi.restoreAllMocks());

describe('readBunnyApiKey', () => {
  it('reads the key only from the supplied environment', () => {
    expect(readBunnyApiKey({ BUNNY_API_KEY: apiKey })).toBe(apiKey);
  });

  it.each([undefined, '', ' ', 'key\r\ninjected-header: value', 'key with spaces', 'x'.repeat(4097)])(
    'rejects absent or invalid keys without exposing their value',
    (key) => {
      expect(() => readBunnyApiKey({ BUNNY_API_KEY: key })).toThrow(
        'Set BUNNY_API_KEY to an existing valid Bunny API key.'
      );
    }
  );
});

describe('purgePolkaswapCache', () => {
  it('verifies the exact zone before one full-zone POST, with strict transport settings', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(zoneResponse())
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const timeout = vi.spyOn(AbortSignal, 'timeout');

    await expect(purgePolkaswapCache({ apiKey, fetchImpl })).resolves.toEqual({
      zoneId: 5860217,
      name: 'polkaswap',
      hostname: 'polkaswap.io',
      status: 'purge-accepted',
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl).toHaveBeenNthCalledWith(1, zoneUrl, {
      method: 'GET',
      redirect: 'error',
      signal: expect.any(AbortSignal),
      headers: { AccessKey: apiKey, Accept: 'application/json' },
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(2, `${zoneUrl}/purgeCache`, {
      method: 'POST',
      redirect: 'error',
      signal: expect.any(AbortSignal),
      headers: { AccessKey: apiKey, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(timeout.mock.calls).toEqual([[15_000], [15_000]]);
  });

  it.each([
    { ...zone, Id: 1 },
    { ...zone, Id: '5860217' },
    { ...zone, Name: 'polkaswap-testnet' },
    { ...zone, Hostnames: [{ Value: 'polkaswap.io.attacker.example' }] },
    { ...zone, Hostnames: [] },
    { ...zone, Hostnames: null },
    null,
    {},
  ])('never purges a mismatched or malformed zone', async (payload) => {
    const fetchImpl = vi.fn().mockResolvedValue(zoneResponse(payload));
    await expect(purgePolkaswapCache({ apiKey, fetchImpl })).rejects.toThrow('identity does not match');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each([301, 302, 307, 308, 401, 403, 404, 429, 500])(
    'rejects verification HTTP %s without POST',
    async (status) => {
      const fetchImpl = vi.fn().mockResolvedValue(new Response('secret body', { status }));
      await expect(purgePolkaswapCache({ apiKey, fetchImpl })).rejects.toThrow(
        'Bunny pull-zone verification failed; no purge was sent.'
      );
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }
  );

  it('rejects a response marked redirected even when it has status 200', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ status: 200, redirected: true });
    await expect(purgePolkaswapCache({ apiKey, fetchImpl })).rejects.toThrow('no purge was sent');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed JSON without exposing body content', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('private-certificate-key', { status: 200 }));
    await expect(purgePolkaswapCache({ apiKey, fetchImpl })).rejects.toThrow(
      'Bunny pull-zone verification failed; no purge was sent.'
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each([200, 202, 301, 401, 429, 500])('does not claim a confirmed purge for HTTP %s', async (status) => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(zoneResponse())
      .mockResolvedValueOnce(new Response('secret', { status }));
    await expect(purgePolkaswapCache({ apiKey, fetchImpl })).rejects.toThrow('Check live CDN state before retrying');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry an uncertain POST or leak a transport error', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(zoneResponse()).mockRejectedValueOnce(new Error(apiKey));
    await expect(purgePolkaswapCache({ apiKey, fetchImpl })).rejects.toThrow(
      'Bunny did not confirm the purge. Check live CDN state before retrying.'
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('aborts a hanging verification at its deadline and never posts', async () => {
    const fetchImpl = vi.fn(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        })
    );
    await expect(purgePolkaswapCache({ apiKey, fetchImpl, timeoutMs: 10 })).rejects.toThrow('no purge was sent');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each([0, -1, 0.5, 30_001, Infinity])('rejects an invalid timeout before network access', async (timeoutMs) => {
    const fetchImpl = vi.fn();
    await expect(purgePolkaswapCache({ apiKey, fetchImpl, timeoutMs })).rejects.toThrow('timeout must be between');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('runPurgeCli', () => {
  it('runs without confirmation arguments and only emits a safe success summary', async () => {
    const output = captureOutput();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(zoneResponse({ ...zone, ZoneSecurityKey: 'private-zone-key' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect(await runPurgeCli({ argv: [], env: { BUNNY_API_KEY: apiKey }, fetchImpl, ...output })).toBe(0);
    expect(output.stdout.write).toHaveBeenCalledWith(
      'Bunny accepted the polkaswap (5860217) cache purge. Warm assets and verify the live CID.\n'
    );
    expect(output.stderr.write).not.toHaveBeenCalled();
  });

  it('describes the destructive scope and prerequisites in help without credentials or network', async () => {
    const output = captureOutput();
    const fetchImpl = vi.fn();
    expect(await runPurgeCli({ argv: ['--help'], env: {}, fetchImpl, ...output })).toBe(0);
    expect(output.stdout.write).toHaveBeenCalledWith(expect.stringContaining('without a prompt'));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects arguments without echoing them or contacting Bunny', async () => {
    const output = captureOutput();
    const fetchImpl = vi.fn();
    expect(await runPurgeCli({ argv: ['--api-key', apiKey], env: {}, fetchImpl, ...output })).toBe(1);
    expect(output.stderr.write).toHaveBeenCalledWith('No arguments are supported. Use BUNNY_API_KEY and --help.\n');
    expect(output.stdout.write).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fails closed when the credential is absent', async () => {
    const output = captureOutput();
    const fetchImpl = vi.fn();
    expect(await runPurgeCli({ argv: [], env: {}, fetchImpl, ...output })).toBe(1);
    expect(output.stderr.write).toHaveBeenCalledWith('Set BUNNY_API_KEY to an existing valid Bunny API key.\n');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sanitizes network exceptions and returns nonzero', async () => {
    const output = captureOutput();
    const fetchImpl = vi.fn().mockRejectedValue(new Error(`request AccessKey=${apiKey}`));
    expect(await runPurgeCli({ argv: [], env: { BUNNY_API_KEY: apiKey }, fetchImpl, ...output })).toBe(1);
    expect(output.stderr.write).toHaveBeenCalledWith('Bunny pull-zone verification failed; no purge was sent.\n');
    expect(output.stdout.write).not.toHaveBeenCalled();
  });
});
