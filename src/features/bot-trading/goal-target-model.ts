/** Explicit counterfactual research model. Parsing this data never grants qualification or wallet authority. */
export const GOAL_TARGET_MODEL_PROTOCOL = 'source130-target131-readonly-counterfactual-v1' as const;
export const GOAL_CATALOG_TARGET_MODEL_PROTOCOL = 'source128-129-130-target131-readonly-counterfactual-v1' as const;
export const GOAL_TARGET_COST_PROTOCOL = 'native-xor-declared-cap-stress-v1' as const;
export const GOAL_TARGET_RUNTIME_CATALOG_SHA256 = '7e23e21b5133e191c48a7a6015ba542e200a412f8883e099bd2cb3a521c50210';

/** Historical provenance and modeled execution deliberately have distinct identities. */
export const GOAL_TARGET_MODEL_PROFILES = Object.freeze({
  source: Object.freeze({
    specVersion: 130,
    transactionVersion: 130,
    metadataSha256: '726c0dcdc748164be3ed3cc65c149e936e08380ef99c1b3991a0db6c1d7d127b',
    codeHash: '0x2b33b01ba3f9e58e269b0e9619d25bedf3f60cdd6ed0ec519dacc75259c85d1e',
  }),
  target: Object.freeze({
    specVersion: 131,
    transactionVersion: 131,
    metadataSha256: '18aedaf96860e55c96ac6ad1d26f77cb2dc877ea822edf3242fdbe4f58bdd824',
    codeHash: '0xf062ed07861255f5ec443930de9c5066d1e4133036126d48462c8e233a75f27e',
  }),
});

/** Qualification profiles omit genesis; the separately owned raw catalog binds genesis and decoder provenance. */
export const GOAL_CATALOG_TARGET_SOURCE_PROFILES = Object.freeze([
  Object.freeze({
    specVersion: 128,
    transactionVersion: 128,
    metadataSha256: 'fdc915c28363daeb74b1b0524731ed6cd61163610e021c67d44a20d0fc809fb7',
    codeHash: '0xb360a17644db55f9c3e17b7428645e45aab4fe41a50e13d106a6089ae479787d',
  } as const),
  Object.freeze({
    specVersion: 129,
    transactionVersion: 129,
    metadataSha256: 'e5298fe292dac733548b53173ae5f29728f65d3eff798298fe5608864308c1f0',
    codeHash: '0x94fed6b837368b899593d9c5c9150e7a6bdbc3ecbee1bb9dac677b0d54bca3d8',
  } as const),
  GOAL_TARGET_MODEL_PROFILES.source,
] as const);
export type GoalTargetSourceRuntimeProfile = (typeof GOAL_CATALOG_TARGET_SOURCE_PROFILES)[number];

export const GOAL_TARGET_COMPRESSED_SHA256 = 'db948406c5f22d4923b2760019de53bcd0ef756ed05accaf5156ca3041988447';
const FEE_RESERVE = 1_000_000_000_000_000_000n;
const U128 = (1n << 128n) - 1n;
const SHA = /^[0-9a-f]{64}$/;

/** Pins identify the executed implementation; raw replay must verify them against its actual source manifest. */
export interface GoalSource130TargetExecutionModel {
  readonly protocol: typeof GOAL_TARGET_MODEL_PROTOCOL;
  readonly sourceRuntimeProfile: typeof GOAL_TARGET_MODEL_PROFILES.source;
  readonly targetRuntimeProfile: typeof GOAL_TARGET_MODEL_PROFILES.target;
  readonly targetCompressedSha256: typeof GOAL_TARGET_COMPRESSED_SHA256;
  readonly implementation: {
    readonly hostSha256: string;
    readonly stateCodecSha256: string;
    readonly quoteCodecSha256: string;
  };
  readonly stateModel: 'source130-exact-storage-complete-xst-v1';
  readonly fillModel: 'minimum-output-hypothetical-no-market-feedback';
  readonly costPolicy: {
    readonly protocol: typeof GOAL_TARGET_COST_PROTOCOL;
    /** Explicitly chosen before training; not inferred from a successful backtest or a current fee observation. */
    readonly maximumLiveFeeCodec: string;
  };
}

