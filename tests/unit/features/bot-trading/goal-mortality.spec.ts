// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { u8aToHex, hexToU8a } from '@polkadot/util';
import { blake2AsU8a } from '@polkadot/util-crypto';
import {
  captureGoalSigningPayload,
  goalRawSigningPayload,
  readGoalSignedMortality,
  retainGoalSignedMortality,
  signCapturedGoalPayload,
} from '@/features/bot-trading/goal-mortality';
import { goalSigningFixture } from './goal-signing-fixture';

vi.unmock('@polkadot/util-crypto');
describe('captured signed goal mortality', () => {
  it.each(['ed25519', 'sr25519', 'ecdsa'] as const)(
    'verifies actual %s payload signatures and exact returned envelopes',
    (type) => {
      const f = goalSigningFixture(type),
        capture = captureGoalSigningPayload(f.input),
        signed = f.signed();
      expect(retainGoalSignedMortality(capture, signed)).toBe(true);
      expect(readGoalSignedMortality(signed)).toMatchObject({
        checkpoint: { height: 335, hash: f.identity.blockHash },
        birthBlockNumber: 335,
        deathBlockNumber: 399,
        nonceCodec: '7',
        signatureType: type,
        signatureVerified: true,
        checkpointCanonicality: 'not-yet-checked',
      });
      expect(Object.isFrozen(readGoalSignedMortality(signed))).toBe(true);
      expect(readGoalSignedMortality({ toHex: () => signed.toHex() })).toBeUndefined();
    }
  );
  it('does not confuse the same era phase in another cycle with the actual signed checkpoint', () => {
    const f = goalSigningFixture(),
      capture = captureGoalSigningPayload(f.input);
    const other = {
      ...f.payload,
      blockNumber: '0x0000018f' as const,
      blockHash: `0x${'44'.repeat(32)}` as `0x${string}`,
    };
    const signed = f.signed(other);
    expect(signed.era.toHex()).toBe(f.payload.era);
    expect(retainGoalSignedMortality(capture, signed)).toBe(false);
    expect(readGoalSignedMortality(signed)).toBeUndefined();
  });
  it('rejects changed nonce, era, account, call and signature without discarding signed bytes', () => {
    const f = goalSigningFixture(),
      capture = captureGoalSigningPayload(f.input);
    const variants = [
      { ...f.payload, nonce: '0x00000008' as const },
      { ...f.payload, era: f.registry.createType('ExtrinsicEra', { current: 336, period: 64 }).toHex() },
      { ...f.payload, address: `0x${'55'.repeat(32)}` },
      { ...f.payload, method: `${f.payload.method.slice(0, -2)}00` as `0x${string}` },
    ];
    for (const payload of variants) {
      const signed = f.signed(payload),
        bytes = signed.toHex();
      expect(retainGoalSignedMortality(capture, signed)).toBe(false);
      expect(signed.toHex()).toBe(bytes);
    }
    const invalid = f.signed(f.payload, `0x00${'00'.repeat(64)}`);
    expect(retainGoalSignedMortality(capture, invalid)).toBe(false);
  });
  it('protects captured fields from later mutation of the SDK input', () => {
    const f = goalSigningFixture(),
      capture = captureGoalSigningPayload(f.input),
      signed = f.signed();
    f.payload.blockHash = `0x${'44'.repeat(32)}`;
    f.payload.signedExtensions.length = 0;
    expect(retainGoalSignedMortality(capture, signed)).toBe(true);
    expect(capture.payload.blockHash).toBe(f.identity.blockHash);
  });
  it('revokes lookup when the same signed object changes bytes', () => {
    const f = goalSigningFixture(),
      capture = captureGoalSigningPayload(f.input),
      signed = f.signed();
    expect(retainGoalSignedMortality(capture, signed)).toBe(true);
    signed.toHex = () => '0x00';
    expect(readGoalSignedMortality(signed)).toBeUndefined();
  });
  it('uses the same raw payload for internal signing and the public raw-signer path', () => {
    const f = goalSigningFixture(),
      capture = captureGoalSigningPayload(f.input);
    const expected = f.registry.createType('ExtrinsicPayload', f.payload, { version: 4 });
    expect(goalRawSigningPayload(capture)).toBe(u8aToHex(expected.toU8a({ method: true })));
    const signed = f.signed(f.payload, signCapturedGoalPayload(capture, f.pair).signature);
    expect(retainGoalSignedMortality(capture, signed)).toBe(true);
  });
  it('hashes long payloads exactly once before signature verification', () => {
    const f = goalSigningFixture();
    const call = f.registry.createType('Call', f.input.callHex);
    const args = call.args.map((value) => value.toJSON());
    args[4] = new Array(180).fill('XYKPool');
    const longCall = f.registry.createType('Call', { callIndex: call.callIndex, args }).toHex();
    const payload = { ...f.payload, method: longCall };
    const capture = captureGoalSigningPayload({ ...f.input, callHex: longCall, payload });
    const raw = hexToU8a(goalRawSigningPayload(capture));
    expect(raw.length).toBeGreaterThan(256);
    const signature = u8aToHex(f.pair.sign(blake2AsU8a(raw), { withType: true }));
    expect(retainGoalSignedMortality(capture, f.signed(payload, signature))).toBe(true);
    const wrong = u8aToHex(f.pair.sign(raw, { withType: true }));
    expect(retainGoalSignedMortality(capture, f.signed(payload, wrong))).toBe(false);
  });
  it.each(['immortal', 'period', 'checkpoint', 'nonce', 'genesis', 'extensions', 'tip', 'runtime'] as const)(
    'rejects invalid %s metadata before signing',
    (kind) => {
      const f = goalSigningFixture();
      if (kind === 'immortal') f.payload.era = '0x00';
      if (kind === 'period')
        f.payload.era = f.registry.createType('ExtrinsicEra', { current: 335, period: 128 }).toHex();
      if (kind === 'checkpoint') f.payload.blockNumber = '0x00000150';
      if (kind === 'nonce') f.payload.nonce = '0x100000000';
      if (kind === 'genesis') f.payload.genesisHash = `0x${'33'.repeat(32)}`;
      if (kind === 'extensions') f.payload.signedExtensions = ['CheckMortality'];
      if (kind === 'tip') f.payload.tip = '0x01';
      if (kind === 'runtime') f.payload.specVersion = '0x00000083';
      expect(() => captureGoalSigningPayload(f.input)).toThrow();
    }
  );
  it('rejects accessors and cloned capture objects without invoking their getters', () => {
    const f = goalSigningFixture(),
      getter = vi.fn();
    Object.defineProperty(f.payload, 'nonce', { enumerable: true, get: getter });
    expect(() => captureGoalSigningPayload(f.input)).toThrow();
    expect(getter).not.toHaveBeenCalled();
    const clean = goalSigningFixture(),
      capture = captureGoalSigningPayload(clean.input);
    expect(() => goalRawSigningPayload({ ...capture })).toThrow();
    expect(retainGoalSignedMortality({ ...capture }, clean.signed())).toBe(false);
  });
});
