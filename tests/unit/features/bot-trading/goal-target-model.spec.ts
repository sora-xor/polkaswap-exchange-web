import { describe, expect, it, vi } from 'vitest';
import {
  GOAL_TARGET_MODEL_PROTOCOL,
  GOAL_CATALOG_TARGET_MODEL_PROTOCOL,
  GOAL_CATALOG_TARGET_SOURCE_PROFILES,
  GOAL_TARGET_RUNTIME_CATALOG_SHA256,
  goalTargetSourceRuntimeProfiles,
  isGoalCatalogTargetExecutionModel,
  GOAL_TARGET_COST_PROTOCOL,
  GOAL_TARGET_MODEL_PROFILES,
  GOAL_TARGET_COMPRESSED_SHA256,
  readGoalTargetExecutionModel,
  assessGoalTargetFee,
} from '@/features/bot-trading/goal-target-model';

const fixture = () => ({
  protocol: GOAL_TARGET_MODEL_PROTOCOL,
  sourceRuntimeProfile: { ...GOAL_TARGET_MODEL_PROFILES.source },
  targetRuntimeProfile: { ...GOAL_TARGET_MODEL_PROFILES.target },
  targetCompressedSha256: GOAL_TARGET_COMPRESSED_SHA256,
  implementation: { hostSha256: 'a'.repeat(64), stateCodecSha256: 'b'.repeat(64), quoteCodecSha256: 'c'.repeat(64) },
  stateModel: 'source130-exact-storage-complete-xst-v1',
  fillModel: 'minimum-output-hypothetical-no-market-feedback',
  costPolicy: { protocol: GOAL_TARGET_COST_PROTOCOL, maximumLiveFeeCodec: '125000000000000000' },
});

describe('explicit target runtime model data', () => {
  it('keeps historical and execution identities separate and freezes detached data', () => {
    const input = fixture();
    const result = readGoalTargetExecutionModel(input);
    input.implementation.hostSha256 = 'd'.repeat(64);
    input.costPolicy.maximumLiveFeeCodec = '1';
    expect(goalTargetSourceRuntimeProfiles(result).map((p) => p.specVersion)).toEqual([130]);
    expect(isGoalCatalogTargetExecutionModel(result)).toBe(false);
    expect(result.targetRuntimeProfile.specVersion).toBe(131);
    expect(result.implementation.hostSha256).toBe('a'.repeat(64));
    expect(result.costPolicy.maximumLiveFeeCodec).toBe('125000000000000000');
    expect(Object.isFrozen(result)).toBe(true);
    expect(
      Object.values(result)
        .filter((v) => typeof v === 'object')
        .every(Object.isFrozen)
    ).toBe(true);
  });
  it.each(['sourceRuntimeProfile', 'targetRuntimeProfile'] as const)('rejects changed %s identity fields', (field) => {
    for (const key of ['specVersion', 'transactionVersion', 'metadataSha256', 'codeHash'] as const) {
      const input = fixture();
      Object.assign(input[field], { [key]: typeof input[field][key] === 'number' ? 132 : '0'.repeat(64) });
      expect(() => readGoalTargetExecutionModel(input)).toThrow();
    }
  });
  it('rejects exchanged source/target roles', () => {
    const input = fixture();
    expect(() =>
      readGoalTargetExecutionModel({
        ...input,
        sourceRuntimeProfile: input.targetRuntimeProfile,
        targetRuntimeProfile: input.sourceRuntimeProfile,
      })
    ).toThrow();
  });
  it.each(['protocol', 'targetCompressedSha256', 'stateModel', 'fillModel'] as const)('rejects changed %s', (key) => {
    expect(() => readGoalTargetExecutionModel({ ...fixture(), [key]: 'different' })).toThrow();
  });
  it.each(['hostSha256', 'stateCodecSha256', 'quoteCodecSha256'] as const)('requires exact %s syntax', (key) => {
    for (const value of ['', 'a'.repeat(63), 'A'.repeat(64), { toString: () => 'a'.repeat(64) }]) {
      const input = fixture();
      Object.assign(input.implementation, { [key]: value });
      expect(() => readGoalTargetExecutionModel(input)).toThrow();
    }
  });
  it.each(['0', '01', '-1', '1.5', '1e18', '1000000000000000001', (1n << 128n).toString(), 1, null])(
    'rejects invalid or excessive fee cap %s',
    (maximumLiveFeeCodec) => {
      const input = fixture();
      expect(() =>
        readGoalTargetExecutionModel({ ...input, costPolicy: { ...input.costPolicy, maximumLiveFeeCodec } })
      ).toThrow();
    }
  );
  it('accepts exact smallest and full-reserve caps without numeric rounding', () => {
    for (const maximumLiveFeeCodec of ['1', '1000000000000000000']) {
      const input = fixture();
      input.costPolicy.maximumLiveFeeCodec = maximumLiveFeeCodec;
      expect(readGoalTargetExecutionModel(input).costPolicy.maximumLiveFeeCodec).toBe(maximumLiveFeeCodec);
    }
  });
  it('rejects accessors, symbols, missing, inherited and extra fields without executing getters', () => {
    const getter = vi.fn();
    for (const input of [
      { ...fixture(), extra: true },
      { ...fixture(), [Symbol('extra')]: true },
      Object.create(fixture()),
      Object.assign(Object.create(null), fixture()),
      { ...fixture(), costPolicy: { ...fixture().costPolicy, extra: true } },
      { ...fixture(), implementation: {} },
      Object.defineProperty(fixture(), 'costPolicy', { get: getter }),
    ])
      expect(() => readGoalTargetExecutionModel(input)).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });
});

