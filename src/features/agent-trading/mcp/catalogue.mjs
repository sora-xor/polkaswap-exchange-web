/**
 * Environment-neutral MCP catalogue and invocation adapter for the browser
 * PolkaswapAgent API.
 *
 * This module intentionally imports no browser, Vue, Pinia, Node, or MCP SDK
 * modules. A Vite client, a Node 26 stdio server, or a remote MCP transport can
 * therefore share the same allowlist and validation behavior. The adapter only
 * exposes a public, account-redacted swap discovery and unsigned planning profile. It cannot prepare
 * executable intents, connect a wallet, sign, submit, inspect account history or
 * positions, mutate liquidity, transfer assets, or alter agent state.
 *
 * @module features/agent-trading/mcp/catalogue
 */

const TOOL_NAME_PATTERN = /^polkaswap_[a-z0-9_]{1,96}$/;
const SAFE_TEXT_PATTERN = '^[^\\u0000-\\u001F\\u007F]+$';
const DECIMAL_PATTERN = '^(?:0|[1-9][0-9]{0,59})(?:\\.[0-9]{1,30})?$';

const AGENT_ERROR_CODES = new Set([
  'AGENT_API_UNAVAILABLE',
  'ASSET_AMBIGUOUS',
  'ASSET_NOT_FOUND',
  'INVALID_AMOUNT',
  'INVALID_ASSET_REF',
  'INVALID_AGENT_STATE',
  'INVALID_CLIENT_ORDER_ID',
  'INVALID_DEX_ID',
  'IDEMPOTENCY_CONFLICT',
  'INTENT_ALREADY_USED',
  'INTENT_EXPIRED',
  'INTENT_INTEGRITY_FAILED',
  'INTENT_NOT_FOUND',
  'INTENT_REQUIRED',
  'INTENT_MISMATCH',
  'INVALID_LIQUIDITY_SOURCE',
  'INVALID_PERCENT',
  'INVALID_POOL_PAIR',
  'INVALID_RECIPIENT',
  'INVALID_SLIPPAGE',
  'INVALID_SUBSCRIPTION_SOURCE',
  'INVALID_SWAP_SIDE',
  'INVALID_TRANSACTION_ID',
  'INVALID_WALLET_SOURCE',
  'MCP_RESULT_INVALID',
  'NODE_NOT_READY',
  'NETWORK_CONTEXT_UNAVAILABLE',
  'PATH_UNAVAILABLE',
  'POOL_UNAVAILABLE',
  'QUOTE_TIMEOUT',
  'SIGNING_CANCELLED',
  'WALLET_ACCOUNT_NOT_FOUND',
  'WALLET_ACCOUNT_REQUIRED',
  'WALLET_NOT_CONNECTED',
  'WALLET_NOT_FOUND',
]);

const LIQUIDITY_SOURCES = ['', 'XYKPool', 'XSTPool', 'MulticollateralBondingCurvePool', 'OrderBook'];

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

/**
 * Returns a strict object schema. Keeping this construction in one place makes
 * the top-level `additionalProperties: false` requirement hard to omit.
 *
 * @param {Record<string, Record<string, unknown>>} properties JSON Schema properties.
 * @param {string[]} [required=[]] Required property names.
 * @param {Record<string, unknown>} [constraints={}] Additional object constraints.
 * @returns {Record<string, unknown>} A JSON Schema object definition.
 */
function strictObject(properties, required = [], constraints = {}) {
  return {
    type: 'object',
    additionalProperties: false,
    ...(required.length ? { required } : {}),
    properties,
    ...constraints,
  };
}

/**
 * Creates the bounded asset-reference schema accepted by PolkaswapAgent.
 * Requiring either an address or symbol prevents an empty object from reaching
 * the SDK's asset resolver.
 *
 * @returns {Record<string, unknown>} A strict asset-reference schema.
 */
function assetRefSchema() {
  return strictObject(
    {
      address: {
        type: 'string',
        minLength: 1,
        maxLength: 256,
        pattern: SAFE_TEXT_PATTERN,
      },
      symbol: {
        type: 'string',
        minLength: 1,
        maxLength: 64,
        pattern: SAFE_TEXT_PATTERN,
      },
    },
    [],
    {
      anyOf: [{ required: ['address'] }, { required: ['symbol'] }],
    }
  );
}

