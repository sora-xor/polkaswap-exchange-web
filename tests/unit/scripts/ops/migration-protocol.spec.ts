vi.unmock('@polkadot/util-crypto');
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { cryptoWaitReady, encodeAddress } from '@polkadot/util-crypto';
import {
  MIGRATION_CHECKPOINT,
  MIGRATION_GENESIS,
  MIGRATION_MAX_AGE_MS,
  MIGRATION_CURRENT_VERSION,
  migrationAddress,
  migrationMessage,
  migrationRequestId,
  parseMigrationIntent,
  verifyMigrationSignature,
  verifyMigrationSubmission,
  type MigrationIntent,
} from '../../../../scripts/ops/migration-protocol';
import { migrationFixture } from './migration-fixture';
beforeAll(cryptoWaitReady);

describe('migration signed request contract', () => {
  it.each(['sr25519', 'ed25519', 'ecdsa'] as const)(
    'verifies real %s signatures over the checkpoint and both accounts',
    (type) => {
      const { intent, submission } = migrationFixture(type);
      const result = verifyMigrationSubmission(submission, Date.now());
      expect(result.oldCrypto).toBe(type);
      expect(result.newCrypto).toBe(type);
      expect(result.requestId).toBe(migrationRequestId(intent));
      expect(result.message).toContain(MIGRATION_CHECKPOINT);
      expect(result.message).toContain(MIGRATION_GENESIS);
      expect(result.message).toContain(`Old account: ${intent.oldAccount}`);
      expect(result.message).toContain(`New account: ${intent.newAccount}`);
    }
  );

  it.each(['sr25519', 'ed25519', 'ecdsa'] as const)(
    'accepts a v2 request with only the old %s signature and leaves new control unverified',
    (type) => {
      const { intent: legacy, old, sign } = migrationFixture(type);
      const intent: MigrationIntent = { ...legacy, version: MIGRATION_CURRENT_VERSION };
      const submission = { ...intent, oldSignature: sign(old, intent) };
      const result = verifyMigrationSubmission(submission, Date.now());
      expect(result.submission).toEqual(submission);
      expect(result.submission).not.toHaveProperty('newSignature');
      expect(result.oldCrypto).toBe(type);
      expect(result.newCrypto).toBeNull();
      expect(result.message).toContain('Polkaswap migration request v2');
      expect(result.message).toContain(`New account: ${intent.newAccount}`);
      expect(result.requestId).not.toBe(migrationRequestId(legacy));
    }
  );

  it('rejects v2 destination/metadata changes, wrong or absent old proofs, and unrequested proof fields', () => {
    const { intent: legacy, old, next, other, sign } = migrationFixture();
    const intent: MigrationIntent = { ...legacy, version: 2 };
    const submission = { ...intent, oldSignature: sign(old, intent) };
    for (const changed of [
      intent,
      { ...submission, newAccount: other.address },
      { ...submission, oldAccount: other.address },
      { ...submission, nonce: '26df8931-af8d-4f71-bd8f-1f684d615b34' },
      { ...submission, createdAt: '2026-10-01T00:00:00.000Z' },
      { ...submission, oldSignature: sign(next, intent) },
      { ...submission, oldSignature: '' },
      { ...submission, newSignature: '' },
      { ...submission, newSignature: sign(next, intent) },
      { ...submission, newCrypto: 'sr25519' },
    ])
      expect(() => verifyMigrationSubmission(changed)).toThrow();
  });

  it('never downgrades legacy dual-proof requests or reuses signatures between versions', () => {
    const { intent, submission, old, next, sign } = migrationFixture();
    const v2: MigrationIntent = { ...intent, version: 2 };
    expect(() => verifyMigrationSubmission({ ...intent, oldSignature: submission.oldSignature })).toThrow('request');
    expect(() => verifyMigrationSubmission({ ...v2, oldSignature: submission.oldSignature })).toThrow('signature');
    expect(() => verifyMigrationSubmission({ ...submission, version: 2 })).toThrow('request');
    expect(() =>
      verifyMigrationSubmission({ ...intent, oldSignature: sign(old, v2), newSignature: sign(next, v2) })
    ).toThrow('signature');
  });

  it('normalizes alternate SS58 prefixes, rejects bad checksums, raw keys and the excluded attacker key', () => {
    const { old } = migrationFixture();
    expect(migrationAddress(encodeAddress(old.publicKey, 42))).toBe(old.address);
    for (const address of [
      '',
      'not-an-address',
      `0x${'11'.repeat(32)}`,
      old.address.slice(0, -1) + '0',
      encodeAddress('0x64650caa38ca952fc214cbb38cb625d779d1387b52910e664012cbd7d7593a7d', 69),
    ]) {
      expect(() => migrationAddress(address)).toThrow('address');
    }
  });

  it('rejects equal identities even with different display prefixes', () => {
    const { intent, old } = migrationFixture();
    expect(() => parseMigrationIntent({ ...intent, newAccount: encodeAddress(old.publicKey, 42) })).toThrow(
      'sameAccount'
    );
  });

  it('rejects changed destinations, swapped or missing proofs, forged verification fields, and wrong signers', () => {
    const { submission, other } = migrationFixture();
    for (const changed of [
      { ...submission, newAccount: other.address },
      { ...submission, oldSignature: submission.newSignature },
      { ...submission, newSignature: '' },
      { ...submission, verified: true },
      { ...submission, chat_id: '-123' },
      { ...submission, createdAt: '2026-10-01T00:00:00.000Z' },
    ])
      expect(() => verifyMigrationSubmission(changed)).toThrow();
  });

  it('rejects malformed nonces, versions, dates and non-object requests', () => {
    const { intent } = migrationFixture();
    for (const changed of [
      null,
      [],
      { ...intent, version: 3 },
      { ...intent, nonce: 'x' },
      { ...intent, createdAt: '2026-02-30T00:00:00.000Z' },
      { ...intent, createdAt: 'yesterday' },
    ]) {
      expect(() => parseMigrationIntent(changed)).toThrow();
    }
  });

  it('checks submission freshness but allows archival verification after expiry', () => {
    const { submission } = migrationFixture();
    expect(() =>
      verifyMigrationSubmission(submission, Date.parse(submission.createdAt) + MIGRATION_MAX_AGE_MS + 1)
    ).toThrow('expired');
    expect(() => verifyMigrationSubmission(submission, Date.parse(submission.createdAt) - 300_001)).toThrow('expired');
    expect(verifyMigrationSubmission(submission).requestId).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('rejects transaction signatures and arbitrary non-message bytes', () => {
    const { old, intent } = migrationFixture();
    expect(() => verifyMigrationSignature(intent, '0x00', old.address)).toThrow('signature');
    expect(migrationMessage(intent)).toContain('does not authorize a transaction');
  });
});