describe('target runtime declared fee stress', () => {
  it.each([
    ['124999999999999999', true],
    ['125000000000000000', true],
    ['125000000000000001', false],
  ])('compares raw %s to the cap exactly', (fee, withinLiveCap) => {
    const result = assessGoalTargetFee({ model: fixture(), queryInfoFeeCodec: fee, queryDetailsFeeCodec: fee });
    expect(result).toEqual({
      queryInfoFeeCodec: fee,
      queryDetailsFeeCodec: fee,
      withinLiveCap,
      modeledFeeCodec: '125000000000000000',
    });
    expect(Object.isFrozen(result)).toBe(true);
  });
  it('rejects inconsistent fee APIs instead of hiding the difference in a maximum', () => {
    expect(() =>
      assessGoalTargetFee({ model: fixture(), queryInfoFeeCodec: '1', queryDetailsFeeCodec: '2' })
    ).toThrow();
  });
  it.each(['0', '-1', '0.1', '01', (1n << 128n).toString(), 1, null])('rejects malformed fee %s', (fee) => {
    expect(() =>
      assessGoalTargetFee({ model: fixture(), queryInfoFeeCodec: fee, queryDetailsFeeCodec: fee })
    ).toThrow();
  });
  it('does not coerce amounts or execute accessors', () => {
    const getter = vi.fn();
    expect(() =>
      assessGoalTargetFee(
        Object.defineProperty(
          { model: fixture(), queryInfoFeeCodec: '1', queryDetailsFeeCodec: '1' },
          'queryInfoFeeCodec',
          {
            get: getter,
          }
        )
      )
    ).toThrow();
    expect(() =>
      assessGoalTargetFee({ model: fixture(), queryInfoFeeCodec: { toString: getter }, queryDetailsFeeCodec: '1' })
    ).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });
});

