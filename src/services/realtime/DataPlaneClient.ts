import { normalizeRealtimeProfile } from '@/services/realtime/profile';
import { isDataPlaneWorkerOutgoingMessage } from '@/services/realtime/protocol';

import type { DataPlaneWorkerIncomingMessage, DataPlaneWorkerOutgoingMessage } from '@/services/realtime/protocol';
import type { RealtimePriority, RealtimeProfile } from '@/services/realtime/profile';

type WorkerEndpoint = Worker | MessagePort;
type WorkerLike = Worker | SharedWorker;

type PendingRequest = {
  kind: 'ack' | 'response';
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

type SubscriptionHandler = (payload: unknown) => void;
type StatusHandler = (payload: Extract<DataPlaneWorkerOutgoingMessage, { type: 'status' }>) => void;
type MetricsHandler = (payload: Extract<DataPlaneWorkerOutgoingMessage, { type: 'metrics' }>) => void;

const REQUEST_TIMEOUT_MS = 15000;

/**
 * Main-thread facade over the realtime worker data-plane.
 * Handles worker lifecycle, command/response routing, and subscription fan-out.
 */
export class DataPlaneClient {
  private worker: WorkerLike | null = null;
  private endpoint: WorkerEndpoint | null = null;
  private started = false;
  private requestId = 1;
  private defaultProfile: RealtimeProfile = 'balanced';
  private maxConnections = Number.MAX_SAFE_INTEGER;

  private readonly pending = new Map<number, PendingRequest>();
  private readonly handlers = new Map<string, Set<SubscriptionHandler>>();
  private readonly subscriptionRefCount = new Map<string, number>();
  private readonly connectionEndpoints = new Map<string, string>();
  private readonly pendingConnectAcks = new Map<string, Promise<void>>();
  private readonly statusHandlers = new Set<StatusHandler>();
  private readonly metricsHandlers = new Set<MetricsHandler>();

  public async start(
    options: {
      preferSharedWorker?: boolean;
      profile?: RealtimeProfile;
      maxConnections?: number;
    } = {}
  ): Promise<boolean> {
    const profile = normalizeRealtimeProfile(options.profile);
    this.defaultProfile = profile;
    if (Number.isFinite(options.maxConnections) && (options.maxConnections as number) > 0) {
      this.maxConnections = Math.floor(options.maxConnections as number);
    }

    if (this.started && this.endpoint) {
      await this.setProfile(profile);
      return true;
    }

    const preferSharedWorker = Boolean(options.preferSharedWorker);

    const sharedSupported = typeof SharedWorker !== 'undefined';
    const workerSupported = typeof Worker !== 'undefined';

    if (!sharedSupported && !workerSupported) {
      return false;
    }

    if (preferSharedWorker && sharedSupported) {
      try {
        const shared = new SharedWorker(new URL('../../workers/realtime/shared.worker.ts', import.meta.url), {
          name: 'realtime-data-plane',
          type: 'module',
        });
        shared.port.start();
        this.worker = shared;
        this.endpoint = shared.port;
      } catch {
        this.worker = null;
        this.endpoint = null;
      }
    }

    if (!this.endpoint && workerSupported) {
      try {
        const worker = new Worker(new URL('../../workers/realtime/dedicated.worker.ts', import.meta.url), {
          name: 'realtime-data-plane',
          type: 'module',
        });
        this.worker = worker;
        this.endpoint = worker;
      } catch {
        this.worker = null;
        this.endpoint = null;
      }
    }

    if (!this.endpoint) {
      return false;
    }

    this.bindEndpoint(this.endpoint);
    this.started = true;
    await Promise.all([
      this.setProfile(this.defaultProfile),
      this.setVisibility(typeof document === 'undefined' ? true : document.visibilityState === 'visible'),
    ]);
    return true;
  }

  public async stop(): Promise<void> {
    if (!this.started || !this.endpoint) return;

    await this.teardownSubscriptions();
    await this.teardownConnections();

    this.unbindEndpoint(this.endpoint);

    if (this.worker instanceof Worker) {
      this.worker.terminate();
    } else if (this.endpoint instanceof MessagePort) {
      this.endpoint.close();
    }

    this.pending.forEach((pending) => {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error('Realtime data-plane has been stopped'));
    });
    this.pending.clear();

    this.worker = null;
    this.endpoint = null;
    this.started = false;
    this.handlers.clear();
    this.subscriptionRefCount.clear();
    this.connectionEndpoints.clear();
    this.pendingConnectAcks.clear();
  }

  public async connect(connectionId: string, endpoint: string): Promise<void> {
    if (!(await this.ensureStarted())) {
      throw new Error('Realtime data-plane is not supported');
    }

    const establishedEndpoint = this.connectionEndpoints.get(connectionId);
    if (establishedEndpoint === endpoint) {
      const pending = this.pendingConnectAcks.get(connectionId);
      if (pending) {
        await pending;
      }
      return;
    }

    const inFlight = this.pendingConnectAcks.get(connectionId);
    if (inFlight) {
      try {
        await inFlight;
      } catch {
        // Continue with a fresh connect attempt below.
      }
      if (this.connectionEndpoints.get(connectionId) === endpoint) {
        return;
      }
    }

    const connectPromise = this.sendForAck({
      type: 'connect',
      connectionId,
      endpoint,
      maxConnections: this.maxConnections,
    })
      .then(() => {
        this.connectionEndpoints.set(connectionId, endpoint);
      })
      .finally(() => {
        if (this.pendingConnectAcks.get(connectionId) === connectPromise) {
          this.pendingConnectAcks.delete(connectionId);
        }
      });

    this.pendingConnectAcks.set(connectionId, connectPromise);
    await connectPromise;
  }

  public async disconnect(connectionId: string): Promise<void> {
    if (!this.started) return;

    const pendingConnect = this.pendingConnectAcks.get(connectionId);
    if (pendingConnect) {
      await pendingConnect.catch(() => undefined);
    }

    await this.sendForAck({
      type: 'disconnect',
      connectionId,
    });
    this.pendingConnectAcks.delete(connectionId);
    this.connectionEndpoints.delete(connectionId);
  }

  public async request(connectionId: string, method: string, params: unknown[] = []): Promise<unknown> {
    if (!(await this.ensureStarted())) {
      throw new Error('Realtime data-plane is not supported');
    }

    return await this.sendForResponse({
      type: 'request',
      connectionId,
      method,
      params,
    });
  }

  public async setVisibility(visible: boolean): Promise<void> {
    if (!(await this.ensureStarted())) return;

    await this.sendForAck({
      type: 'set_visibility',
      visible: Boolean(visible),
    });
  }

  public async setProfile(profile: RealtimeProfile): Promise<void> {
    if (!(await this.ensureStarted())) return;

    await this.sendForAck({
      type: 'set_profile',
      profile: normalizeRealtimeProfile(profile),
    });
  }

  public async subscribe(
    options: {
      connectionId: string;
      endpoint: string;
      subscriptionKey: string;
      method: string;
      unsubscribeMethod: string;
      params?: unknown[];
      priority?: RealtimePriority;
    },
    handler: SubscriptionHandler
  ): Promise<FnWithoutArgs> {
    if (!(await this.ensureStarted())) {
      throw new Error('Realtime data-plane is not supported');
    }

    await this.connect(options.connectionId, options.endpoint);

    const handlers = this.handlers.get(options.subscriptionKey) ?? new Set<SubscriptionHandler>();
    handlers.add(handler);
    this.handlers.set(options.subscriptionKey, handlers);

    const currentRef = this.subscriptionRefCount.get(options.subscriptionKey) ?? 0;

    if (currentRef === 0) {
      await this.sendForAck({
        type: 'subscribe',
        connectionId: options.connectionId,
        subscriptionKey: options.subscriptionKey,
        method: options.method,
        unsubscribeMethod: options.unsubscribeMethod,
        params: options.params ?? [],
        priority: options.priority ?? 'standard',
      });
    }

    this.subscriptionRefCount.set(options.subscriptionKey, currentRef + 1);

    return async () => {
      const registeredHandlers = this.handlers.get(options.subscriptionKey);
      registeredHandlers?.delete(handler);
      if (!registeredHandlers?.size) {
        this.handlers.delete(options.subscriptionKey);
      }

      const refCount = this.subscriptionRefCount.get(options.subscriptionKey) ?? 0;
      if (refCount <= 1) {
        this.subscriptionRefCount.delete(options.subscriptionKey);
        if (this.started) {
          await this.sendForAck({
            type: 'unsubscribe',
            subscriptionKey: options.subscriptionKey,
          });
        }
      } else {
        this.subscriptionRefCount.set(options.subscriptionKey, refCount - 1);
      }
    };
  }

  /**
   * Subscribes to finalized head notifications over JSON-RPC websocket.
   */
  public async subscribeSubstrateFinalizedHeads(
    options: {
      connectionId: string;
      endpoint: string;
      subscriptionKey: string;
      priority?: RealtimePriority;
    },
    handler: SubscriptionHandler
  ): Promise<FnWithoutArgs> {
    return await this.subscribe(
      {
        ...options,
        method: 'chain_subscribeFinalizedHeads',
        unsubscribeMethod: 'chain_unsubscribeFinalizedHeads',
        params: [],
      },
      handler
    );
  }

  /**
   * Subscribes to worker connection status updates.
   */
  public onStatus(handler: StatusHandler): FnWithoutArgs {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  /**
   * Subscribes to worker metrics snapshots.
   */
  public onMetrics(handler: MetricsHandler): FnWithoutArgs {
    this.metricsHandlers.add(handler);
    return () => {
      this.metricsHandlers.delete(handler);
    };
  }

  private async ensureStarted(): Promise<boolean> {
    if (this.started) return true;
    return await this.start({
      profile: this.defaultProfile,
      maxConnections: this.maxConnections,
    });
  }

  private bindEndpoint(endpoint: WorkerEndpoint): void {
    endpoint.addEventListener('message', this.handleMessage);
  }

  private unbindEndpoint(endpoint: WorkerEndpoint): void {
    endpoint.removeEventListener('message', this.handleMessage);
  }

  private handleMessage = (event: MessageEvent<DataPlaneWorkerOutgoingMessage>): void => {
    const payload = event.data;
    if (!isDataPlaneWorkerOutgoingMessage(payload)) return;

    if (payload.type === 'event') {
      const handlers = this.handlers.get(payload.subscriptionKey);
      if (!handlers?.size) return;
      handlers.forEach((handler) => handler(payload.payload));
      return;
    }

    if (payload.type === 'status') {
      this.statusHandlers.forEach((handler) => handler(payload));
      return;
    }

    if (payload.type === 'metrics') {
      this.metricsHandlers.forEach((handler) => handler(payload));
      return;
    }

    if (payload.type !== 'ack' && payload.type !== 'response') {
      return;
    }

    const pending = this.pending.get(payload.requestId);
    if (!pending || pending.kind !== payload.type) return;

    clearTimeout(pending.timeoutId);
    this.pending.delete(payload.requestId);

    if (payload.ok) {
      pending.resolve(payload.type === 'response' ? payload.result : undefined);
      return;
    }

    pending.reject(new Error(payload.error ?? 'Data-plane command failed'));
  };

  private async sendForAck(command: Omit<DataPlaneWorkerIncomingMessage, 'requestId'>): Promise<void> {
    await this.sendRequest('ack', command);
  }

  private async sendForResponse(command: Omit<DataPlaneWorkerIncomingMessage, 'requestId'>): Promise<unknown> {
    return await this.sendRequest('response', command);
  }

  private async sendRequest(
    kind: PendingRequest['kind'],
    command: Omit<DataPlaneWorkerIncomingMessage, 'requestId'>
  ): Promise<unknown> {
    if (!this.endpoint) {
      throw new Error('Realtime data-plane endpoint is not initialized');
    }

    const requestId = this.requestId++;
    const payload = {
      ...command,
      requestId,
    } as DataPlaneWorkerIncomingMessage;

    return await new Promise<unknown>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Data-plane ${kind} timeout for "${command.type}"`));
      }, REQUEST_TIMEOUT_MS);

      this.pending.set(requestId, { kind, resolve, reject, timeoutId });
      try {
        this.endpoint?.postMessage(payload);
      } catch (error) {
        clearTimeout(timeoutId);
        this.pending.delete(requestId);
        reject(error instanceof Error ? error : new Error('Data-plane postMessage failed'));
      }
    });
  }

  private async teardownSubscriptions(): Promise<void> {
    const keys = [...this.subscriptionRefCount.keys()];
    for (const subscriptionKey of keys) {
      try {
        await this.sendForAck({
          type: 'unsubscribe',
          subscriptionKey,
        });
      } catch {
        // noop
      }
    }
  }

  private async teardownConnections(): Promise<void> {
    const connectionIds = [...this.connectionEndpoints.keys()];
    for (const connectionId of connectionIds) {
      try {
        await this.sendForAck({
          type: 'disconnect',
          connectionId,
        });
      } catch {
        // noop
      }
    }
  }
}

let dataPlaneClientSingleton: DataPlaneClient | null = null;

/**
 * Returns a process-wide singleton so legacy Vuex + Pinia callers share one data plane.
 */
export function getDataPlaneClient(): DataPlaneClient {
  if (!dataPlaneClientSingleton) {
    dataPlaneClientSingleton = new DataPlaneClient();
  }

  return dataPlaneClientSingleton;
}
