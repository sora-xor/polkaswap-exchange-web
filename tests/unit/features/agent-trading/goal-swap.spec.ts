// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import {
  GOAL_SWAP_EXECUTION_PROTOCOL,
  projectGoalSwapEstimate,
  readGoalSwapExecution,
  type GoalSwapProjectionInput,
} from '@/features/agent-trading/goal-swap';
import { createAgentDigest } from '@/features/agent-trading/intent';
import { buildSwapCall } from '@/features/agent-trading/swap-call';
import { createExecutionStateProvider } from '@/features/bot-trading/execution-state';
import {
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '@/features/bot-trading/execution-codecs/execution';
import { createExecutionStateFixture } from '../bot-trading/execution-state-fixture';
import { feeBytes, hex } from '../../scripts/bots/fixtures/historical-goal-bound-fee-fixture';

vi.unmock('@polkadot/util-crypto');
const fixture = createExecutionStateFixture();
const hash = (n: string) => `0x${n.repeat(64)}`;
const MAX = (1n << 128n) - 1n;
const execution = { protocol: GOAL_SWAP_EXECUTION_PROTOCOL, expectedDenominator: '1' };
async function setup(
  options: { reverse?: boolean; amount?: string; amountCodec?: string; output?: string; withoutImpact?: string } = {}
): Promise<GoalSwapProjectionInput> {
  const kusd = { address: KUSD, symbol: 'KUSD', name: 'Kensetsu Dollar', decimals: 18, isMintable: true };
  const xor = { address: XOR, symbol: 'XOR', name: 'SORA', decimals: 18, isMintable: true };
  const assetIn = options.reverse ? xor : kusd;
  const assetOut = options.reverse ? kusd : xor;
  const amount = options.amount ?? '2.5';
  const amountCodec = options.amountCodec ?? '2500000000000000000';
  const blockHash = fixture.identity.blockHash;
  const epoch = {};
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
            amount: options.output ?? '990000000000000000',
            amount_without_impact: options.withoutImpact ?? '1000000000000000000',
            fee: { [XOR]: '6000000000000000' },
            route: [assetIn.address, assetOut.address],
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
    assetIn: assetIn.address,
    assetOut: assetOut.address,
    amountInCodec: amountCodec,
  });
  if (estimate.status !== 'available') throw Error('expected fixture estimate');
  return {
    execution: { ...execution },
    assetIn,
    assetOut,
    resolved: {
      assetIn,
      assetOut,
      amount,
      side: 'input',
      isExchangeB: false,
      dexId: 0,
      liquiditySource: LiquiditySourceTypes.XYKPool,
      slippageTolerance: '0.5',
      quoteTimeoutMs: 5000,
    },
    estimate,
  };
}
function change(input: GoalSwapProjectionInput, path: string, value: unknown): GoalSwapProjectionInput {
  const copy = JSON.parse(JSON.stringify(input)) as GoalSwapProjectionInput;
  let record = copy as unknown as Record<string, unknown>;
  const keys = path.split('.');
  for (const key of keys.slice(0, -1)) record = record[key] as Record<string, unknown>;
  record[keys.at(-1)!] = value;
  return copy;
}

