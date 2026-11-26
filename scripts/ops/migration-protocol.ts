/** Retained v1/v2 evidence verification for the private migration registry after the public page retirement. */
import { stringToU8a, u8aWrapBytes } from '@polkadot/util';
import { blake2AsHex, decodeAddress, encodeAddress, signatureVerify } from '@polkadot/util-crypto';

export const MIGRATION_GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
export const MIGRATION_CHECKPOINT = '0x7f7c253fa72f32e7b03f32bdc9ae456fd7174fb131b689be6d876006124129f0';
export const MIGRATION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const MIGRATION_CURRENT_VERSION = 2;
const EXCLUDED_KEY = '0x64650caa38ca952fc214cbb38cb625d779d1387b52910e664012cbd7d7593a7d';

export interface MigrationIntent {
  version: 1 | 2;
  oldAccount: string;
  newAccount: string;
  nonce: string;
  createdAt: string;
}

/** Version 1 retains both proofs; version 2 requires only the old account's proof. */
export type MigrationSubmission = MigrationIntent &
  (
    | { version: 1; oldSignature: string; newSignature: string }
    | { version: 2; oldSignature: string; newSignature?: never }
  );

/** Stable error codes keep provider messages and request data out of application logs. */
export class MigrationError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = 'MigrationError';
    this.code = code;
  }
}

/** Accept checksum-validated AccountId32 SS58 addresses and display them with SORA Nexus prefix 69. */
export function migrationAddress(value: unknown): string {
  try {
    if (typeof value !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{46,50}$/.test(value)) throw new Error();
    const key = decodeAddress(value);
    if (key.length !== 32 || blake2AsHex(key) === blake2AsHex(decodeAddress(EXCLUDED_KEY))) throw new Error();
    return encodeAddress(key, 69);
  } catch {
    throw new MigrationError('address');
  }
}

/** Validate signed fields without trusting client-selected domains, networks, or checkpoints. */
export function parseMigrationIntent(value: unknown): MigrationIntent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new MigrationError('request');
  const row = value as Record<string, unknown>;
  const oldAccount = migrationAddress(row.oldAccount);
  const newAccount = migrationAddress(row.newAccount);
  if (oldAccount === newAccount) throw new MigrationError('sameAccount');
  if (
    (row.version !== 1 && row.version !== MIGRATION_CURRENT_VERSION) ||
    typeof row.nonce !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(row.nonce) ||
    typeof row.createdAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(row.createdAt) ||
    !Number.isFinite(Date.parse(row.createdAt)) ||
    new Date(row.createdAt).toISOString() !== row.createdAt
  )
    throw new MigrationError('request');
  return { version: row.version, oldAccount, newAccount, nonce: row.nonce, createdAt: row.createdAt };
}

/** Versioned UTF-8 text binds the full request; retained v1 evidence keeps its exact original bytes. */
export function migrationMessage(value: MigrationIntent): string {
  const intent = parseMigrationIntent(value);
  return [
    `Polkaswap migration request v${intent.version}`,
    'Domain: polkaswap.io',
    'Network: SORA Nexus mainnet',
    `Genesis: ${MIGRATION_GENESIS}`,
    'Checkpoint block: 28191817',
    `Checkpoint hash: ${MIGRATION_CHECKPOINT}`,
    `Old account: ${intent.oldAccount}`,
    `New account: ${intent.newAccount}`,
    `Request nonce: ${intent.nonce}`,
    `Created at: ${intent.createdAt}`,
    'I request review of the account replacement above.',
    'This off-chain message does not authorize a transaction or transfer funds.',
  ].join('\n');
}

/** Content-based receipt identity is independent of signature encoding and Telegram retries. */
export function migrationRequestId(intent: MigrationIntent): string {
  return blake2AsHex(stringToU8a(migrationMessage(intent)));
}

/** Verify wallet byte-message signatures (including standard <Bytes> wrapping) against the expected key. */
export function verifyMigrationSignature(intent: MigrationIntent, signature: unknown, account: string): string {
  if (typeof signature !== 'string' || !/^0x(?:[0-9a-fA-F]{128}|[0-9a-fA-F]{130}|[0-9a-fA-F]{132})$/.test(signature))
    throw new MigrationError('signature');
  try {
    const bytes = stringToU8a(migrationMessage(intent));
    const address = migrationAddress(account);
    // Check the wallet's standard byte envelope explicitly before accepting an unwrapped signature.
    const wrapped = signatureVerify(u8aWrapBytes(bytes), signature, address);
    const result = wrapped.isValid ? wrapped : signatureVerify(bytes, signature, address);
    if (!result.isValid) throw new Error();
    return result.crypto;
  } catch {
    throw new MigrationError('signature');
  }
}

/** Reconstruct and verify the version's required proofs; v2 never claims control of the new account. */
export function verifyMigrationSubmission(value: unknown, now?: number) {
  const intent = parseMigrationIntent(value);
  const row = value as Record<string, unknown>;
  const fields =
    intent.version === 1
      ? 'createdAt,newAccount,newSignature,nonce,oldAccount,oldSignature,version'
      : 'createdAt,newAccount,nonce,oldAccount,oldSignature,version';
  if (Object.keys(row).sort().join(',') !== fields) throw new MigrationError('request');
  if (
    now !== undefined &&
    (Date.parse(intent.createdAt) > now + 300_000 || now - Date.parse(intent.createdAt) > MIGRATION_MAX_AGE_MS)
  )
    throw new MigrationError('expired');
  const oldCrypto = verifyMigrationSignature(intent, row.oldSignature, intent.oldAccount);
  const oldSignature = (row.oldSignature as string).toLowerCase();
  const newCrypto = intent.version === 1 ? verifyMigrationSignature(intent, row.newSignature, intent.newAccount) : null;
  const submission: MigrationSubmission =
    intent.version === 1
      ? { ...intent, version: 1, oldSignature, newSignature: (row.newSignature as string).toLowerCase() }
      : { ...intent, version: 2, oldSignature };
  return { submission, requestId: migrationRequestId(intent), oldCrypto, newCrypto, message: migrationMessage(intent) };
}