/** Separate finite source catalog model; none of its fields alias or relax the original source130 model. */
export interface GoalCatalogTargetExecutionModel extends Omit<
  GoalSource130TargetExecutionModel,
  'protocol' | 'sourceRuntimeProfile' | 'implementation' | 'stateModel'
> {
  readonly protocol: typeof GOAL_CATALOG_TARGET_MODEL_PROTOCOL;
  readonly sourceRuntimeProfiles: typeof GOAL_CATALOG_TARGET_SOURCE_PROFILES;
  readonly catalogSha256: typeof GOAL_TARGET_RUNTIME_CATALOG_SHA256;
  readonly implementation: GoalSource130TargetExecutionModel['implementation'] & {
    readonly catalogCodecSha256: string;
  };
  readonly stateModel: 'catalog-source-exact-storage-complete-xst-v1';
}
export type GoalTargetExecutionModel = GoalSource130TargetExecutionModel | GoalCatalogTargetExecutionModel;

const fail = (): never => {
  throw new Error('bots.errors.research');
};

/** Read exact own data properties without getters, inherited fields, coercion or caller mutation. */
function own(value: unknown, names: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return fail();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Reflect.ownKeys(descriptors).length !== names.length ||
    names.some((name) => !descriptors[name]?.enumerable || !('value' in descriptors[name]))
  )
    return fail();
  return Object.fromEntries(names.map((name) => [name, descriptors[name].value]));
}

/** Exact positive u128 codec amounts; natural units and floating point are not accepted. */
function amount(value: unknown): bigint {
  if (typeof value !== 'string' || !/^[1-9]\d{0,38}$/.test(value)) return fail();
  const result = BigInt(value);
  return result <= U128 ? result : fail();
}

/** Validate the exact data and execution identities, returning detached, frozen data only. */
export function readGoalTargetExecutionModel(raw: unknown): GoalTargetExecutionModel {
  if (!raw || typeof raw !== 'object' || Object.getPrototypeOf(raw) !== Object.prototype) return fail();
  const discriminator = Object.getOwnPropertyDescriptor(raw, 'protocol');
  if (!discriminator?.enumerable || !('value' in discriminator)) return fail();
  const catalog = discriminator.value === GOAL_CATALOG_TARGET_MODEL_PROTOCOL;
  const model = own(raw, [
    'protocol',
    ...(catalog ? ['sourceRuntimeProfiles', 'catalogSha256'] : ['sourceRuntimeProfile']),
    'targetRuntimeProfile',
    'targetCompressedSha256',
    'implementation',
    'stateModel',
    'fillModel',
    'costPolicy',
  ]);
  if (
    model.protocol !== (catalog ? GOAL_CATALOG_TARGET_MODEL_PROTOCOL : GOAL_TARGET_MODEL_PROTOCOL) ||
    model.targetCompressedSha256 !== GOAL_TARGET_COMPRESSED_SHA256 ||
    model.stateModel !==
      (catalog ? 'catalog-source-exact-storage-complete-xst-v1' : 'source130-exact-storage-complete-xst-v1') ||
    model.fillModel !== 'minimum-output-hypothetical-no-market-feedback'
  )
    return fail();
  const profileMatches = (
    rawProfile: unknown,
    expected: GoalTargetSourceRuntimeProfile | typeof GOAL_TARGET_MODEL_PROFILES.target
  ) => {
    const profile = own(rawProfile, ['specVersion', 'transactionVersion', 'metadataSha256', 'codeHash']);
    if (Object.entries(expected).some(([key, value]) => profile[key] !== value)) return fail();
  };
  profileMatches(model.targetRuntimeProfile, GOAL_TARGET_MODEL_PROFILES.target);
  if (catalog) {
    if (model.catalogSha256 !== GOAL_TARGET_RUNTIME_CATALOG_SHA256 || !Array.isArray(model.sourceRuntimeProfiles))
      return fail();
    const array = model.sourceRuntimeProfiles;
    const descriptors = Object.getOwnPropertyDescriptors(array);
    if (array.length !== 3 || Reflect.ownKeys(descriptors).length !== 4) return fail();
    GOAL_CATALOG_TARGET_SOURCE_PROFILES.forEach((expected, i) => {
      if (!descriptors[i]?.enumerable || !('value' in descriptors[i])) return fail();
      profileMatches(descriptors[i].value, expected);
    });
  } else {
    profileMatches(model.sourceRuntimeProfile, GOAL_TARGET_MODEL_PROFILES.source);
  }
  const pins = own(model.implementation, [
    'hostSha256',
    'stateCodecSha256',
    'quoteCodecSha256',
    ...(catalog ? ['catalogCodecSha256'] : []),
  ]);
  if (Object.values(pins).some((pin) => typeof pin !== 'string' || !SHA.test(pin))) return fail();
  const cost = own(model.costPolicy, ['protocol', 'maximumLiveFeeCodec']);
  if (cost.protocol !== GOAL_TARGET_COST_PROTOCOL || amount(cost.maximumLiveFeeCodec) > FEE_RESERVE) return fail();
  const common = {
    targetRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.target,
    targetCompressedSha256: GOAL_TARGET_COMPRESSED_SHA256,
    implementation: {
      hostSha256: pins.hostSha256 as string,
      stateCodecSha256: pins.stateCodecSha256 as string,
      quoteCodecSha256: pins.quoteCodecSha256 as string,
    },
    fillModel: 'minimum-output-hypothetical-no-market-feedback' as const,
    costPolicy: Object.freeze({
      protocol: GOAL_TARGET_COST_PROTOCOL,
      maximumLiveFeeCodec: cost.maximumLiveFeeCodec as string,
    }),
  } as const;
  if (catalog)
    return Object.freeze({
      protocol: GOAL_CATALOG_TARGET_MODEL_PROTOCOL,
      sourceRuntimeProfiles: GOAL_CATALOG_TARGET_SOURCE_PROFILES,
      catalogSha256: GOAL_TARGET_RUNTIME_CATALOG_SHA256,
      ...common,
      implementation: Object.freeze({
        ...common.implementation,
        catalogCodecSha256: pins.catalogCodecSha256 as string,
      }),
      stateModel: 'catalog-source-exact-storage-complete-xst-v1',
    });
  return Object.freeze({
    protocol: GOAL_TARGET_MODEL_PROTOCOL,
    sourceRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.source,
    targetRuntimeProfile: common.targetRuntimeProfile,
    targetCompressedSha256: common.targetCompressedSha256,
    implementation: Object.freeze(common.implementation),
    stateModel: 'source130-exact-storage-complete-xst-v1',
    fillModel: common.fillModel,
    costPolicy: common.costPolicy,
  });
}