/**
 * Creates the precision-safe decimal schema used for token amounts and policy
 * percentages. MCP callers must send decimal strings rather than JSON numbers,
 * avoiding binary floating-point conversion before FPNumber handles the value.
 *
 * @returns {Record<string, unknown>} A bounded, non-negative decimal schema.
 */
function decimalSchema() {
  return {
    type: 'string',
    minLength: 1,
    maxLength: 91,
    pattern: DECIMAL_PATTERN,
  };
}

/**
 * Returns the shared swap request properties. Intent and client-order fields
 * are deliberately absent because this MCP surface can only quote or plan an
 * unsigned swap without creating an executable intent.
 *
 * @returns {Record<string, Record<string, unknown>>} Strict swap properties.
 */
function swapProperties() {
  return {
    assetIn: assetRefSchema(),
    assetOut: assetRefSchema(),
    amount: decimalSchema(),
    side: { type: 'string', enum: ['input', 'output'] },
    slippageTolerance: decimalSchema(),
    liquiditySource: { type: 'string', enum: LIQUIDITY_SOURCES },
    dexId: {
      oneOf: [
        { type: 'string', const: 'best' },
        { type: 'integer', minimum: 0, maximum: 65535 },
      ],
    },
    quoteTimeoutMs: { type: 'integer', minimum: 100, maximum: 120000 },
  };
}

/**
 * Creates the strict request schema shared by quotes and unsigned plans.
 *
 * @returns {Record<string, unknown>} A swap input schema.
 */
function swapRequestSchema() {
  return strictObject(swapProperties(), ['assetIn', 'assetOut', 'amount']);
}

/**
 * Defines one MCP tool using the same conservative side-effect annotations for
 * every allowlisted operation.
 *
 * @param {string} name Stable MCP tool name.
 * @param {string} title Human-readable title.
 * @param {string} description Model-facing description.
 * @param {Record<string, unknown>} inputSchema Strict JSON input schema.
 * @returns {Record<string, unknown>} An MCP `tools/list` entry.
 */
function toolDefinition(name, title, description, inputSchema) {
  return {
    name,
    title,
    description,
    inputSchema,
    annotations: { ...READ_ONLY_ANNOTATIONS },
  };
}

const EMPTY_INPUT = strictObject({});
const ASSET_LIST_INPUT = strictObject({
  query: {
    type: 'string',
    maxLength: 128,
    pattern: SAFE_TEXT_PATTERN,
  },
});
const RESOLVE_ASSET_INPUT = strictObject(
  {
    asset: assetRefSchema(),
  },
  ['asset']
);
const POOL_INPUT = strictObject(
  {
    assetA: assetRefSchema(),
    assetB: assetRefSchema(),
  },
  ['assetA', 'assetB']
);

const ACCOUNT_DATA_KEYS = new Set([
  'accountsCount',
  'available',
  'availableCodec',
  'balance',
  'clientOrderId',
  'envelope',
  'history',
  'idempotency',
  'intentId',
  'requiredBalances',
  'signer',
  'transaction',
  'wallet',
]);

/** Removes account-derived fields from otherwise public quote and asset data. */
function redactAccountData(value) {
  if (Array.isArray(value)) return value.map(redactAccountData);
  if (!isPlainRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !ACCOUNT_DATA_KEYS.has(key))
      .map(([key, entry]) => [key, redactAccountData(entry)])
  );
}

/** Projects full browser status to node/readiness data that identifies no account. */
function projectPublicStatus(value) {
  if (!isPlainRecord(value)) return {};
  const node = isPlainRecord(value.node) ? value.node : {};
  const agent = isPlainRecord(value.agent) ? value.agent : {};
  const settings = isPlainRecord(value.settings) ? value.settings : {};

  return {
    ...(typeof value.version === 'string' ? { version: value.version } : {}),
    agent: {
      ...(typeof agent.mode === 'boolean' ? { mode: agent.mode } : {}),
      ...(typeof agent.queryParam === 'string' ? { queryParam: agent.queryParam } : {}),
    },
    node: {
      ...(typeof node.connected === 'boolean' ? { connected: node.connected } : {}),
      ...(Number.isSafeInteger(node.blockNumber) ? { blockNumber: node.blockNumber } : {}),
      ...(typeof node.genesisHash === 'string' ? { genesisHash: node.genesisHash } : {}),
      ...(Number.isSafeInteger(node.runtimeSpecVersion) ? { runtimeSpecVersion: node.runtimeSpecVersion } : {}),
    },
    settings: {
      ...(typeof settings.slippageTolerance === 'string' ? { slippageTolerance: settings.slippageTolerance } : {}),
    },
  };
}

