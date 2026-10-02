// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import Ajv from 'ajv';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { createExecutionStateProvider } from '@/features/bot-trading/execution-state';
import { projectGoalSwapEstimate } from '@/features/agent-trading/goal-swap';
import { createAgentDigest } from '@/features/agent-trading/intent';
import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import {
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '@/features/bot-trading/execution-codecs/execution';
import { createExecutionStateFixture } from '../bot-trading/execution-state-fixture';
import { feeBytes, hex } from '../../scripts/bots/fixtures/historical-goal-bound-fee-fixture';

vi.unmock('@polkadot/util-crypto');

const schema = JSON.parse(await readFile(resolve('public/.well-known/polkaswap-agent.schema.json'), 'utf8'));
// The changed definitions use only draft-07-compatible keywords. AJV 6 resolves $defs via JSON pointers;
// compile these definitions directly, without misrepresenting support for the document's 2020-12 annotation.
const validator = (name: string) =>
  new Ajv({ allErrors: true }).compile({ $ref: `#/$defs/${name}`, $defs: schema.$defs });
const protocol = 'finalized-xyk-native-fee-v1' as const;
const execution = { protocol, expectedDenominator: '1' };
const legacy = { assetIn: { address: KUSD }, assetOut: { address: XOR }, amount: '2.5' };
const finalized = {
  ...legacy,
  execution,
  side: 'input',
  dexId: 0,
  liquiditySource: 'XYKPool',
  slippageTolerance: '0.5',
};

/** Produce actual browser-codec evidence from invented metadata, with no network or wallet. */
async function syntheticProjection() {
  const fixture = createExecutionStateFixture();
  const blockHash = fixture.identity.blockHash;
  const epoch = {};
  const hash = (value: string) => `0x${value.repeat(64)}`;
  const provider = createExecutionStateProvider({
    connection: () => ({ identity: epoch, connected: true }),
    now: () => fixture.now,
    request: async (method, params) => {
      switch (method) {
        case 'chain_getBlockHash':
          return params[0] === 0 ? GENESIS : blockHash;
        case 'chain_getFinalizedHead':
          return blockHash;
        case 'chain_getHeader':
          return {
            number: '0x64',
            parentHash: hash('3'),
            stateRoot: hash('4'),
            extrinsicsRoot: hash('5'),
            digest: { logs: [] },
          };
        case 'state_getRuntimeVersion':
          return { specName: 'sora-substrate', specVersion: 130, transactionVersion: 130, apis: [] };
        case 'state_getMetadata':
          return fixture.identity.metadataHex;
        case 'state_getStorageHash':
          return hash('a');
        case 'state_queryStorageAt':
          return [
            {
              block: blockHash,
              changes: Object.entries(fixture.keys).map(([label, key]) => [
                key,
                fixture.proof[label as keyof typeof fixture.proof],
              ]),
            },
          ];
        case 'liquidityProxy_quote':
          return {
            amount: '990000000000000000',
            amount_without_impact: '1000000000000000000',
            fee: { [XOR]: '6000000000000000' },
            route: [KUSD, XOR],
          };
        case 'state_call':
          return params[0] === 'TransactionPaymentApi_query_info'
            ? hex(
                fixture.registry
                  .createType('RuntimeDispatchInfo', { weight: 3, class: 'Normal', partialFee: '11' })
                  .toU8a()
              )
            : feeBytes(1, 7, 3);
      }
    },
  });
  const context = await provider.capture({ expectedDenominator: '1' });
  const estimate = await provider.quote(context, {
    assetIn: KUSD,
    assetOut: XOR,
    amountInCodec: '2500000000000000000',
  });
  if (estimate.status !== 'available') throw Error('Expected synthetic estimate');
  const assetIn = { address: KUSD, symbol: 'KUSD', name: 'KUSD', decimals: 18, isMintable: true };
  const assetOut = { address: XOR, symbol: 'XOR', name: 'XOR', decimals: 18, isMintable: true };
  const projection = projectGoalSwapEstimate({
    execution,
    assetIn,
    assetOut,
    estimate,
    resolved: {
      assetIn,
      assetOut,
      amount: '2.5',
      side: 'input',
      isExchangeB: false,
      dexId: 0,
      liquiditySource: LiquiditySourceTypes.XYKPool,
      slippageTolerance: '0.5',
      quoteTimeoutMs: 5000,
    },
  });
  return {
    ...projection,
    quote: { ...projection.quote, quoteDigest: await createAgentDigest('swap.quote', projection.quote) },
  };
}

describe('public finalized preparation contracts', () => {
  it.each(['swapRequest', 'swapAssessmentRequest'])(
    '%s preserves legacy requests and requires the explicit finalized selectors',
    (name) => {
      const check = validator(name);
      expect(check(legacy), JSON.stringify(check.errors)).toBe(true);
      expect(check(finalized), JSON.stringify(check.errors)).toBe(true);
      for (const key of ['side', 'dexId', 'liquiditySource', 'slippageTolerance']) {
        const missing = { ...finalized };
        Reflect.deleteProperty(missing, key);
        expect(check(missing), key).toBe(false);
      }
      for (const patch of [
        { side: 'output' },
        { dexId: '0' },
        { dexId: 1 },
        { liquiditySource: 'Default' },
        { slippageTolerance: 0.5 },
        { slippageTolerance: '0.50' },
        { execution: null },
      ]) {
        expect(check({ ...finalized, ...patch }), JSON.stringify(patch)).toBe(false);
      }
    }
  );

  it('accepts exactly two selector keys and the full canonical positive u128 denominator range', () => {
    const check = validator('goalExecutionRequest');
    const max = (1n << 128n) - 1n;
    for (const expectedDenominator of [
      '1',
      '9',
      '10',
      (10n ** 38n).toString(),
      (max - 1n).toString(),
      max.toString(),
    ]) {
      expect(check({ protocol, expectedDenominator }), expectedDenominator).toBe(true);
    }
    for (const expectedDenominator of [
      '0',
      '01',
      '-1',
      '1.0',
      '1e2',
      '',
      (max + 1n).toString(),
      (10n ** 39n).toString(),
      1,
    ]) {
      expect(check({ protocol, expectedDenominator }), String(expectedDenominator)).toBe(false);
    }
    for (const invalid of [
      { protocol },
      { expectedDenominator: '1' },
      { ...execution, extra: true },
      { ...execution, protocol: 'unknown' },
    ]) {
      expect(check(invalid)).toBe(false);
    }
  });

  it('validates the actual synthetic provider projection, full fee envelope and finalized fee source', async () => {
    const projection = await syntheticProjection();
    const quote = validator('swapQuote');
    const evidence = validator('goalExecutionEvidence');
    const fee = validator('feeEstimate');
    expect(quote(projection.quote), JSON.stringify(quote.errors)).toBe(true);
    expect(evidence(projection.quote.execution), JSON.stringify(evidence.errors)).toBe(true);
    expect(fee(projection.fee), JSON.stringify(fee.errors)).toBe(true);
    expect(projection.fee.source).toBe('finalized-runtime');
    const modified = structuredClone(projection.quote.execution);
    Reflect.deleteProperty(modified.estimate.fee.envelope, 'feeQueryDataHex');
    expect(evidence(modified)).toBe(false);
    expect(evidence({ ...projection.quote.execution, permission: true })).toBe(false);
    expect(
      evidence({
        ...projection.quote.execution,
        estimate: { ...projection.quote.execution.estimate, transactionSubmitted: true },
      })
    ).toBe(false);
  });

  it('rejects invalid finalized requests in the standalone public TypeScript declarations', () => {
    const filename = resolve('public/.well-known/__goal-contract-typecheck__.ts');
    const source = `
      import type { PolkaswapAgentSwapRequest as Request, PolkaswapAgentSwapAssessmentRequest as Assessment,
        PolkaswapAgentSwapQuote as Quote, PolkaswapAgentFeeEstimate as Fee } from './polkaswap-agent';
      const base = { assetIn: { symbol: 'KUSD' }, assetOut: { symbol: 'XOR' }, amount: '2.5' };
      const execution = { protocol: 'finalized-xyk-native-fee-v1' as const, expectedDenominator: '1' };
      const legacy: Request = base;
      const valid: Request = { ...base, execution, side: 'input', dexId: 0, liquiditySource: 'XYKPool', slippageTolerance: '0.5' };
      const assess: Assessment = { ...valid, policy: { maxPriceImpact: '1' } };
      // @ts-expect-error Explicit route selectors are required.
      const missing: Request = { ...base, execution };
      // @ts-expect-error String DEX is legacy-only.
      const stringDex: Request = { ...valid, dexId: '0' };
      // @ts-expect-error Numeric slippage is not accepted.
      const numericSlip: Request = { ...valid, slippageTolerance: 0.5 };
      // @ts-expect-error Output side cannot select this protocol.
      const wrongSide: Request = { ...valid, side: 'output' };
      // @ts-expect-error Selector object literals allow exactly two keys.
      const extra: Request = { ...valid, execution: { ...execution, extra: true } };
      declare const quote: Quote;
      const input: string = quote.execution!.estimate.fee.envelope.amountInCodec;
      const submitted: false = quote.execution!.estimate.transactionSubmitted;
      // @ts-expect-error Evidence is immutable.
      quote.execution!.estimate.fee.envelope.minimumCodec = '1';
      const fee: Fee = { operation: 'Swap', asset: quote.assetOut, amount: '0.1', amountCodec: '100000000000000000', source: 'finalized-runtime' };
      void [legacy, valid, assess, input, submitted, fee];
    `;
    const options: ts.CompilerOptions = {
      strict: true,
      noEmit: true,
      skipLibCheck: false,
      types: [],
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Node10,
    };
    const host = ts.createCompilerHost(options);
    const getSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) =>
      name === filename
        ? ts.createSourceFile(name, source, languageVersion, true)
        : getSourceFile(name, languageVersion, onError, shouldCreateNewSourceFile);
    const program = ts.createProgram([filename], options, host);
    const errors = ts
      .getPreEmitDiagnostics(program)
      .map((entry) => ts.flattenDiagnosticMessageText(entry.messageText, '\n'));
    expect(errors).toEqual([]);
  });

  it('publishes the execution restriction without adding methods or pretending the bot is active', async () => {
    expect(schema.methods.executeSwap.description).toContain('INTENT_MISMATCH');
    expect(schema.methods.executeSwap.description).toContain('rejects finalized-xyk-native-fee-v1');
    const docs = await readFile(resolve('docs/bots-goal-swap-projection.md'), 'utf8');
    expect(docs).toContain('preparation-only');
    expect(docs).toContain('prepareAndExecuteSwap');
    expect(docs).toContain('does not activate a bot');
    expect(docs).toContain("not a deposit or the goal's total budget");
  });
});
