#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

/**
 * Purge only Polkaswap's production CDN after the validated IPFS origin is saved.
 * This operator command deliberately does not run during `ipfs:publish`.
 * Credentials are accepted through the environment, never CLI arguments.
 */
const ZONE_ID = 5860217;
const ZONE_NAME = 'polkaswap';
const HOSTNAME = 'polkaswap.io';
const ZONE_URL = `https://api.bunny.net/pullzone/${ZONE_ID}`;

/** Expected failures contain only locally defined, credential-free messages. */
class BunnyPurgeError extends Error {}

/** Read an existing API key without accepting header injection or printing it. */
export function readBunnyApiKey(env = process.env) {
  const key = env.BUNNY_API_KEY;
  if (typeof key !== 'string' || !/^[\x21-\x7e]{1,4096}$/.test(key)) {
    throw new BunnyPurgeError('Set BUNNY_API_KEY to an existing valid Bunny API key.');
  }
  return key;
}

/**
 * Verify the fixed production zone before requesting one complete cache purge.
 * No redirects or retries are allowed; a lost POST response is an uncertain
 * submission and must be checked against live CDN state before another attempt.
 *
 * @param {{ apiKey: string, fetchImpl?: typeof fetch, timeoutMs?: number }} options
 * @returns {Promise<{ zoneId: number, name: string, hostname: string, status: string }>}
 */
export async function purgePolkaswapCache({ apiKey, fetchImpl = globalThis.fetch, timeoutMs = 15_000 }) {
  const key = readBunnyApiKey({ BUNNY_API_KEY: apiKey });
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) {
    throw new BunnyPurgeError('Bunny request timeout must be between 1 and 30000 milliseconds.');
  }

  /** Keep both the HTTP request and its response body under the same deadline. */
  async function request(method) {
    const isPurge = method === 'POST';
    try {
      const response = await fetchImpl(isPurge ? `${ZONE_URL}/purgeCache` : ZONE_URL, {
        method,
        redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { AccessKey: key, Accept: 'application/json', ...(isPurge && { 'Content-Type': 'application/json' }) },
        ...(isPurge && { body: '{}' }),
      });
      if (response.status !== (isPurge ? 204 : 200) || response.redirected) {
        throw new BunnyPurgeError(
          isPurge
            ? 'Bunny did not confirm the purge. Check live CDN state before retrying.'
            : 'Bunny pull-zone verification failed; no purge was sent.'
        );
      }
      return isPurge ? undefined : await response.json();
    } catch {
      // Bunny's zone model can contain certificate keys; never expose response
      // bodies, fetch errors, or nested causes through operator-facing output.
      throw new BunnyPurgeError(
        isPurge
          ? 'Bunny did not confirm the purge. Check live CDN state before retrying.'
          : 'Bunny pull-zone verification failed; no purge was sent.'
      );
    }
  }

  const zone = await request('GET');
  if (
    zone?.Id !== ZONE_ID ||
    zone?.Name !== ZONE_NAME ||
    !Array.isArray(zone?.Hostnames) ||
    !zone.Hostnames.some((hostname) => hostname?.Value === HOSTNAME)
  ) {
    throw new BunnyPurgeError('Bunny pull-zone identity does not match polkaswap / polkaswap.io; no purge was sent.');
  }

  await request('POST');
  return { zoneId: ZONE_ID, name: ZONE_NAME, hostname: HOSTNAME, status: 'purge-accepted' };
}

/** Run the prompt-free operator CLI and return a nonzero exit code on failure. */
export async function runPurgeCli({
  argv = process.argv.slice(2),
  env = process.env,
  fetchImpl = globalThis.fetch,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  if (argv.length === 1 && argv[0] === '--help') {
    stdout.write(
      'Usage: yarn ipfs:purge:bunny\n' +
        'Purges polkaswap (5860217) / polkaswap.io without a prompt.\n' +
        'Requires BUNNY_API_KEY. Run only after validating and saving the production origin.\n'
    );
    return 0;
  }
  try {
    if (argv.length) throw new BunnyPurgeError('No arguments are supported. Use BUNNY_API_KEY and --help.');
    await purgePolkaswapCache({ apiKey: readBunnyApiKey(env), fetchImpl });
    stdout.write('Bunny accepted the polkaswap (5860217) cache purge. Warm assets and verify the live CID.\n');
    return 0;
  } catch (error) {
    stderr.write(`${error instanceof BunnyPurgeError ? error.message : 'Bunny purge failed.'}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runPurgeCli();
}