/** This exact fixture declares the fixed public source catalog; it carries no owned decoder authority. */
const catalogFixture = () => {
  const { sourceRuntimeProfile: _source, ...old } = fixture();
  return {
    ...old,
    protocol: GOAL_CATALOG_TARGET_MODEL_PROTOCOL,
    sourceRuntimeProfiles: GOAL_CATALOG_TARGET_SOURCE_PROFILES.map((p) => ({ ...p })),
    catalogSha256: GOAL_TARGET_RUNTIME_CATALOG_SHA256,
    stateModel: 'catalog-source-exact-storage-complete-xst-v1',
    implementation: { ...old.implementation, catalogCodecSha256: 'd'.repeat(64) },
  };
};
describe('finite catalog target model', () => {
  it('pins the ordered genuine source set and unchanged target and fee stress', () => {
    const input = catalogFixture();
    const model = readGoalTargetExecutionModel(input);
    expect(isGoalCatalogTargetExecutionModel(model)).toBe(true);
    expect(goalTargetSourceRuntimeProfiles(model)).toEqual(GOAL_CATALOG_TARGET_SOURCE_PROFILES);
    expect(goalTargetSourceRuntimeProfiles(model).map((p) => p.specVersion)).toEqual([128, 129, 130]);
    input.sourceRuntimeProfiles.reverse();
    input.implementation.catalogCodecSha256 = 'e'.repeat(64);
    expect(goalTargetSourceRuntimeProfiles(model)).toEqual(GOAL_CATALOG_TARGET_SOURCE_PROFILES);
    expect(Object.isFrozen(goalTargetSourceRuntimeProfiles(model))).toBe(true);
    expect(assessGoalTargetFee({ model, queryInfoFeeCodec: '1', queryDetailsFeeCodec: '1' })).toEqual({
      queryInfoFeeCodec: '1',
      queryDetailsFeeCodec: '1',
      withinLiveCap: true,
      modeledFeeCodec: '125000000000000000',
    });
  });
  it.each([
    'missing-source',
    'reordered-source',
    'duplicate-source',
    'target-as-source',
    'changed-metadata',
    'changed-code',
    'changed-catalog',
    'missing-codec',
    'old-state-model',
    'extra-singular',
    'old-protocol',
  ])('rejects catalog inconsistency: %s', (kind) => {
    const input = catalogFixture();
    if (kind === 'missing-source') input.sourceRuntimeProfiles.pop();
    if (kind === 'reordered-source') input.sourceRuntimeProfiles.reverse();
    if (kind === 'duplicate-source') input.sourceRuntimeProfiles[1] = { ...input.sourceRuntimeProfiles[0] };
    if (kind === 'target-as-source') Object.assign(input.sourceRuntimeProfiles[0], GOAL_TARGET_MODEL_PROFILES.target);
    if (kind === 'changed-metadata') Object.assign(input.sourceRuntimeProfiles[0], { metadataSha256: '0'.repeat(64) });
    if (kind === 'changed-code') Object.assign(input.sourceRuntimeProfiles[0], { codeHash: '0x' + '0'.repeat(64) });
    if (kind === 'changed-catalog') Object.assign(input, { catalogSha256: '0'.repeat(64) });
    if (kind === 'missing-codec') Reflect.deleteProperty(input.implementation, 'catalogCodecSha256');
    if (kind === 'old-state-model') input.stateModel = fixture().stateModel;
    if (kind === 'extra-singular') Object.assign(input, { sourceRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.source });
    if (kind === 'old-protocol') Object.assign(input, { protocol: GOAL_TARGET_MODEL_PROTOCOL });
    expect(() => readGoalTargetExecutionModel(input)).toThrow();
  });
  it('rejects sparse, accessor and extra-property profile arrays without executing accessors', () => {
    const getter = vi.fn();
    for (const mode of ['hole', 'getter', 'extra', 'symbol']) {
      const input = catalogFixture();
      if (mode === 'hole') Reflect.deleteProperty(input.sourceRuntimeProfiles, '1');
      if (mode === 'getter') Object.defineProperty(input.sourceRuntimeProfiles, '1', { get: getter });
      if (mode === 'extra') Object.assign(input.sourceRuntimeProfiles, { extra: 1 });
      if (mode === 'symbol') Object.assign(input.sourceRuntimeProfiles, { [Symbol('extra')]: 1 });
      expect(() => readGoalTargetExecutionModel(input)).toThrow();
    }
    expect(getter).not.toHaveBeenCalled();
  });
  it('does not add catalog fields or earlier profiles to the original model', () => {
    expect(() =>
      readGoalTargetExecutionModel({ ...fixture(), catalogSha256: GOAL_TARGET_RUNTIME_CATALOG_SHA256 })
    ).toThrow();
    expect(() =>
      readGoalTargetExecutionModel({ ...fixture(), sourceRuntimeProfile: GOAL_CATALOG_TARGET_SOURCE_PROFILES[0] })
    ).toThrow();
    expect(() =>
      readGoalTargetExecutionModel({
        ...fixture(),
        implementation: { ...fixture().implementation, catalogCodecSha256: 'd'.repeat(64) },
      })
    ).toThrow();
  });
});