/**
 * Removes embedded account status and the private browser API method/capability
 * inventory before exposing runtime metadata through the public MCP profile.
 */
function projectPublicCapabilities(value) {
  if (!isPlainRecord(value)) return {};
  const status = value.status;
  const capabilities = Object.fromEntries(
    Object.entries(value).filter(([key]) => !['status', 'methods', 'capabilities'].includes(key))
  );
  return redactAccountData({ ...capabilities, status: projectPublicStatus(status) });
}

/** Exposes only the wallet-independent plan contract, never a prepared intent. */
function projectPublicSwapPlan(value) {
  if (
    !isPlainRecord(value) ||
    value.mode !== 'unsigned' ||
    value.canExecute !== false ||
    value.requiresWallet !== false
  ) {
    throw new PolkaswapMcpInvocationError('MCP_RESULT_INVALID', 'The Polkaswap unsigned plan is invalid.');
  }
  const network = isPlainRecord(value.network) ? value.network : {};
  const preview = isPlainRecord(value.preview) ? value.preview : {};
  return redactAccountData({
    mode: value.mode,
    canExecute: false,
    requiresWallet: false,
    quote: value.quote,
    preview: {
      operation: preview.operation,
      sdkCall: preview.sdkCall,
      stateChanging: preview.stateChanging,
      args: preview.args,
      summary: preview.summary,
    },
    fees: value.fees,
    warnings: value.warnings,
    plannedAt: value.plannedAt,
    expiresAt: value.expiresAt,
    network: {
      genesisHash: network.genesisHash,
      runtimeSpecVersion: network.runtimeSpecVersion,
      blockNumber: network.blockNumber,
    },
  });
}

const TOOL_SPECIFICATIONS = [
  {
    definition: toolDefinition(
      'polkaswap_capabilities',
      'Polkaswap capabilities',
      'Read public PolkaswapAgent runtime, limits, defaults, security metadata, and account-redacted node status. This tool cannot prepare or execute an intent.',
      EMPTY_INPUT
    ),
    method: 'capabilities',
    passInput: false,
    projectResult: projectPublicCapabilities,
  },
  {
    definition: toolDefinition(
      'polkaswap_status',
      'Polkaswap status',
      'Read account-redacted Polkaswap agent, SORA node, and slippage-setting status without exposing wallet identity or provider data.',
      EMPTY_INPUT
    ),
    method: 'status',
    passInput: false,
    projectResult: projectPublicStatus,
  },
  {
    definition: toolDefinition(
      'polkaswap_ready',
      'Wait for SORA node readiness',
      'Wait for SORA node readiness with a bounded timeout and return account-redacted status. This cannot inspect or require a wallet.',
      strictObject({
        requireNode: { type: 'boolean' },
        timeoutMs: { type: 'integer', minimum: 100, maximum: 120000 },
      })
    ),
    method: 'ready',
    passInput: true,
    mapInput: (input) => ({ ...input, requireWallet: false }),
    projectResult: projectPublicStatus,
  },
  {
    definition: toolDefinition(
      'polkaswap_assets',
      'Search Polkaswap assets',
      'List or search public Polkaswap asset metadata by a bounded text query. Wallet balances are always excluded.',
      ASSET_LIST_INPUT
    ),
    method: 'assets',
    passInput: true,
    mapInput: (input) => ({ ...input, includeBalances: false }),
    projectResult: redactAccountData,
  },
  {
    definition: toolDefinition(
      'polkaswap_resolve_asset',
      'Resolve a Polkaswap asset',
      'Resolve an asset address or symbol to public canonical Polkaswap metadata. Wallet balances are always excluded.',
      RESOLVE_ASSET_INPUT
    ),
    method: 'resolveAsset',
    passInput: true,
    mapInput: (input) => ({ ...input, includeBalance: false }),
    projectResult: redactAccountData,
  },
  {
    definition: toolDefinition(
      'polkaswap_common_assets',
      'List common route assets',
      'List or search public canonical assets commonly used as Polkaswap route endpoints. Wallet balances are always excluded.',
      ASSET_LIST_INPUT
    ),
    method: 'commonAssets',
    passInput: true,
    mapInput: (input) => ({ ...input, includeBalances: false }),
    projectResult: redactAccountData,
  },
  {
    definition: toolDefinition(
      'polkaswap_quote_swap',
      'Quote a Polkaswap swap',
      'Read an account-independent swap quote, quoteDigest, route, distribution, liquidity sources, price impact, and bounds. This cannot create an executable intent.',
      swapRequestSchema()
    ),
    method: 'quoteSwap',
    passInput: true,
    projectResult: redactAccountData,
  },
  {
    definition: toolDefinition(
      'polkaswap_plan_swap',
      'Plan an unsigned Polkaswap swap',
      'Autonomously quote a swap and return its unsigned call preview, route, bounds, fee estimates, warnings, network, and expiry. No wallet connection, account data, approval click, executable intent, signature, or submission is involved. Replan expired market data; a plan is never authorization to execute.',
      swapRequestSchema()
    ),
    method: 'planSwap',
    passInput: true,
    projectResult: projectPublicSwapPlan,
  },
  {
    definition: toolDefinition(
      'polkaswap_pool_info',
      'Read Polkaswap pool information',
      'Resolve an asset pair and read public XYK pool reserves, supply, prices, and pool-token metadata without wallet balances.',
      POOL_INPUT
    ),
    method: 'poolInfo',
    passInput: true,
    projectResult: redactAccountData,
  },
];