/** Discriminate already parsed model data; this conveys no catalog or execution ownership. */
export function isGoalCatalogTargetExecutionModel(
  model: GoalTargetExecutionModel
): model is GoalCatalogTargetExecutionModel {
  return model.protocol === GOAL_CATALOG_TARGET_MODEL_PROTOCOL;
}

/** Return the exact detached source set after validating the model, never caller-selected profile membership. */
export function goalTargetSourceRuntimeProfiles(
  model: GoalTargetExecutionModel
): readonly GoalTargetSourceRuntimeProfile[] {
  const parsed = readGoalTargetExecutionModel(model);
  return isGoalCatalogTargetExecutionModel(parsed)
    ? parsed.sourceRuntimeProfiles
    : Object.freeze([parsed.sourceRuntimeProfile]);
}

/**
 * Keep genuine runtime fee results intact. A modeled order is eligible only when both agree and
 * fit the declared cap; accepted hypothetical fills charge the full cap. Live preparation and
 * post-signing estimation must independently enforce that cap. This calculation grants no admission.
 */
export function assessGoalTargetFee(raw: {
  model: unknown;
  queryInfoFeeCodec: unknown;
  queryDetailsFeeCodec: unknown;
}) {
  const input = own(raw, ['model', 'queryInfoFeeCodec', 'queryDetailsFeeCodec']);
  const model = readGoalTargetExecutionModel(input.model);
  const info = amount(input.queryInfoFeeCodec),
    details = amount(input.queryDetailsFeeCodec);
  if (info !== details) return fail();
  return Object.freeze({
    queryInfoFeeCodec: input.queryInfoFeeCodec as string,
    queryDetailsFeeCodec: input.queryDetailsFeeCodec as string,
    withinLiveCap: info <= BigInt(model.costPolicy.maximumLiveFeeCodec),
    modeledFeeCodec: model.costPolicy.maximumLiveFeeCodec,
  });
}
