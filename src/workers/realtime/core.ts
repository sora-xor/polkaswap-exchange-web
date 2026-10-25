import type {
  DataPlaneAck,
  DataPlaneConnectCommand,
  DataPlaneDisconnectCommand,
  DataPlaneEvent,
  DataPlaneMetricsEvent,
  DataPlaneRequestCommand,
  DataPlaneResponse,
  DataPlaneSetProfileCommand,
  DataPlaneSetVisibilityCommand,
  DataPlaneStatusEvent,
  DataPlaneSubscribeCommand,
  DataPlaneUnsubscribeCommand,
  DataPlaneWorkerIncomingMessage,
  DataPlaneWorkerOutgoingMessage,
} from '@/services/realtime/protocol';
import {
  normalizeRealtimeProfile,
  resolveRealtimeBackoffDelayMs,
  resolveRealtimeFlushIntervalMs,
} from '@/services/realtime/profile';

import type { RealtimePriority, RealtimeProfile } from '@/services/realtime/profile';

const CONNECTION_READY_TIMEOUT_MS = 10000;
const JSON_RPC_REQUEST_TIMEOUT_MS = 15000;
const METRICS_TICK_MS = 10000;
const DEFAULT_MAX_CONNECTIONS = 4;

type ClientPost = (message: DataPlaneWorkerOutgoingMessage) => void;

