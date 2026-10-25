/** Revocable, read-only execution-state capability for one connected public SDK client. */
import { createExecutionStateProvider, ExecutionStateError } from '@/features/bot-trading/execution-state';
import { createGoalTerminalProvider } from '@/features/bot-trading/goal-terminal';
import { createGoalRpc, type GoalRpcClient } from './goal-rpc';

type ConnectionEvent = 'connected' | 'disconnected';
interface HexCodec {
  toHex(): string;
}

/** Only public SDK state/events are used. The caller retains ownership of the shared connection. */
export interface GoalExecutionSessionClient {
  /** Custom SORA RPCs are absent from bare ApiPromise declarations; createGoalRpc validates them. */
  readonly rpc: unknown;
  readonly isConnected: boolean;
  readonly genesisHash: HexCodec;
  readonly runtimeVersion: HexCodec;
  readonly runtimeMetadata: object;
  on(event: ConnectionEvent, listener: () => void): unknown;
  off(event: ConnectionEvent, listener: () => void): unknown;
}
export interface GoalExecutionSessionOptions {
  client: GoalExecutionSessionClient;
  /** Must compare the captured client with the application's current client and context. */
  isCurrent(): boolean;
  now(): number;
}

/** Stable diagnostics never include SDK error text, endpoints, credentials or wallet state. */
export class GoalExecutionSessionError extends Error {
  constructor(readonly reason: 'unavailable' | 'context-changed' | 'disposed') {
    super(`Goal execution session ${reason}`);
    this.name = 'GoalExecutionSessionError';
  }
}

/**
 * Bind reads to one connection lifetime. Every public connection event permanently revokes the
 * capability, including a disconnect/reconnect that restores the same client before a read ends.
 * Runtime/metadata identity and the caller's guard are rechecked before and after every raw read.
 * Disposing cancels local waits and removes only these listeners; it never disconnects the SDK.
 */
export function createGoalExecutionSession(options: GoalExecutionSessionOptions) {
  if (!options || typeof options !== 'object') throw new GoalExecutionSessionError('unavailable');
  const descriptors = Object.getOwnPropertyDescriptors(options);
  for (const key of ['client', 'isCurrent', 'now']) {
    if (!descriptors[key] || !('value' in descriptors[key])) throw new GoalExecutionSessionError('unavailable');
  }
  const client = descriptors.client.value as GoalExecutionSessionClient;
  const isCurrent = descriptors.isCurrent.value as GoalExecutionSessionOptions['isCurrent'];
  const now = descriptors.now.value as GoalExecutionSessionOptions['now'];
  if (!client || typeof isCurrent !== 'function' || typeof now !== 'function')
    throw new GoalExecutionSessionError('unavailable');

  const lifetime = new AbortController();
  const identity = Object.freeze({});
  let reason: GoalExecutionSessionError['reason'] | undefined;
  let runtimeVersion: HexCodec;
  let runtimeHex: string;
  let metadata: object;
  let genesisHex: string;
  const attached = new Set<ConnectionEvent>();
  const revoke = (next: GoalExecutionSessionError['reason']) => {
    reason ??= next;
    lifetime.abort();
  };
  const onConnection = () => revoke('context-changed');
  const removeListeners = () => {
    for (const event of attached) {
      try {
        client.off(event, onConnection);
      } catch {
        // Revocation remains effective even if a broken SDK cannot remove its own listener.
      }
    }
    attached.clear();
  };
  const guard = (): void => {
    if (!reason) {
      try {
        if (
          isCurrent() !== true ||
          client.isConnected !== true ||
          client.runtimeVersion !== runtimeVersion ||
          runtimeVersion.toHex() !== runtimeHex ||
          client.runtimeMetadata !== metadata ||
          client.genesisHash.toHex() !== genesisHex
        )
          revoke('context-changed');
      } catch {
        revoke('context-changed');
      }
    }
    if (reason) throw new GoalExecutionSessionError(reason);
  };

  try {
    if (typeof client.on !== 'function' || typeof client.off !== 'function')
      throw new GoalExecutionSessionError('unavailable');
    for (const event of ['connected', 'disconnected'] as const) {
      // Record before subscribing so partial registration followed by an exception also cleans up.
      attached.add(event);
      client.on(event, onConnection);
    }
    runtimeVersion = client.runtimeVersion;
    runtimeHex = runtimeVersion.toHex();
    metadata = client.runtimeMetadata;
    genesisHex = client.genesisHash.toHex();
    if (
      !metadata ||
      typeof metadata !== 'object' ||
      typeof runtimeHex !== 'string' ||
      runtimeHex.length > 131074 ||
      !/^0x(?:[0-9a-fA-F]{2})+$/.test(runtimeHex) ||
      !/^0x[0-9a-fA-F]{64}$/.test(genesisHex)
    )
      throw new GoalExecutionSessionError('unavailable');
    guard();
    const rpc = createGoalRpc({
      client: client as GoalExecutionSessionClient & GoalRpcClient,
      isCurrent: () => {
        guard();
        return true;
      },
    });
    const provider = createExecutionStateProvider({
      request: rpc.request,
      connection: () => {
        guard();
        return { identity, connected: true };
      },
      now,
    });
    const terminal = createGoalTerminalProvider({
      request: rpc.request,
      connection: () => {
        guard();
        return { identity, connected: true };
      },
      now,
    });
    guard();
    const read = async <T>(work: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> => {
      guard();
      const controller = new AbortController();
      const abort = () => controller.abort();
      lifetime.signal.addEventListener('abort', abort, { once: true });
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) controller.abort();
      try {
        guard();
        if (signal?.aborted) throw new ExecutionStateError('aborted');
        const result = await work(controller.signal);
        guard();
        if (signal?.aborted) throw new ExecutionStateError('aborted');
        return result;
      } catch (error) {
        guard();
        throw error;
      } finally {
        lifetime.signal.removeEventListener('abort', abort);
        signal?.removeEventListener('abort', abort);
      }
    };
    return Object.freeze({
      captureTerminal: (input: Parameters<typeof terminal.capture>[0], signal?: AbortSignal) =>
        read((active) => terminal.capture(input, active), signal),
      assertTerminal: terminal.assertCurrent,
      capture: (input: Parameters<typeof provider.capture>[0], signal?: AbortSignal) =>
        read((active) => provider.capture(input, active), signal),
      quote: (
        context: Parameters<typeof provider.quote>[0],
        input: Parameters<typeof provider.quote>[1],
        signal?: AbortSignal
      ) => read((active) => provider.quote(context, input, active), signal),
      estimateEnvelopeFee: (
        context: Parameters<typeof provider.estimateEnvelopeFee>[0],
        input: Parameters<typeof provider.estimateEnvelopeFee>[1],
        signal?: AbortSignal
      ) => read((active) => provider.estimateEnvelopeFee(context, input, active), signal),
      assertCurrent: (context: Parameters<typeof provider.assertCurrent>[0]): void => {
        guard();
        provider.assertCurrent(context);
        guard();
      },
      dispose: (): void => {
        revoke('disposed');
        removeListeners();
      },
    });
  } catch (error) {
    revoke('unavailable');
    removeListeners();
    if (error instanceof GoalExecutionSessionError) throw error;
    throw new GoalExecutionSessionError('unavailable');
  }
}
