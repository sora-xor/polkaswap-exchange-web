import assert from 'node:assert/strict';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  closeSync,
  constants,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { validatePaymentRequest } from '@sora/sora-pay/core';

export const REFUND_HANDOFF_ENV = 'PS_STORE_REHEARSAL_REFUND_HANDOFF';
export const REFUND_PREFIX = '/__store-refund-rehearsal/v1';
const PRIVATE_ROOT = '/Users/takemiyamakoto/dev/sora-pay/private';
const ORIGIN = 'http://127.0.0.1:41829';
const GROUP = 'cnWUWKLZmNjQXGzYAF7YuRSiW1pKTRTzu4fmcYmWQX6UMGQUZ';
const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const DENOMINATION = '100000000000000000000000000000000000000';
const MAX_SIGNING_WINDOW_MS = 30 * 60 * 1000;
const HASH = /^0x[a-f0-9]{64}$/;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const keys = (value, expected) =>
  assert(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).sort().join(',') === [...expected].sort().join(',')
  );

/** Accept one reviewed exact native-XOR refund, never arbitrary browser-supplied payment details. */
export function validateRefundHandoff(value) {
  keys(value, ['version', 'orderId', 'paymentRequest']);
  assert.equal(value.version, 1);
  assert.match(value.orderId, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  const request = value.paymentRequest;
  keys(request, [
    'version',
    'merchant',
    'chainGenesisHash',
    'assetId',
    'payer',
    'recipient',
    'amountCodec',
    'decimals',
    'denomination',
    'reference',
    'expiresAt',
  ]);
  keys(request.merchant, ['id', 'name']);
  validatePaymentRequest(request);
  assert.equal(request.merchant.id, 'polkaswap-community-store');
  assert.equal(request.merchant.name, 'Polkaswap Community Store');
  assert.equal(request.chainGenesisHash, GENESIS);
  assert.equal(request.assetId, '0x0200000000000000000000000000000000000000000000000000000000000000');
  assert.equal(request.payer, GROUP);
  assert.equal(request.decimals, 18);
  assert.equal(request.denomination, DENOMINATION);
  assert.equal(encodeAddress(decodeAddress(request.recipient), 69), request.recipient);
  assert.notEqual(request.recipient, GROUP);
  assert.match(request.reference, /^sp_[a-f0-9]{32}$/);
  // Expired journals remain inspectable; new signing windows must stay bounded.
  assert(Date.parse(request.expiresAt) <= Date.now() + MAX_SIGNING_WINDOW_MS);
  return structuredClone(value);
}

/** Read only regular owner-only files, with no symlink or hardlink following. */
function privateRead(path, maximum = 16_384) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = fstatSync(fd);
    assert(
      info.isFile() &&
        info.nlink === 1 &&
        info.uid === process.getuid() &&
        (info.mode & 0o777) === 0o600 &&
        info.size <= maximum
    );
    return readFileSync(fd);
  } finally {
    closeSync(fd);
  }
}

