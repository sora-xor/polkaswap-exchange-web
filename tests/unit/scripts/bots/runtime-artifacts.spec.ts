import { readFileSync } from 'node:fs';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { hexToU8a } from '@polkadot/util';
import { blake2AsHex } from '@polkadot/util-crypto';
import { GOAL_RUNTIME_CATALOG_PROFILES } from '@/features/bot-trading/execution-codecs/runtime-catalog';
import {
  readRuntimeDispatchFixture,
  readRuntimeMetadataHex,
  readRuntimeMetadataHexSync,
  readRuntimeQuoteFeeFixture,
  runtimeWasmFixturePath,
} from '../../../fixtures/bots/runtime-artifacts';

vi.unmock('@polkadot/util-crypto');
const network = vi.fn(() => {
  throw new Error('No network in runtime fixture tests');
});
vi.stubGlobal('fetch', network);
afterAll(() => {
  expect(network).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
const { createHash } = process.getBuiltinModule('crypto');

describe('portable public runtime fixtures', () => {
  it.each([128, 129, 130, 131] as const)('retains the exact raw metadata pin for runtime %s', async (version) => {
    const raw = await readRuntimeMetadataHex(version);
    expect(readRuntimeMetadataHexSync(version)).toBe(raw);
    const profile = Object.values(GOAL_RUNTIME_CATALOG_PROFILES).find((item) => item.specVersion === version)!;
    expect(createHash('sha256').update(hexToU8a(raw)).digest('hex')).toBe(profile.metadataSha256);
  });

  it.each([130, 131] as const)('retains the public compressed runtime %s code hash', (version) => {
    const bytes = readFileSync(runtimeWasmFixturePath(version));
    const profile = Object.values(GOAL_RUNTIME_CATALOG_PROFILES).find((item) => item.specVersion === version)!;
    expect(blake2AsHex(bytes, 256)).toBe(profile.codeHash);
  });

  it('returns independent invented state and exact fee/quote oracle records', () => {
    const state = readRuntimeDispatchFixture();
    expect(state.declarations).toHaveLength(39);
    expect(state.extrinsicHex).toMatch(/^0x[0-9a-f]+$/);
    state.declarations.length = 0;
    expect(readRuntimeDispatchFixture().declarations).toHaveLength(39);
    for (const direction of ['kusd-xor', 'xor-kusd']) {
      const oracle = readRuntimeQuoteFeeFixture(direction);
      expect(oracle.quote.inputHex).toMatch(/^0x[0-9a-f]+$/);
      expect(oracle.fees.infoResultHex).toMatch(/^0x[0-9a-f]+$/);
      expect(oracle.fees.detailsResultHex).toMatch(/^0x[0-9a-f]+$/);
      oracle.quote.resultHex = 'changed';
      expect(readRuntimeQuoteFeeFixture(direction).quote.resultHex).not.toBe('changed');
    }
  });

  it('rejects unknown binary versions and directions before any path can be selected', () => {
    expect(() => runtimeWasmFixturePath(129 as 130)).toThrow('Unsupported runtime fixture');
    expect(() => readRuntimeQuoteFeeFixture('../unknown')).toThrow('Unsupported fixture direction');
  });
});
