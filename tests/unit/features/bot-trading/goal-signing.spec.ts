// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { signGoalExtrinsic } from '@/features/bot-trading/goal-signing';
import { readGoalSignedMortality } from '@/features/bot-trading/goal-mortality';
import { goalSigningFixture } from './goal-signing-fixture';
vi.unmock('@polkadot/util-crypto');
const options = (f: ReturnType<typeof goalSigningFixture>) => ({
  transaction: f.transaction,
  account: f.pair.address,
  nonce: 7,
  metadataHex: f.identity.metadataHex,
  genesisHash: f.identity.genesisHash,
  runtimeVersion: { specVersion: 130, transactionVersion: 130 },
  assertCurrent: vi.fn(),
});
describe('private goal SDK signing adapter', () => {
  it('routes an internal private pair through the actual captured SDK payload', async () => {
    const f = goalSigningFixture();
    const signed = await signGoalExtrinsic({ ...options(f), pair: f.pair });
    expect(signed).toBe(f.transaction);
    expect(f.signAsync).toHaveBeenCalledWith(
      f.pair.address,
      expect.objectContaining({ nonce: 7, era: 64, allowCallDataAlteration: false, withSignedTransaction: false })
    );
    expect(readGoalSignedMortality(signed)?.checkpoint.height).toBe(335);
  });
  it('forwards a detached payload to the existing external signer without exposing a key', async () => {
    const f = goalSigningFixture();
    const signPayload = vi.fn(async (payload) => {
      expect(payload).not.toBe(f.payload);
      expect(payload.signedExtensions).not.toBe(f.payload.signedExtensions);
      return { id: 17, ...f.registry.createType('ExtrinsicPayload', payload, { version: 4 }).sign(f.pair) };
    });
    const signed = await signGoalExtrinsic({ ...options(f), externalSigner: { signPayload } });
    expect(signPayload).toHaveBeenCalledOnce();
    expect(readGoalSignedMortality(signed)?.nonceCodec).toBe('7');
  });
  it('supports a raw-only external signer with SDK-identical bytes', async () => {
    const f = goalSigningFixture();
    const signRaw = vi.fn(async (raw) => ({
      id: 18,
      signature: u8aToHex(f.pair.sign(hexToU8a(raw.data), { withType: true })),
    }));
    const signed = await signGoalExtrinsic({ ...options(f), externalSigner: { signRaw } });
    expect(signRaw).toHaveBeenCalledWith({
      address: f.pair.address,
      type: 'payload',
      data: u8aToHex(f.registry.createType('ExtrinsicPayload', f.payload, { version: 4 }).toU8a({ method: true })),
    });
    expect(readGoalSignedMortality(signed)?.signatureVerified).toBe(true);
  });
  it('returns a late signed fact after revocation without losing its exact mortality', async () => {
    const f = goalSigningFixture();
    let current = true;
    const signed = await signGoalExtrinsic({
      ...options(f),
      assertCurrent: () => {
        if (!current) throw Error('stopped');
      },
      externalSigner: {
        signPayload: async (payload) => {
          current = false;
          return { id: 1, ...f.registry.createType('ExtrinsicPayload', payload, { version: 4 }).sign(f.pair) };
        },
      },
    });
    expect(readGoalSignedMortality(signed)?.checkpoint.height).toBe(335);
  });
  it('preserves invalid returned signature bytes but grants no mortality capability', async () => {
    const f = goalSigningFixture();
    const signed = await signGoalExtrinsic({
      ...options(f),
      externalSigner: { signPayload: async () => ({ id: 1, signature: `0x00${'00'.repeat(64)}` }) },
    });
    expect(signed.isSigned).toBe(false);
    expect(readGoalSignedMortality(signed)).toBeUndefined();
  });
  it('does not call the signer when validation or ownership has already failed', async () => {
    const f = goalSigningFixture(),
      signPayload = vi.fn();
    f.payload.nonce = '0x100000000';
    await expect(signGoalExtrinsic({ ...options(f), externalSigner: { signPayload } })).rejects.toThrow();
    expect(signPayload).not.toHaveBeenCalled();
    const clean = goalSigningFixture();
    await expect(
      signGoalExtrinsic({
        ...options(clean),
        pair: clean.pair,
        assertCurrent: () => {
          throw Error('stopped');
        },
      })
    ).rejects.toThrow('stopped');
    expect(clean.signAsync).not.toHaveBeenCalled();
  });
  it('rejects a repeated callback even when the first capture failed validation', async () => {
    const f = goalSigningFixture(),
      signPayload = vi.fn();
    f.signAsync.mockImplementationOnce(async (_account, supplied) => {
      await expect(supplied.signer!.signPayload!({ ...f.payload, era: '0x00' })).rejects.toThrow();
      await expect(supplied.signer!.signPayload!(f.payload)).rejects.toThrow();
      return f.transaction;
    });
    const signed = await signGoalExtrinsic({ ...options(f), externalSigner: { signPayload } });
    expect(signed).toBe(f.transaction);
    expect(signPayload).not.toHaveBeenCalled();
    expect(readGoalSignedMortality(signed)).toBeUndefined();
  });
});