/** Exclusive file and directory fsync make the signing claim survive process/browser restarts. */
function privateWriteNew(path, value) {
  const fd = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try {
    writeFileSync(fd, JSON.stringify(value) + '\n');
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  const directory = openSync(dirname(path), constants.O_RDONLY);
  try {
    fsyncSync(directory);
  } finally {
    closeSync(directory);
  }
}

/** Keep a permanent one-attempt journal beside the reviewed handoff; outcomes never unlock a claim. */
export function openRefundHandoff(path, { privateRoot = PRIVATE_ROOT } = {}) {
  assert.equal(resolve(path), path);
  assert.equal(dirname(path), privateRoot);
  assert.equal(realpathSync(privateRoot), privateRoot);
  assert.match(basename(path), /^refund-rehearsal-[a-z0-9-]+\.json$/);
  const directory = lstatSync(privateRoot);
  assert(directory.isDirectory() && directory.uid === process.getuid() && (directory.mode & 0o777) === 0o700);
  const bytes = privateRead(path);
  const handoff = validateRefundHandoff(JSON.parse(bytes.toString('utf8')));
  const handoffSha256 = hash(bytes);
  const sidecar = (name) => join(privateRoot, basename(path) + '.' + name + '.json');
  const existing = (name) => {
    const filename = sidecar(name);
    // lstat also detects dangling symlinks, which must fail closed rather than look unused.
    try {
      lstatSync(filename);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
    const value = JSON.parse(privateRead(filename).toString('utf8'));
    assert.equal(value.handoffSha256, handoffSha256);
    return value;
  };
  const unchanged = () => assert.equal(hash(privateRead(path)), handoffSha256);
  const state = () => {
    unchanged();
    const claim = existing('claim');
    const submitted = existing('submitted');
    const canceled = existing('canceled');
    const uncertain = existing('uncertain');
    assert(!((submitted || canceled || uncertain) && !claim));
    assert(!(canceled && (submitted || uncertain)));
    return {
      ...handoff,
      handoffSha256,
      state: submitted
        ? 'submitted'
        : canceled
          ? 'canceled'
          : uncertain
            ? 'uncertain'
            : claim
              ? 'claimed'
              : 'available',
      ...(submitted ? { transactionHash: submitted.transactionHash } : {}),
    };
  };
  state();
  return {
    state,
    claim(expected) {
      keys(expected, ['handoffSha256', 'orderId']);
      assert.equal(expected.handoffSha256, handoffSha256);
      assert.equal(expected.orderId, handoff.orderId);
      assert.equal(state().state, 'available');
      const remaining = Date.parse(handoff.paymentRequest.expiresAt) - Date.now();
      assert(remaining > 0 && remaining <= MAX_SIGNING_WINDOW_MS);
      const attemptToken = randomBytes(32).toString('hex');
      privateWriteNew(sidecar('claim'), { handoffSha256, attemptToken, claimedAt: new Date().toISOString() });
      return { attemptToken };
    },
    outcome(kind, input) {
      assert(['submitted', 'uncertain', 'canceled'].includes(kind));
      keys(input, kind === 'submitted' ? ['attemptToken', 'transactionHash'] : ['attemptToken']);
      assert.match(input.attemptToken, /^[a-f0-9]{64}$/);
      const current = state();
      const claim = existing('claim');
      assert(claim && /^[a-f0-9]{64}$/.test(claim.attemptToken));
      assert(timingSafeEqual(Buffer.from(claim.attemptToken), Buffer.from(input.attemptToken)));
      if (kind === 'submitted') assert.match(input.transactionHash, HASH);
      const old = existing(kind);
      if (old) {
        if (kind === 'submitted') assert.equal(old.transactionHash, input.transactionHash);
        return { accepted: true };
      }
      assert(current.state !== 'canceled');
      if (kind === 'canceled') assert.equal(current.state, 'claimed');
      if (kind === 'uncertain' && current.state === 'submitted') return { accepted: true };
      privateWriteNew(sidecar(kind), {
        handoffSha256,
        recordedAt: new Date().toISOString(),
        ...(kind === 'submitted' ? { transactionHash: input.transactionHash } : {}),
      });
      return { accepted: true };
    },
  };
}

/** Bounded body reader prevents the local opt-in route from retaining arbitrary request data. */
function body(request) {
  assert(/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers['content-type'] ?? ''));
  return new Promise((accept, reject) => {
    let size = 0;
    const chunks = [];
    const cleanup = () => {
      clearTimeout(timer);
      request.off('data', data);
      request.off('end', end);
      request.off('error', fail);
      request.off('aborted', fail);
    };
    const fail = () => {
      cleanup();
      reject(new Error('invalid_body'));
    };
    const data = (chunk) => {
      size += chunk.length;
      if (size > 2048) {
        fail();
        request.resume();
      } else chunks.push(chunk);
    };
    const end = () => {
      cleanup();
      try {
        accept(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('invalid_body'));
      }
    };
    const timer = setTimeout(fail, 5000);
    request.on('data', data);
    request.once('end', end);
    request.once('error', fail);
    request.once('aborted', fail);
  });
}

/** Exact loopback Host/origin and a custom same-origin header; no CORS or operator forwarding. */
export function refundRehearsalMiddleware(handoff) {
  return async (request, response, next) => {
    if (!request.url?.startsWith('/__store-refund-rehearsal')) return next();
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Type', 'application/json');
    try {
      assert(handoff);
      assert(['127.0.0.1', '::ffff:127.0.0.1'].includes(request.socket?.remoteAddress));
      assert.equal(request.headers.host, '127.0.0.1:41829');
      assert.equal(request.headers['x-sora-pay-rehearsal'], '1');
      assert.equal(request.headers['sec-fetch-site'], 'same-origin');
      assert(!request.headers.origin || request.headers.origin === ORIGIN);
      const sensitive = new Set();
      for (let i = 0; i < (request.rawHeaders?.length ?? 0); i += 2) {
        const key = request.rawHeaders[i].toLowerCase();
        if (
          ['host', 'origin', 'x-sora-pay-rehearsal', 'sec-fetch-site', 'content-type', 'content-length'].includes(key)
        ) {
          assert(!sensitive.has(key));
          sensitive.add(key);
        }
      }
      let result;
      if (request.url === REFUND_PREFIX && request.method === 'GET') result = handoff.state();
      else {
        assert.equal(request.method, 'POST');
        assert.equal(request.headers.origin, ORIGIN);
        const action = request.url.slice(REFUND_PREFIX.length + 1);
        assert.equal(request.url, REFUND_PREFIX + '/' + action);
        assert(['claim', 'submitted', 'uncertain', 'canceled'].includes(action));
        const input = await body(request);
        if (action === 'claim') result = handoff.claim(input);
        else result = handoff.outcome(action, input);
      }
      response.statusCode = 200;
      response.end(JSON.stringify(result));
    } catch {
      response.statusCode = 409;
      response.end(JSON.stringify({ error: 'Refund rehearsal unavailable' }));
    }
  };
}
