import { execFile as execFileCallback } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

const base = process.cwd();
const DEFAULT_CHROME_VERSION = process.env.WALLET_EXTENSION_CHROME_VERSION || '145.0.7632.6';

export const WALLET_EXTENSION_FIXTURES = [
  {
    key: 'polkadot-js',
    id: 'mopnmbcafieddcagagdcbnhejhlodfdd',
    expectedName: /polkadot/i,
  },
  {
    key: 'fearless-wallet',
    id: 'nhlnehondigmgckngjomcpcefcdplmgc',
    expectedName: /fearless/i,
  },
  {
    key: 'subwallet-js',
    id: 'onhogfjeacnfoofkfgppdlbmlmnplgbn',
    expectedName: /subwallet/i,
  },
  {
    key: 'talisman',
    id: 'fijngjgcjhjmmpcmkeiomlglpeiijkld',
    expectedName: /talisman/i,
  },
];

/**
 * Derives Chrome's extension id from an unpacked extension public key.
 */
export function extensionIdFromPublicKey(publicKey) {
  const digest = crypto.createHash('sha256').update(publicKey).digest().subarray(0, 16);
  return [...digest].flatMap((byte) => [byte >> 4, byte & 0x0f]).map((value) => String.fromCharCode(97 + value)).join('');
}

function readVarint(buffer, offset) {
  let value = 0;
  let shift = 0;
  let cursor = offset;

  while (cursor < buffer.length) {
    const byte = buffer[cursor++];
    value |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return { value, offset: cursor };
    shift += 7;
  }

  throw new Error('Invalid CRX protobuf varint.');
}

function readLengthDelimitedFields(buffer) {
  const fields = [];
  let offset = 0;

  while (offset < buffer.length) {
    const key = readVarint(buffer, offset);
    offset = key.offset;

    const field = key.value >> 3;
    const wireType = key.value & 7;
    if (wireType === 0) {
      const varint = readVarint(buffer, offset);
      offset = varint.offset;
      fields.push({ field, value: varint.value });
      continue;
    }

    if (wireType !== 2) {
      throw new Error(`Unsupported CRX protobuf wire type ${wireType}.`);
    }

    const length = readVarint(buffer, offset);
    offset = length.offset;
    const value = buffer.subarray(offset, offset + length.value);
    offset += length.value;
    fields.push({ field, value });
  }

  return fields;
}

/**
 * Splits a Chrome extension CRX file into public keys and the embedded zip payload.
 */
export function parseCrxPayload(crxBuffer) {
  if (crxBuffer.subarray(0, 4).toString('ascii') !== 'Cr24') {
    return { publicKeys: [], zipBuffer: crxBuffer };
  }

  const version = crxBuffer.readUInt32LE(4);
  if (version === 2) {
    const publicKeyLength = crxBuffer.readUInt32LE(8);
    const signatureLength = crxBuffer.readUInt32LE(12);
    const publicKey = crxBuffer.subarray(16, 16 + publicKeyLength);
    const zipOffset = 16 + publicKeyLength + signatureLength;
    return {
      publicKeys: [publicKey],
      zipBuffer: crxBuffer.subarray(zipOffset),
    };
  }

  if (version !== 3) {
    throw new Error(`Unsupported CRX version ${version}.`);
  }

  const headerLength = crxBuffer.readUInt32LE(8);
  const header = crxBuffer.subarray(12, 12 + headerLength);
  const publicKeys = readLengthDelimitedFields(header)
    .filter((field) => field.field === 2 || field.field === 3)
    .flatMap((proof) => readLengthDelimitedFields(proof.value))
    .filter((field) => field.field === 1)
    .map((field) => field.value);

  return {
    publicKeys,
    zipBuffer: crxBuffer.subarray(12 + headerLength),
  };
}

/**
 * Finds the CRX public key that preserves a known Chrome Web Store extension id.
 */