describe('explicit finalized goal swap projection', () => {
  it('preserves undefined legacy selection and freezes the exact recognized selector', () => {
    expect(readGoalSwapExecution(undefined)).toBeUndefined();
    const request = readGoalSwapExecution(execution);
    expect(request).toEqual(execution);
    expect(request).not.toBe(execution);
    expect(Object.isFrozen(request)).toBe(true);
    expect(readGoalSwapExecution({ ...execution, expectedDenominator: MAX.toString() })?.expectedDenominator).toBe(
      MAX.toString()
    );
  });
  it.each([
    null,
    false,
    '',
    [],
    {},
    { protocol: GOAL_SWAP_EXECUTION_PROTOCOL },
    { ...execution, protocol: 'goal-episodes-v2' },
    { ...execution, extra: true },
    ...['0', '01', '1.0', '-1', '+1', ' 1', '1e2', (MAX + 1n).toString(), 1].map((expectedDenominator) => ({
      ...execution,
      expectedDenominator,
    })),
  ])('rejects malformed execution selection %# without defaulting', (value) => {
    expect(() => readGoalSwapExecution(value)).toThrow('Invalid finalized goal swap evidence.');
  });
  it('rejects selector getters, inherited properties and symbols without invoking code', () => {
    const getter = vi.fn(() => '1');
    const accessor = {
      protocol: GOAL_SWAP_EXECUTION_PROTOCOL,
      get expectedDenominator() {
        return getter();
      },
    };
    expect(() => readGoalSwapExecution(accessor)).toThrow();
    expect(() => readGoalSwapExecution(Object.create(execution))).toThrow();
    expect(() => readGoalSwapExecution({ ...execution, [Symbol('extra')]: true })).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });
  it.each([false, true])(
    'projects exact %s-direction amounts, preserves evidence, and separates pool/native fees',
    async (reverse) => {
      const input = await setup({ reverse });
      const before = JSON.stringify(input);
      const { quote, fee } = projectGoalSwapEstimate(input);
      expect(quote.amountIn).toBe('2.5');
      expect(quote.amountOut).toBe('0.99');
      expect(quote.amountWithoutImpact).toBe('1');
      expect(quote.minAmountOut).toBe('0.98505');
      expect(quote.priceImpact).toBe('-1');
      expect(quote.raw.amount).toBe('990000000000000000');
      expect(quote.raw.fee).toEqual({ [XOR]: '6000000000000000' });
      expect(fee).toMatchObject({
        operation: 'Swap',
        asset: { address: XOR, decimals: 18 },
        amount: '0.000000000000000011',
        amountCodec: '11',
        source: 'finalized-runtime',
      });
      expect(quote.amountOutMeta).toMatchObject({ codec: quote.raw.amount, value: quote.amountOut, decimals: 18 });
      expect(quote.execution.estimate).toEqual(input.estimate);
      expect(quote.execution.estimate).not.toBe(input.estimate);
      expect(Object.isFrozen(quote.execution.estimate.fee.envelope)).toBe(true);
      expect(Object.isFrozen(quote.route)).toBe(true);
      expect(quote).not.toHaveProperty('quoteDigest');
      expect(quote).not.toHaveProperty('maxAmountIn');
      expect(JSON.stringify(input)).toBe(before);
      const factory = vi.fn();
      buildSwapCall(factory, { ...quote, quoteDigest: '' });
      expect(factory).toHaveBeenCalledExactlyOnceWith(
        0,
        input.assetIn.address,
        input.assetOut.address,
        { WithDesiredInput: { desiredAmountIn: '2500000000000000000', minAmountOut: '985050000000000000' } },
        [LiquiditySourceTypes.XYKPool],
        'AllowSelected'
      );
      const digest = await createAgentDigest('swap.quote', quote);
      const modified = JSON.parse(JSON.stringify(quote));
      modified.execution.estimate.fee.envelope.callHex += '00';
      expect(await createAgentDigest('swap.quote', modified)).not.toBe(digest);
    }
  );
  it.each([
    ['989960', '1000000', '-1.004'],
    ['2', '3', '-33.333333333333333334'],
    ['2', '2', '0'],
    [(MAX - 1n).toString(), MAX.toString(), '-0.000000000000000001'],
  ])('renders %s / %s impact conservatively without rounding the amounts', async (output, withoutImpact, impact) => {
    const { quote } = projectGoalSwapEstimate(await setup({ output, withoutImpact }));
    expect(quote.priceImpact).toBe(impact);
    expect(quote.raw.amount).toBe(output);
    expect(quote.raw.amountWithoutImpact).toBe(withoutImpact);
  });
  it('preserves exact u128 input and all 18 fraction digits beyond JavaScript safe integers', async () => {
    const amount = '340282366920938463463.374607431768211455';
    const { quote } = projectGoalSwapEstimate(await setup({ amount, amountCodec: MAX.toString() }));
    expect(quote.amountIn).toBe(amount);
    expect(quote.amountInMeta.codec).toBe(MAX.toString());
  });
  it.each([
    ['resolved.side', 'output'],
    ['resolved.side', undefined],
    ['resolved.isExchangeB', true],
    ['resolved.dexId', 'best'],
    ['resolved.dexId', undefined],
    ['resolved.liquiditySource', 'Default'],
    ['resolved.liquiditySource', undefined],
    ['resolved.slippageTolerance', '1'],
    ['resolved.slippageTolerance', undefined],
    ['resolved.amount', '2.500000000000000001'],
    ['resolved.amount', '1e2'],
    ['resolved.amount', '0'],
    ['resolved.amount', '2.5000000000000000001'],
    ['resolved.amount', '340282366920938463463.374607431768211456'],
    ['assetIn.decimals', 6],
    ['assetOut.address', hash('b')],
    ['assetIn.symbol', 'XOR'],
    ['resolved.assetIn.decimals', 6],
    ['execution.expectedDenominator', '2'],
  ])('rejects incompatible resolved request at %s', (path, value) => {
    expect(() => projectGoalSwapEstimate(change(awaitInput, path, value))).toThrow();
  });
  let awaitInput: GoalSwapProjectionInput;
  // Share one detached synthetic provider result across the table; each mutation clones it.
  beforeAll(async () => {
    awaitInput = await setup();
  });
  it.each([
    ['estimate.status', 'unavailable'],
    ['estimate.request.amountInCodec', '1'],
    ['estimate.quote.minimumAmountOutCodec', '985050000000000001'],
    ['estimate.quote.amountWithoutImpactCodec', '1'],
    ['estimate.quote.dexId', 1],
    ['estimate.quote.liquiditySource', 'Default'],
    ['estimate.quote.slippageBps', 100],
    ['estimate.quote.route', [XOR, KUSD]],
    ['estimate.context.expectedDenominator', '2'],
    ['estimate.context.pool.state.denominator', '2'],
    ['estimate.context.pool.status', 'zero-reserves'],
    ['estimate.context.block.hash', hash('9')],
    ['estimate.fee.assetId', KUSD],
    ['estimate.fee.envelope.minimumCodec', '1'],
    ['estimate.fee.envelope.blockHash', hash('9')],
    ['estimate.fee.amountCodec', '12'],
    ['estimate.fee.details.finalFee', '12'],
    ['estimate.raw.quote.amount', '1'],
    ['estimate.raw.quote.fee', { [KUSD]: '1' }],
    ['estimate.raw.details', '0x00'],
    ['estimate.transactionSubmitted', true],
  ])('rejects contradictory estimate at %s', (path, value) => {
    expect(() => projectGoalSwapEstimate(change(awaitInput, path, value))).toThrow();
  });
  it('rejects evidence accessors without invoking them and drops balances from public assets', () => {
    const input = change(awaitInput, 'assetIn.balance', { transferable: '999' });
    expect(projectGoalSwapEstimate(input).quote.assetIn).not.toHaveProperty('balance');
    const getter = vi.fn(() => 'available');
    const estimate = { ...input.estimate };
    Object.defineProperty(estimate, 'status', { enumerable: true, get: getter });
    expect(() => projectGoalSwapEstimate({ ...input, estimate })).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });
});
