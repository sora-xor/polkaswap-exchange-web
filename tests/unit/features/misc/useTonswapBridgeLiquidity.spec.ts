import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, reactive } from 'vue';
import { DAI } from '@sora-substrate/sdk/build/assets/consts';
import {
  useTonswapBridgeLiquidity,
  type TonswapBridgeLiquidityContext,
} from '@/features/misc/composables/useTonswapBridgeLiquidity';

describe('guided bridge form liquidity', () => {
  let scope: ReturnType<typeof effectScope>;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    scope = effectScope();
  });
  afterEach(() => {
    scope.stop();
    vi.useRealTimers();
  });
  function setup(guided = true) {
    const context = reactive<TonswapBridgeLiquidityContext>({
      guided,
      amount: '10',
      assetAddress: DAI.address,
      incoming: true,
      ethereum: true,
      network: 1,
      networkValid: true,
      connected: true,
      mainnet: true,
      soraAddress: 'sora-user',
      evmAddress: 'evm-user',
    });
    const gate = scope.run(() => useTonswapBridgeLiquidity(() => context))!;
    const check = { allowed: true, amount: '10', xor: '1.8', impact: '1', expiresAt: 31_000 };
    return { context, gate, check };
  }
  it('requires an exact accepted amount and expires independently of the component result', () => {
    const { gate, check } = setup();
    expect(gate.blocked.value).toBe(true);
    gate.accept({ ...check, amount: '11' });
    expect(gate.isAllowed()).toBe(false);
    gate.accept(check);
    expect(gate.isAllowed()).toBe(true);
    expect(gate.blocked.value).toBe(false);
    vi.advanceTimersByTime(30_000);
    expect(gate.blocked.value).toBe(true);
    expect(gate.isAllowed()).toBe(false);
  });
  it.each([
    'amount',
    'assetAddress',
    'incoming',
    'ethereum',
    'network',
    'networkValid',
    'connected',
    'mainnet',
    'soraAddress',
    'evmAddress',
  ] as const)('invalidates an accepted result after %s changes, including changes back', (field) => {
    const { context, gate, check } = setup();
    gate.accept(check);
    const previous = context[field];
    Object.assign(context, { [field]: typeof previous === 'boolean' ? !previous : 'changed' });
    expect(gate.isAllowed()).toBe(false);
    Object.assign(context, { [field]: previous });
    expect(gate.isAllowed()).toBe(false);
  });
  it('keeps the guided policy active if its URL query is removed while the form is open', () => {
    const { context, gate, check } = setup();
    context.guided = false;
    expect(gate.guided.value).toBe(true);
    expect(gate.isAllowed()).toBe(false);
    gate.accept(check);
    expect(gate.isAllowed()).toBe(true);
    context.incoming = false;
    expect(gate.isAllowed()).toBe(false);
  });
  it('leaves an ordinary bridge unchanged but enables the gate for a later guided entry', () => {
    const { context, gate } = setup(false);
    context.connected = false;
    expect(gate.isAllowed()).toBe(true);
    context.guided = true;
    expect(gate.blocked.value).toBe(true);
  });
  it('rejects denied, malformed, already expired, or disconnected results', () => {
    const { context, gate, check } = setup();
    for (const next of [
      { ...check, allowed: false },
      { ...check, expiresAt: NaN },
      { ...check, expiresAt: 1_000 },
    ]) {
      gate.accept(next);
      expect(gate.isAllowed()).toBe(false);
    }
    context.connected = false;
    gate.accept(check);
    expect(gate.isAllowed()).toBe(false);
  });
  it('invalidates quotes when purpose changes and retains generic policy when the query disappears', () => {
    const { context, gate, check } = setup();
    gate.accept(check);
    expect(gate.isAllowed()).toBe(true);
    context.purpose = 'xor';
    expect(gate.purpose.value).toBe('xor');
    expect(gate.isAllowed()).toBe(false);
    context.guided = false;
    context.purpose = undefined;
    expect(gate.purpose.value).toBe('xor');
    gate.accept(check);
    expect(gate.isAllowed()).toBe(true);
  });
});
