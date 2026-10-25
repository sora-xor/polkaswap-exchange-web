/** Internal read-only preparation ownership. Nothing here unlocks a wallet or grants trading authority. */
import type { ExecutionStateContext } from '@/features/bot-trading/execution-state';
import type { createGoalExecutionSession } from './goal-execution-session';
import type { AgentPreparedSwap, AgentSwapRequest, PolkaswapAgentApi } from './types';

export interface OwnedGoalPreparation {
  readonly prepared: AgentPreparedSwap;
  /** The provider's original context, never the detached copy in the public prepared quote. */
  readonly context: ExecutionStateContext;
  readonly session: ReturnType<typeof createGoalExecutionSession>;
  /** Recheck the original prepared context; refreshed post-signing contexts have their own checks. */
  assertCurrent(): void;
  /** The recipient owns cleanup, including after an error or cancellation. */
  dispose(): void;
}

type Prepare = (request: AgentSwapRequest) => Promise<OwnedGoalPreparation>;
const preparations = new WeakMap<PolkaswapAgentApi, Prepare>();

/** Service-only registration keeps the capability off the public agent object and serialized state. */
export function registerOwnedGoalPreparation(agent: PolkaswapAgentApi, prepare: Prepare): void {
  if (!agent || typeof agent !== 'object' || typeof prepare !== 'function' || preparations.has(agent))
    throw new Error('bots.errors.intent');
  preparations.set(agent, prepare);
}

/**
 * Prepare through the actual service instance and transfer its read-only session to the executor.
 * A public prepared DTO, imported intent, different API object or legacy request cannot recover it.
 * This registry is application plumbing, not an authentication boundary against same-origin code.
 */
export async function prepareOwnedGoalSwap(
  agent: PolkaswapAgentApi,
  request: AgentSwapRequest
): Promise<OwnedGoalPreparation> {
  const prepare = preparations.get(agent);
  const execution = request && Object.getOwnPropertyDescriptor(request, 'execution');
  const protocol =
    execution && 'value' in execution && execution.value && typeof execution.value === 'object'
      ? Object.getOwnPropertyDescriptor(execution.value, 'protocol')
      : undefined;
  if (!prepare || !protocol || !('value' in protocol) || protocol.value !== 'finalized-xyk-native-fee-v1')
    throw new Error('bots.errors.intent');
  return prepare(request);
}