export function manifestKeyForExtensionId(publicKeys, extensionId) {
  const publicKey = publicKeys.find((key) => extensionIdFromPublicKey(key) === extensionId);
  if (!publicKey) {
    throw new Error(`Downloaded CRX did not contain a public key for ${extensionId}.`);
  }
  return Buffer.from(publicKey).toString('base64');
}

function extensionUrl(extensionId, chromeVersion = DEFAULT_CHROME_VERSION) {
  const query = new URLSearchParams({
    response: 'redirect',
    prodversion: chromeVersion,
    acceptformat: 'crx2,crx3',
    x: `id=${extensionId}&installsource=ondemand&uc`,
  });
  return `https://clients2.google.com/service/update2/crx?${query}`;
}

async function readManifest(extensionPath) {
  try {
    return JSON.parse(await fs.readFile(path.join(extensionPath, 'manifest.json'), 'utf8'));
  } catch {
    return undefined;
  }
}

async function fixtureIsReady(fixture, extensionPath) {
  const manifest = await readManifest(extensionPath);
  const hasWebStoreMetadata = await fs
    .stat(path.join(extensionPath, '_metadata'))
    .then(() => true)
    .catch(() => false);

  return Boolean(
    manifest &&
      fixture.expectedName.test(String(manifest.name ?? '')) &&
      typeof manifest.version === 'string' &&
      typeof manifest.key === 'string' &&
      !hasWebStoreMetadata
  );
}

async function downloadCrx(fixture) {
  const response = await fetch(extensionUrl(fixture.id));
  if (!response.ok) {
    throw new Error(`Failed to download ${fixture.key} (${fixture.id}): ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function restoreFixture(fixture, destinationRoot) {
  const destination = path.join(destinationRoot, fixture.key);
  if (await fixtureIsReady(fixture, destination)) return false;

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), `polkaswap-wallet-extension-${fixture.key}-`));
  const zipPath = path.join(tempRoot, `${fixture.key}.zip`);
  const unpackedPath = path.join(tempRoot, 'unpacked');

  try {
    const crx = await downloadCrx(fixture);
    const { publicKeys, zipBuffer } = parseCrxPayload(crx);
    const manifestKey = manifestKeyForExtensionId(publicKeys, fixture.id);

    await fs.writeFile(zipPath, zipBuffer);
    await fs.mkdir(unpackedPath, { recursive: true });
    await execFile('unzip', ['-q', zipPath, '-d', unpackedPath]);

    const manifestPath = path.join(unpackedPath, 'manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    if (!fixture.expectedName.test(String(manifest.name ?? ''))) {
      throw new Error(`Unexpected ${fixture.key} manifest name: ${manifest.name}`);
    }

    manifest.key = manifestKey;
    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    await fs.rm(path.join(unpackedPath, '_metadata'), { recursive: true, force: true });

    await fs.mkdir(destinationRoot, { recursive: true });
    await fs.rm(destination, { recursive: true, force: true });
    await fs.rename(unpackedPath, destination);
    return true;
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Restores missing local wallet extension fixtures used by the Playwright wallet matrix.
 */
export async function ensureWalletExtensions({
  destinationRoot = path.join(base, '.playwright-cli/extensions/unpacked'),
  fixtures = WALLET_EXTENSION_FIXTURES,
  logger = console,
} = {}) {
  if (process.env.WALLET_MATRIX_SKIP_EXTENSION_ENSURE === '1') {
    return { restored: [], ready: [] };
  }

  const restored = [];
  const ready = [];

  for (const fixture of fixtures) {
    const destination = path.join(destinationRoot, fixture.key);
    if (await fixtureIsReady(fixture, destination)) {
      ready.push(fixture.key);
      continue;
    }

    logger.log?.(`[wallet-matrix] restoring ${fixture.key} extension fixture`);
    await restoreFixture(fixture, destinationRoot);
    ready.push(fixture.key);
    restored.push(fixture.key);
  }

  return { restored, ready };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  await ensureWalletExtensions();
}