type PendingRpcRequest = {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

type ConnectionState = {
  connectionId: string;
  endpoint: string;
  ws: WebSocket | null;
  status: DataPlaneStatusEvent['status'];
  reconnectAttempt: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  openPromise: Promise<void> | null;
  openResolve: (() => void) | null;
  openReject: ((error: Error) => void) | null;
  pending: Map<number, PendingRpcRequest>;
  serverSubscriptionToKey: Map<string, string>;
  subscriptions: Set<string>;
  manualClose: boolean;
  nextRpcId: number;
  lastActivityTs: number;
};

type SubscriptionState = {
  subscriptionKey: string;
  connectionId: string;
  method: string;
  params: unknown[];
  unsubscribeMethod: string;
  priority: RealtimePriority;
  clients: Set<string>;
  serverSubscriptionId: string | null;
  flushTimer: ReturnType<typeof setTimeout> | null;
  pendingPayload: unknown;
};

/**
 * Shared core for both SharedWorker and DedicatedWorker data-plane entrypoints.
 */
export class RealtimeDataPlaneCore {
  private readonly clients = new Map<string, ClientPost>();
  private readonly connections = new Map<string, ConnectionState>();
  private readonly subscriptions = new Map<string, SubscriptionState>();
  private metricsTimer: ReturnType<typeof setInterval> | null = null;

  private visible = true;
  private profile: RealtimeProfile = 'balanced';
  private maxConnections = DEFAULT_MAX_CONNECTIONS;

  public registerClient(clientId: string, post: ClientPost): void {
    this.clients.set(clientId, post);
    this.ensureMetricsTimer();
  }

  public unregisterClient(clientId: string): void {
    this.clients.delete(clientId);

    const subscriptions = [...this.subscriptions.values()].filter((item) => item.clients.has(clientId));

    subscriptions.forEach((subscription) => {
      subscription.clients.delete(clientId);
      if (!subscription.clients.size) {
        void this.teardownSubscription(subscription);
      }
    });

    if (!this.clients.size) {
      this.clearMetricsTimer();
    }
  }

  public async receive(clientId: string, message: DataPlaneWorkerIncomingMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'connect':
          await this.handleConnect(clientId, message);
          return;
        case 'disconnect':
          await this.handleDisconnect(clientId, message);
          return;
        case 'subscribe':
          await this.handleSubscribe(clientId, message);
          return;
        case 'unsubscribe':
          await this.handleUnsubscribe(clientId, message);
          return;
        case 'request':
          await this.handleRequest(clientId, message);
          return;
        case 'set_visibility':
          this.handleSetVisibility(clientId, message);
          return;
        case 'set_profile':
          this.handleSetProfile(clientId, message);
          return;
        default:
          this.sendAck(clientId, (message as { requestId?: number }).requestId ?? -1, false, 'Unsupported command');
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Unknown data-plane worker failure';
      this.sendAck(clientId, (message as { requestId?: number }).requestId ?? -1, false, messageText);
    }
  }

  private buildMetricsEvent(): DataPlaneMetricsEvent {
    const openConnections = [...this.connections.values()].filter((connection) => connection.status === 'open').length;
    const pendingRpcRequests = [...this.connections.values()].reduce(
      (total, connection) => total + connection.pending.size,
      0
    );

    return {
      type: 'metrics',
      metrics: {
        openConnections,
        activeSubscriptions: this.subscriptions.size,
        pendingRpcRequests,
        connectedClients: this.clients.size,
        visible: this.visible,
        profile: this.profile,
      },
    };
  }

  private ensureMetricsTimer(): void {
    if (this.metricsTimer) return;

    this.metricsTimer = setInterval(() => {
      this.broadcast(this.buildMetricsEvent());
    }, METRICS_TICK_MS);
  }

  private clearMetricsTimer(): void {
    if (!this.metricsTimer) return;
    clearInterval(this.metricsTimer);
    this.metricsTimer = null;
  }

  private send(clientId: string, message: DataPlaneWorkerOutgoingMessage): void {
    const post = this.clients.get(clientId);
    if (!post) return;
    try {
      post(message);
    } catch {
      this.unregisterClient(clientId);
    }
  }

  private broadcast(message: DataPlaneWorkerOutgoingMessage): void {
    [...this.clients.entries()].forEach(([clientId, post]) => {
      try {
        post(message);
      } catch {
        this.unregisterClient(clientId);
      }
    });
  }

  private sendAck(clientId: string, requestId: number, ok: boolean, error?: string): void {
    const payload: DataPlaneAck = {
      type: 'ack',
      requestId,
      ok,
      ...(error ? { error } : {}),
    };

    this.send(clientId, payload);
  }

  private sendResponse(clientId: string, requestId: number, ok: boolean, result?: unknown, error?: string): void {
    const payload: DataPlaneResponse = {
      type: 'response',
      requestId,
      ok,
      ...(ok ? { result } : {}),
      ...(error ? { error } : {}),
    };

    this.send(clientId, payload);
  }

  private emitConnectionStatus(connection: ConnectionState, details?: string): void {
    const payload: DataPlaneStatusEvent = {
      type: 'status',
      connectionId: connection.connectionId,
      status: connection.status,
      ...(details ? { details } : {}),
    };

    this.broadcast(payload);
  }

  private ensureConnectionBudget(nextConnectionId: string): boolean {
    if (this.connections.has(nextConnectionId)) return true;

    while (this.connections.size >= this.maxConnections) {
      const idleConnection = [...this.connections.values()]
        .filter((connection) => !connection.subscriptions.size)
        .sort((a, b) => a.lastActivityTs - b.lastActivityTs)[0];

      if (!idleConnection) {
        return false;
      }

      this.disposeConnection(idleConnection.connectionId);
    }

    return true;
  }

  private getOrCreateConnection(connectionId: string, endpoint: string): ConnectionState {
    const existing = this.connections.get(connectionId);

    if (existing) {
      if (existing.endpoint !== endpoint) {
        this.disposeConnection(connectionId);
      } else {
        existing.lastActivityTs = Date.now();
        return existing;
      }
    }

    const created: ConnectionState = {
      connectionId,
      endpoint,
      ws: null,
      status: 'idle',
      reconnectAttempt: 0,
      reconnectTimer: null,
      openPromise: null,
      openResolve: null,
      openReject: null,
      pending: new Map(),
      serverSubscriptionToKey: new Map(),
      subscriptions: new Set(),
      manualClose: false,
      nextRpcId: 1,
      lastActivityTs: Date.now(),
    };

    this.connections.set(connectionId, created);
    return created;
  }

  private async handleConnect(clientId: string, message: DataPlaneConnectCommand): Promise<void> {
    if (Number.isFinite(message.maxConnections) && (message.maxConnections as number) > 0) {
      this.maxConnections = Math.floor(message.maxConnections as number);
    }

    if (!this.ensureConnectionBudget(message.connectionId)) {
      this.sendAck(clientId, message.requestId, false, 'Data-plane connection budget exceeded');
      return;
    }

    const connection = this.getOrCreateConnection(message.connectionId, message.endpoint);

    try {
      await this.ensureConnectionOpen(connection);
      this.sendAck(clientId, message.requestId, true);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Unable to open data-plane connection';
      this.sendAck(clientId, message.requestId, false, messageText);
    }
  }

  private async handleDisconnect(clientId: string, message: DataPlaneDisconnectCommand): Promise<void> {
    this.disposeConnection(message.connectionId);
    this.sendAck(clientId, message.requestId, true);
  }

  private async handleSubscribe(clientId: string, message: DataPlaneSubscribeCommand): Promise<void> {
    const existing = this.subscriptions.get(message.subscriptionKey);
    if (existing) {
      existing.clients.add(clientId);
      existing.priority = this.resolveHighestPriority(existing.priority, message.priority ?? 'standard');
      this.sendAck(clientId, message.requestId, true);
      return;
    }

    const connection = this.connections.get(message.connectionId);
    if (!connection) {
      this.sendAck(clientId, message.requestId, false, `Connection "${message.connectionId}" is not available`);
      return;
    }

    const subscription: SubscriptionState = {
      subscriptionKey: message.subscriptionKey,
      connectionId: message.connectionId,
      method: message.method,
      params: message.params ?? [],
      unsubscribeMethod: message.unsubscribeMethod,
      priority: message.priority ?? 'standard',
      clients: new Set([clientId]),
      serverSubscriptionId: null,
      flushTimer: null,
      pendingPayload: undefined,
    };

    this.subscriptions.set(subscription.subscriptionKey, subscription);
    connection.subscriptions.add(subscription.subscriptionKey);
    connection.lastActivityTs = Date.now();

    try {
      await this.attachSubscription(subscription);
      this.sendAck(clientId, message.requestId, true);
    } catch (error) {
      await this.teardownSubscription(subscription);
      const messageText = error instanceof Error ? error.message : 'Unable to subscribe to RPC stream';
      this.sendAck(clientId, message.requestId, false, messageText);
    }
  }

  private async handleUnsubscribe(clientId: string, message: DataPlaneUnsubscribeCommand): Promise<void> {
    const subscription = this.subscriptions.get(message.subscriptionKey);
    if (!subscription) {
      this.sendAck(clientId, message.requestId, true);
      return;
    }

    subscription.clients.delete(clientId);
    if (subscription.clients.size) {
      this.sendAck(clientId, message.requestId, true);
      return;
    }

    await this.teardownSubscription(subscription);
    this.sendAck(clientId, message.requestId, true);
  }

  private async handleRequest(clientId: string, message: DataPlaneRequestCommand): Promise<void> {
    const connection = this.connections.get(message.connectionId);
    if (!connection) {
      this.sendResponse(
        clientId,
        message.requestId,
        false,
        undefined,
        `Connection "${message.connectionId}" is not available`
      );
      return;
    }

    try {
      await this.ensureConnectionOpen(connection);
      const result = await this.sendRpcRequest(connection, message.method, message.params ?? []);
      this.sendResponse(clientId, message.requestId, true, result);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'RPC request failed';
      this.sendResponse(clientId, message.requestId, false, undefined, messageText);
    }
  }

  private handleSetVisibility(clientId: string, message: DataPlaneSetVisibilityCommand): void {
    this.visible = Boolean(message.visible);
    this.sendAck(clientId, message.requestId, true);
  }

  private handleSetProfile(clientId: string, message: DataPlaneSetProfileCommand): void {
    this.profile = normalizeRealtimeProfile(message.profile);
    this.sendAck(clientId, message.requestId, true);
  }

  private async ensureConnectionOpen(connection: ConnectionState): Promise<void> {
    if (connection.ws?.readyState === WebSocket.OPEN && connection.status === 'open') {
      connection.lastActivityTs = Date.now();
      return;
    }

    if (connection.openPromise) {
      return connection.openPromise;
    }

    connection.manualClose = false;
    connection.status = connection.reconnectAttempt > 0 ? 'reconnecting' : 'connecting';
    this.emitConnectionStatus(connection);

    connection.openPromise = new Promise<void>((resolve, reject) => {
      connection.openResolve = resolve;
      connection.openReject = reject;
    });

    const timeout = setTimeout(() => {
      const error = new Error(`Connection timeout: ${connection.endpoint}`);
      connection.openReject?.(error);
      this.closeSocket(connection);
    }, CONNECTION_READY_TIMEOUT_MS);

    const ws = new WebSocket(connection.endpoint);
    connection.ws = ws;

    ws.onopen = () => {
      clearTimeout(timeout);
      connection.status = 'open';
      connection.reconnectAttempt = 0;
      connection.lastActivityTs = Date.now();
      this.emitConnectionStatus(connection);
      connection.openResolve?.();
      connection.openResolve = null;
      connection.openReject = null;
      connection.openPromise = null;

      if (connection.subscriptions.size) {
        void this.resubscribeConnection(connection);
      }
    };

    ws.onclose = () => {
      clearTimeout(timeout);
      this.handleSocketClosed(connection);
    };

    ws.onerror = () => {
      connection.status = 'error';
      this.emitConnectionStatus(connection, `Socket error: ${connection.endpoint}`);
    };

    ws.onmessage = (event) => {
      connection.lastActivityTs = Date.now();
      this.handleSocketMessage(connection, event.data);
    };

    return connection.openPromise;
  }

  private handleSocketClosed(connection: ConnectionState): void {
    connection.pending.forEach((pending) => {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error('WebSocket connection closed'));
    });
    connection.pending.clear();

    connection.serverSubscriptionToKey.forEach((subscriptionKey) => {
      const subscription = this.subscriptions.get(subscriptionKey);
      if (subscription) {
        subscription.serverSubscriptionId = null;
      }
    });
    connection.serverSubscriptionToKey.clear();

    const wasManual = connection.manualClose;

    if (connection.openPromise) {
      connection.openReject?.(new Error(`Failed to open connection: ${connection.endpoint}`));
      connection.openResolve = null;
      connection.openReject = null;
      connection.openPromise = null;
    }

    if (wasManual || !connection.subscriptions.size) {
      connection.status = 'closed';
      this.emitConnectionStatus(connection);
      return;
    }

    connection.status = 'reconnecting';
    this.emitConnectionStatus(connection);
    this.scheduleReconnect(connection);
  }

  private handleSocketMessage(connection: ConnectionState, data: unknown): void {
    if (typeof data !== 'string') return;

    let payload: any;
    try {
      payload = JSON.parse(data);
    } catch {
      return;
    }

    if (payload && typeof payload.id === 'number') {
      const pending = connection.pending.get(payload.id);
      if (!pending) return;

      clearTimeout(pending.timeoutId);
      connection.pending.delete(payload.id);

      if (payload.error) {
        pending.reject(new Error(payload.error?.message ?? 'JSON-RPC error'));
      } else {
        pending.resolve(payload.result);
      }

      return;
    }

    const serverSubscriptionId = payload?.params?.subscription;
    if (!serverSubscriptionId) return;

    const subscriptionKey = connection.serverSubscriptionToKey.get(String(serverSubscriptionId));
    if (!subscriptionKey) return;

    this.flushSubscriptionEvent(subscriptionKey, payload?.params?.result);
  }

  private scheduleReconnect(connection: ConnectionState): void {
    if (connection.reconnectTimer) {
      clearTimeout(connection.reconnectTimer);
    }

    connection.reconnectAttempt += 1;
    const delay = resolveRealtimeBackoffDelayMs(connection.reconnectAttempt);

    connection.reconnectTimer = setTimeout(() => {
      connection.reconnectTimer = null;
      void this.ensureConnectionOpen(connection).catch(() => {
        this.scheduleReconnect(connection);
      });
    }, delay);
  }

  private async resubscribeConnection(connection: ConnectionState): Promise<void> {
    const subscriptions = [...connection.subscriptions]
      .map((subscriptionKey) => this.subscriptions.get(subscriptionKey))
      .filter((item): item is SubscriptionState => Boolean(item));

    for (const subscription of subscriptions) {
      subscription.serverSubscriptionId = null;
      await this.attachSubscription(subscription);
    }
  }

  private async attachSubscription(subscription: SubscriptionState): Promise<void> {
    const connection = this.connections.get(subscription.connectionId);
    if (!connection) {
      throw new Error(`Connection "${subscription.connectionId}" is not available`);
    }

    await this.ensureConnectionOpen(connection);
    const serverSubscriptionId = await this.sendRpcRequest(connection, subscription.method, subscription.params);
    const id = String(serverSubscriptionId);

    subscription.serverSubscriptionId = id;
    connection.serverSubscriptionToKey.set(id, subscription.subscriptionKey);
  }

  private async detachSubscription(subscription: SubscriptionState): Promise<void> {
    const connection = this.connections.get(subscription.connectionId);
    if (!connection) return;

    const serverSubscriptionId = subscription.serverSubscriptionId;
    if (!serverSubscriptionId) {
      connection.subscriptions.delete(subscription.subscriptionKey);
      return;
    }

    if (connection.status === 'open' && connection.ws?.readyState === WebSocket.OPEN) {
      try {
        await this.sendRpcRequest(connection, subscription.unsubscribeMethod, [serverSubscriptionId]);
      } catch {
        // Ignore detach failures and proceed with local cleanup.
      }
    }

    connection.serverSubscriptionToKey.delete(serverSubscriptionId);
    connection.subscriptions.delete(subscription.subscriptionKey);
    subscription.serverSubscriptionId = null;
  }

  private async teardownSubscription(subscription: SubscriptionState): Promise<void> {
    if (subscription.flushTimer) {
      clearTimeout(subscription.flushTimer);
      subscription.flushTimer = null;
    }

    await this.detachSubscription(subscription);
    this.subscriptions.delete(subscription.subscriptionKey);

    const connection = this.connections.get(subscription.connectionId);
    if (connection && !connection.subscriptions.size) {
      connection.lastActivityTs = Date.now();
    }
  }

  private async sendRpcRequest(connection: ConnectionState, method: string, params: unknown[]): Promise<unknown> {
    if (!(connection.ws && connection.ws.readyState === WebSocket.OPEN)) {
      throw new Error(`Connection "${connection.connectionId}" is not open`);
    }

    const id = connection.nextRpcId++;
    const payload = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return await new Promise<unknown>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        connection.pending.delete(id);
        reject(new Error(`JSON-RPC timeout for "${method}"`));
      }, JSON_RPC_REQUEST_TIMEOUT_MS);

      connection.pending.set(id, { resolve, reject, timeoutId });

      try {
        connection.ws?.send(JSON.stringify(payload));
      } catch (error) {
        clearTimeout(timeoutId);
        connection.pending.delete(id);
        reject(error instanceof Error ? error : new Error('JSON-RPC send failure'));
      }
    });
  }

  private flushSubscriptionEvent(subscriptionKey: string, payload: unknown): void {
    const subscription = this.subscriptions.get(subscriptionKey);
    if (!subscription || !subscription.clients.size) return;

    const interval = resolveRealtimeFlushIntervalMs({
      profile: this.profile,
      priority: subscription.priority,
      visible: this.visible,
    });

    if (interval <= 0) {
      this.emitSubscriptionEvent(subscription, payload);
      return;
    }

    subscription.pendingPayload = payload;
    if (subscription.flushTimer) {
      return;
    }

    subscription.flushTimer = setTimeout(() => {
      subscription.flushTimer = null;
      this.emitSubscriptionEvent(subscription, subscription.pendingPayload);
      subscription.pendingPayload = undefined;
    }, interval);
  }

  private emitSubscriptionEvent(subscription: SubscriptionState, payload: unknown): void {
    const event: DataPlaneEvent = {
      type: 'event',
      subscriptionKey: subscription.subscriptionKey,
      payload,
    };

    subscription.clients.forEach((clientId) => this.send(clientId, event));
  }

  private resolveHighestPriority(current: RealtimePriority, incoming: RealtimePriority): RealtimePriority {
    const order: Record<RealtimePriority, number> = {
      critical: 3,
      standard: 2,
      background: 1,
    };

    return order[incoming] > order[current] ? incoming : current;
  }

  private closeSocket(connection: ConnectionState): void {
    if (connection.reconnectTimer) {
      clearTimeout(connection.reconnectTimer);
      connection.reconnectTimer = null;
    }

    connection.manualClose = true;

    if (connection.ws) {
      try {
        connection.ws.close();
      } catch {
        // noop
      }
      connection.ws = null;
    }
  }

  private disposeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    [...connection.subscriptions].forEach((subscriptionKey) => {
      const subscription = this.subscriptions.get(subscriptionKey);
      if (subscription) {
        subscription.clients.clear();
        void this.teardownSubscription(subscription);
      }
    });

    this.closeSocket(connection);
    connection.status = 'closed';
    this.emitConnectionStatus(connection);
    this.connections.delete(connectionId);
  }
}
