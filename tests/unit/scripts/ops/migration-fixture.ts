/** Public development keys only; no wallet or network service is used by these tests. */
import { Keyring } from '@polkadot/keyring';
import { stringToU8a, u8aToHex, u8aWrapBytes } from '@polkadot/util';
import { migrationMessage, type MigrationIntent } from '../../../../scripts/ops/migration-protocol';

export function migrationFixture(type: 'sr25519' | 'ed25519' | 'ecdsa' = 'sr25519') {
  const keyring = new Keyring({ type, ss58Format: 69 });
  const old = keyring.addFromUri('//Alice');
  const next = keyring.addFromUri('//Bob');
  const other = keyring.addFromUri('//Charlie');
  const intent: MigrationIntent & { version: 1 } = {
    version: 1,
    oldAccount: old.address,
    newAccount: next.address,
    nonce: '16df8931-af8d-4f71-bd8f-1f684d615b34',
    createdAt: new Date().toISOString(),
  };
  const sign = (pair: typeof old, value: MigrationIntent = intent) =>
    u8aToHex(pair.sign(u8aWrapBytes(stringToU8a(migrationMessage(value))), { withType: true }));
  return {
    old,
    next,
    other,
    intent,
    sign,
    submission: { ...intent, oldSignature: sign(old), newSignature: sign(next) },
  };
}