/**
 * Recursively freezes catalogue data so one transport cannot accidentally
 * alter schemas observed by another transport in the same process.
 *
 * @template T
 * @param {T} value Value to freeze.
 * @returns {Readonly<T>} The recursively frozen value.
 */
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;

  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

const TOOL_SPEC_BY_NAME = new Map(
  TOOL_SPECIFICATIONS.map((specification) => [specification.definition.name, deepFreeze(specification)])
);

/**
 * Deeply immutable MCP `tools/list` catalogue. Consumers that need mutable
 * transport payloads should use {@link listPolkaswapMcpTools} instead.
 *
 * @type {ReadonlyArray<Readonly<Record<string, unknown>>>}
 */
export const POLKASWAP_MCP_TOOLS = deepFreeze(TOOL_SPECIFICATIONS.map((specification) => specification.definition));

/**
 * Produces a transport-safe defensive copy of the tool catalogue. All values
 * are JSON data, so JSON cloning provides identical behavior in Node and modern
 * browsers without relying on `structuredClone` availability.
 *
 * @returns {Array<Record<string, unknown>>} Mutable MCP tool definitions.
 */
export function listPolkaswapMcpTools() {
  return JSON.parse(JSON.stringify(POLKASWAP_MCP_TOOLS));
}

/**
 * Structured error emitted by the MCP adapter. The upstream exception is kept
 * only as the non-serialized `cause`; its message and details are deliberately
 * excluded because RPC, extension, and provider errors may contain credentials
 * or other sensitive context.
 */
export class PolkaswapMcpInvocationError extends Error {
  /**
   * @param {string} code Stable machine-readable error code.
   * @param {string} message Safe caller-facing message.
   * @param {{toolName?: string, details?: Record<string, unknown>, cause?: unknown}} [options]
   * Safe metadata and an optional non-serialized source error.
   */
  constructor(code, message, options = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'PolkaswapMcpInvocationError';
    this.code = code;
    this.toolName = options.toolName;
    this.details = options.details;
  }

  /**
   * Returns the only error fields suitable for an MCP JSON response.
   *
   * @returns {{code: string, message: string, toolName?: string, details?: Record<string, unknown>}}
   * A secret-free serialized representation.
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.toolName ? { toolName: this.toolName } : {}),
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

/**
 * Internal validation sentinel. Only schema paths and rule identifiers are
 * recorded; rejected input values are never copied into error output.
 */
class SchemaValidationError extends Error {
  /**
   * @param {string} path JSON-like input path.
   * @param {string} rule Failed schema rule.
   */
  constructor(path, rule) {
    super(`Invalid input at ${path}.`);
    this.path = path;
    this.rule = rule;
  }
}

/**
 * Extends a validation path without reflecting arbitrary caller-controlled
 * property names into an MCP error.
 *
 * @param {string} path Parent path.
 * @param {string} key Object property name.
 * @returns {string} A safe diagnostic path.
 */
function propertyPath(path, key) {
  return /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key) ? `${path}.${key}` : `${path}.[property]`;
}

/**
 * Determines whether a value is a JSON-style object rather than an array or a
 * class instance.
 *
 * @param {unknown} value Candidate value.
 * @returns {value is Record<string, unknown>} Whether the value is a plain record.
 */
function isPlainRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Checks a value against the deliberately small JSON Schema subset used by the
 * exported catalogue. A local validator keeps this module dependency-free and
 * ensures transports do not accidentally skip validation.
 *
 * @param {unknown} value Input value.
 * @param {Record<string, unknown>} schema Catalogue schema.
 * @param {string} path Secret-free input path.
 * @throws {SchemaValidationError} When a schema rule fails.
 */
function validateSchema(value, schema, path) {
  if (Object.hasOwn(schema, 'const') && value !== schema.const) {
    throw new SchemaValidationError(path, 'const');
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => candidate === value)) {
    throw new SchemaValidationError(path, 'enum');
  }

  if (Array.isArray(schema.oneOf)) {
    const matches = schema.oneOf.filter((candidate) => schemaMatches(value, candidate, path)).length;
    if (matches !== 1) throw new SchemaValidationError(path, 'oneOf');
  }

  if (Array.isArray(schema.anyOf) && !schema.anyOf.some((candidate) => schemaMatches(value, candidate, path))) {
    throw new SchemaValidationError(path, 'anyOf');
  }

  // JSON Schema's `required` keyword applies to objects even when a branch
  // omits an explicit `type`. The compact anyOf branches above rely on this.
  if (Array.isArray(schema.required) && isPlainRecord(value)) {
    for (const key of schema.required) {
      if (!Object.hasOwn(value, key)) throw new SchemaValidationError(propertyPath(path, key), 'required');
    }
  }

  switch (schema.type) {
    case undefined:
      break;
    case 'object': {
      if (!isPlainRecord(value)) throw new SchemaValidationError(path, 'type');

      const properties = isPlainRecord(schema.properties) ? schema.properties : {};
      if (schema.additionalProperties === false) {
        for (const key of Object.keys(value)) {
          if (!Object.hasOwn(properties, key))
            throw new SchemaValidationError(propertyPath(path, key), 'additionalProperties');
        }
      }

      if (isPlainRecord(schema.dependentRequired)) {
        for (const [key, dependencies] of Object.entries(schema.dependentRequired)) {
          if (!Object.hasOwn(value, key) || !Array.isArray(dependencies)) continue;
          for (const dependency of dependencies) {
            if (!Object.hasOwn(value, dependency)) {
              throw new SchemaValidationError(propertyPath(path, dependency), 'dependentRequired');
            }
          }
        }
      }

      for (const [key, propertySchema] of Object.entries(properties)) {
        if (Object.hasOwn(value, key)) validateSchema(value[key], propertySchema, propertyPath(path, key));
      }
      break;
    }
    case 'string': {
      if (typeof value !== 'string') throw new SchemaValidationError(path, 'type');
      if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
        throw new SchemaValidationError(path, 'minLength');
      }
      if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) {
        throw new SchemaValidationError(path, 'maxLength');
      }
      if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern, 'u').test(value)) {
        throw new SchemaValidationError(path, 'pattern');
      }
      break;
    }
    case 'integer': {
      if (!Number.isSafeInteger(value)) throw new SchemaValidationError(path, 'type');
      if (typeof schema.minimum === 'number' && value < schema.minimum) {
        throw new SchemaValidationError(path, 'minimum');
      }
      if (typeof schema.maximum === 'number' && value > schema.maximum) {
        throw new SchemaValidationError(path, 'maximum');
      }
      break;
    }
    case 'boolean':
      if (typeof value !== 'boolean') throw new SchemaValidationError(path, 'type');
      break;
    case 'array': {
      if (!Array.isArray(value)) throw new SchemaValidationError(path, 'type');
      if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
        throw new SchemaValidationError(path, 'minItems');
      }
      if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) {
        throw new SchemaValidationError(path, 'maxItems');
      }
      if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) {
        throw new SchemaValidationError(path, 'uniqueItems');
      }
      if (isPlainRecord(schema.items)) {
        value.forEach((item, index) => validateSchema(item, schema.items, `${path}[${index}]`));
      }
      break;
    }
    default:
      throw new SchemaValidationError(path, 'unsupportedSchemaType');
  }
}

/**
 * Tests a schema branch without exposing its validation details. Used to
 * implement JSON Schema `oneOf` and `anyOf` semantics.
 *
 * @param {unknown} value Candidate value.
 * @param {Record<string, unknown>} schema Schema branch.
 * @param {string} path Input path.
 * @returns {boolean} Whether the branch matches.
 */
function schemaMatches(value, schema, path) {
  try {
    validateSchema(value, schema, path);
    return true;
  } catch (error) {
    if (error instanceof SchemaValidationError) return false;
    throw error;
  }
}

/**
 * Converts validation failures into stable, value-free MCP errors.
 *
 * @param {SchemaValidationError} error Validation failure.
 * @param {string} toolName Validated tool name.
 * @returns {PolkaswapMcpInvocationError} Public validation error.
 */
function normalizeValidationError(error, toolName) {
  return new PolkaswapMcpInvocationError('INVALID_ARGUMENT', error.message, {
    toolName,
    details: { path: error.path, rule: error.rule },
    cause: error,
  });
}

/**
 * Returns a stable agent error code without trusting arbitrary provider error
 * properties.
 *
 * @param {unknown} error Upstream exception.
 * @returns {string | undefined} Allowlisted PolkaswapAgent code.
 */
function getSafeAgentErrorCode(error) {
  if (!isPlainRecord(error) && !(error instanceof Error)) return undefined;
  try {
    const code = error.code;
    return typeof code === 'string' && AGENT_ERROR_CODES.has(code) ? code : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Normalizes an upstream browser-agent failure while retaining its original
 * exception only as `cause`. Upstream messages and details are not serialized.
 *
 * @param {unknown} error Upstream exception.
 * @param {string} toolName Validated MCP tool name.
 * @returns {PolkaswapMcpInvocationError} Secret-free invocation error.
 */
function normalizeAgentInvocationError(error, toolName) {
  const code = getSafeAgentErrorCode(error) ?? 'AGENT_CALL_FAILED';
  const message =
    code === 'AGENT_CALL_FAILED'
      ? 'The Polkaswap agent request failed.'
      : `The Polkaswap agent rejected the request (${code}).`;

  return new PolkaswapMcpInvocationError(code, message, { toolName, cause: error });
}

/**
 * Invokes one allowlisted PolkaswapAgent operation after strict, local input
 * validation. Synchronous and asynchronous agent methods are normalized to a
 * promise. Unknown tool names and unavailable methods are rejected before any
 * agent code runs.
 *
 * The supplied `agent` is intentionally structural: it may be the actual
 * `window.PolkaswapAgent`, a Playwright page proxy, or a test double with the
 * same method names.
 *
 * @param {object} agent PolkaswapAgent-compatible object or proxy.
 * @param {string} toolName Stable `polkaswap_*` tool name.
 * @param {Record<string, unknown>} [input={}] JSON-compatible tool arguments.
 * @returns {Promise<unknown>} The selected agent method result.
 * @throws {PolkaswapMcpInvocationError} For unknown tools, invalid input,
 * unavailable agent methods, or normalized upstream failures.
 */
export async function invokePolkaswapMcpTool(agent, toolName, input = {}) {
  const safeToolName = typeof toolName === 'string' && TOOL_NAME_PATTERN.test(toolName) ? toolName : undefined;
  const specification = safeToolName ? TOOL_SPEC_BY_NAME.get(safeToolName) : undefined;
  if (!specification) {
    throw new PolkaswapMcpInvocationError('UNKNOWN_TOOL', 'Unknown Polkaswap MCP tool.', {
      ...(safeToolName ? { toolName: safeToolName, details: { toolName: safeToolName } } : {}),
    });
  }

  try {
    validateSchema(input, specification.definition.inputSchema, 'input');
  } catch (error) {
    if (error instanceof SchemaValidationError) throw normalizeValidationError(error, safeToolName);
    throw error;
  }

  if (agent === null || (typeof agent !== 'object' && typeof agent !== 'function')) {
    throw new PolkaswapMcpInvocationError('AGENT_UNAVAILABLE', 'The Polkaswap agent is unavailable.', {
      toolName: safeToolName,
    });
  }

  let method;
  try {
    method = agent[specification.method];
  } catch (error) {
    throw normalizeAgentInvocationError(error, safeToolName);
  }
  if (typeof method !== 'function') {
    throw new PolkaswapMcpInvocationError(
      'AGENT_METHOD_UNAVAILABLE',
      'The requested Polkaswap agent method is unavailable.',
      { toolName: safeToolName }
    );
  }

  try {
    const mappedInput = specification.mapInput ? specification.mapInput(input) : input;
    const args = specification.passInput ? [mappedInput] : [];
    const result = await Reflect.apply(method, agent, args);
    return specification.projectResult ? specification.projectResult(result) : result;
  } catch (error) {
    throw normalizeAgentInvocationError(error, safeToolName);
  }
}
