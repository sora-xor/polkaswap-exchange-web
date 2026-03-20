(function() {
  "use strict";
  const DEFAULT_REALTIME_PROFILE = "balanced";
  const REALTIME_PROFILES = ["balanced", "ultra", "load_first"];
  const PROFILE_FLUSH_INTERVALS_VISIBLE = {
    balanced: {
      critical: 250,
      standard: 1e3,
      background: 5e3
    },
    ultra: {
      critical: 50,
      standard: 250,
      background: 1e3
    },
    load_first: {
      critical: 500,
      standard: 2e3,
      background: 7e3
    }
  };
  const PROFILE_FLUSH_INTERVAL_HIDDEN = {
    balanced: 5e3,
    ultra: 1e3,
    load_first: 7e3
  };
  const BASE_BACKOFF_DELAY_MS = 2e3;
  const BACKOFF_MULTIPLIER = 1.7;
  const MAX_BACKOFF_DELAY_MS = 12e4;
  const JITTER_RATIO = 0.25;
  function normalizeRealtimeProfile(value) {
    if (typeof value !== "string") {
      return DEFAULT_REALTIME_PROFILE;
    }
    return REALTIME_PROFILES.includes(value) ? value : DEFAULT_REALTIME_PROFILE;
  }
  function resolveRealtimeFlushIntervalMs(options) {
    const profile = normalizeRealtimeProfile(options.profile);
    const priority = options.priority ?? "standard";
    const visible = options.visible ?? true;
    if (!visible) {
      return PROFILE_FLUSH_INTERVAL_HIDDEN[profile];
    }
    return PROFILE_FLUSH_INTERVALS_VISIBLE[profile][priority];
  }
  function resolveRealtimeBackoffDelayMs(attempt, randomFn = Math.random) {
    const safeAttempt = Number.isFinite(attempt) && attempt > 0 ? Math.floor(attempt) : 0;
    const exponentialDelay = Math.min(
      MAX_BACKOFF_DELAY_MS,
      Math.floor(BASE_BACKOFF_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, safeAttempt))
    );
    const jitter = Math.floor(exponentialDelay * JITTER_RATIO * randomFn());
    return exponentialDelay + jitter;
  }
  const CONNECTION_READY_TIMEOUT_MS = 1e4;
  const JSON_RPC_REQUEST_TIMEOUT_MS = 15e3;
  const METRICS_TICK_MS = 1e4;
  const DEFAULT_MAX_CONNECTIONS = 4;
  class RealtimeDataPlaneCore {
    clients = /* @__PURE__ */ new Map();
    connections = /* @__PURE__ */ new Map();
    subscriptions = /* @__PURE__ */ new Map();
    metricsTimer = null;
    visible = true;
    profile = "balanced";
    maxConnections = DEFAULT_MAX_CONNECTIONS;
    registerClient(clientId, post) {
      this.clients.set(clientId, post);
      this.ensureMetricsTimer();
    }
    unregisterClient(clientId) {
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
    async receive(clientId, message) {
      try {
        switch (message.type) {
          case "connect":
            await this.handleConnect(clientId, message);
            return;
          case "disconnect":
            await this.handleDisconnect(clientId, message);
            return;
          case "subscribe":
            await this.handleSubscribe(clientId, message);
            return;
          case "unsubscribe":
            await this.handleUnsubscribe(clientId, message);
            return;
          case "request":
            await this.handleRequest(clientId, message);
            return;
          case "set_visibility":
            this.handleSetVisibility(clientId, message);
            return;
          case "set_profile":
            this.handleSetProfile(clientId, message);
            return;
          default:
            this.sendAck(clientId, message.requestId ?? -1, false, "Unsupported command");
        }
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Unknown data-plane worker failure";
        this.sendAck(clientId, message.requestId ?? -1, false, messageText);
      }
    }
    buildMetricsEvent() {
      const openConnections = [...this.connections.values()].filter((connection) => connection.status === "open").length;
      const pendingRpcRequests = [...this.connections.values()].reduce(
        (total, connection) => total + connection.pending.size,
        0
      );
      return {
        type: "metrics",
        metrics: {
          openConnections,
          activeSubscriptions: this.subscriptions.size,
          pendingRpcRequests,
          connectedClients: this.clients.size,
          visible: this.visible,
          profile: this.profile
        }
      };
    }
    ensureMetricsTimer() {
      if (this.metricsTimer) return;
      this.metricsTimer = setInterval(() => {
        this.broadcast(this.buildMetricsEvent());
      }, METRICS_TICK_MS);
    }
    clearMetricsTimer() {
      if (!this.metricsTimer) return;
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
    send(clientId, message) {
      const post = this.clients.get(clientId);
      if (!post) return;
      try {
        post(message);
      } catch {
        this.unregisterClient(clientId);
      }
    }
    broadcast(message) {
      [...this.clients.entries()].forEach(([clientId, post]) => {
        try {
          post(message);
        } catch {
          this.unregisterClient(clientId);
        }
      });
    }
    sendAck(clientId, requestId, ok, error) {
      const payload = {
        type: "ack",
        requestId,
        ok,
        ...error ? { error } : {}
      };
      this.send(clientId, payload);
    }
    sendResponse(clientId, requestId, ok, result, error) {
      const payload = {
        type: "response",
        requestId,
        ok,
        ...ok ? { result } : {},
        ...error ? { error } : {}
      };
      this.send(clientId, payload);
    }
    emitConnectionStatus(connection, details) {
      const payload = {
        type: "status",
        connectionId: connection.connectionId,
        status: connection.status,
        ...details ? { details } : {}
      };
      this.broadcast(payload);
    }
    ensureConnectionBudget(nextConnectionId) {
      if (this.connections.has(nextConnectionId)) return true;
      while (this.connections.size >= this.maxConnections) {
        const idleConnection = [...this.connections.values()].filter((connection) => !connection.subscriptions.size).sort((a, b) => a.lastActivityTs - b.lastActivityTs)[0];
        if (!idleConnection) {
          return false;
        }
        this.disposeConnection(idleConnection.connectionId);
      }
      return true;
    }
    getOrCreateConnection(connectionId, endpoint) {
      const existing = this.connections.get(connectionId);
      if (existing) {
        if (existing.endpoint !== endpoint) {
          this.disposeConnection(connectionId);
        } else {
          existing.lastActivityTs = Date.now();
          return existing;
        }
      }
      const created = {
        connectionId,
        endpoint,
        ws: null,
        status: "idle",
        reconnectAttempt: 0,
        reconnectTimer: null,
        openPromise: null,
        openResolve: null,
        openReject: null,
        pending: /* @__PURE__ */ new Map(),
        serverSubscriptionToKey: /* @__PURE__ */ new Map(),
        subscriptions: /* @__PURE__ */ new Set(),
        manualClose: false,
        nextRpcId: 1,
        lastActivityTs: Date.now()
      };
      this.connections.set(connectionId, created);
      return created;
    }
    async handleConnect(clientId, message) {
      if (Number.isFinite(message.maxConnections) && message.maxConnections > 0) {
        this.maxConnections = Math.floor(message.maxConnections);
      }
      if (!this.ensureConnectionBudget(message.connectionId)) {
        this.sendAck(clientId, message.requestId, false, "Data-plane connection budget exceeded");
        return;
      }
      const connection = this.getOrCreateConnection(message.connectionId, message.endpoint);
      try {
        await this.ensureConnectionOpen(connection);
        this.sendAck(clientId, message.requestId, true);
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Unable to open data-plane connection";
        this.sendAck(clientId, message.requestId, false, messageText);
      }
    }
    async handleDisconnect(clientId, message) {
      this.disposeConnection(message.connectionId);
      this.sendAck(clientId, message.requestId, true);
    }
    async handleSubscribe(clientId, message) {
      const existing = this.subscriptions.get(message.subscriptionKey);
      if (existing) {
        existing.clients.add(clientId);
        existing.priority = this.resolveHighestPriority(existing.priority, message.priority ?? "standard");
        this.sendAck(clientId, message.requestId, true);
        return;
      }
      const connection = this.connections.get(message.connectionId);
      if (!connection) {
        this.sendAck(clientId, message.requestId, false, `Connection "${message.connectionId}" is not available`);
        return;
      }
      const subscription = {
        subscriptionKey: message.subscriptionKey,
        connectionId: message.connectionId,
        method: message.method,
        params: message.params ?? [],
        unsubscribeMethod: message.unsubscribeMethod,
        priority: message.priority ?? "standard",
        clients: /* @__PURE__ */ new Set([clientId]),
        serverSubscriptionId: null,
        flushTimer: null,
        pendingPayload: void 0
      };
      this.subscriptions.set(subscription.subscriptionKey, subscription);
      connection.subscriptions.add(subscription.subscriptionKey);
      connection.lastActivityTs = Date.now();
      try {
        await this.attachSubscription(subscription);
        this.sendAck(clientId, message.requestId, true);
      } catch (error) {
        await this.teardownSubscription(subscription);
        const messageText = error instanceof Error ? error.message : "Unable to subscribe to RPC stream";
        this.sendAck(clientId, message.requestId, false, messageText);
      }
    }
    async handleUnsubscribe(clientId, message) {
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
    async handleRequest(clientId, message) {
      const connection = this.connections.get(message.connectionId);
      if (!connection) {
        this.sendResponse(
          clientId,
          message.requestId,
          false,
          void 0,
          `Connection "${message.connectionId}" is not available`
        );
        return;
      }
      try {
        await this.ensureConnectionOpen(connection);
        const result = await this.sendRpcRequest(connection, message.method, message.params ?? []);
        this.sendResponse(clientId, message.requestId, true, result);
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "RPC request failed";
        this.sendResponse(clientId, message.requestId, false, void 0, messageText);
      }
    }
    handleSetVisibility(clientId, message) {
      this.visible = Boolean(message.visible);
      this.sendAck(clientId, message.requestId, true);
    }
    handleSetProfile(clientId, message) {
      this.profile = normalizeRealtimeProfile(message.profile);
      this.sendAck(clientId, message.requestId, true);
    }
    async ensureConnectionOpen(connection) {
      if (connection.ws?.readyState === WebSocket.OPEN && connection.status === "open") {
        connection.lastActivityTs = Date.now();
        return;
      }
      if (connection.openPromise) {
        return connection.openPromise;
      }
      connection.manualClose = false;
      connection.status = connection.reconnectAttempt > 0 ? "reconnecting" : "connecting";
      this.emitConnectionStatus(connection);
      connection.openPromise = new Promise((resolve, reject) => {
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
        connection.status = "open";
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
        connection.status = "error";
        this.emitConnectionStatus(connection, `Socket error: ${connection.endpoint}`);
      };
      ws.onmessage = (event) => {
        connection.lastActivityTs = Date.now();
        this.handleSocketMessage(connection, event.data);
      };
      return connection.openPromise;
    }
    handleSocketClosed(connection) {
      connection.pending.forEach((pending) => {
        clearTimeout(pending.timeoutId);
        pending.reject(new Error("WebSocket connection closed"));
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
        connection.status = "closed";
        this.emitConnectionStatus(connection);
        return;
      }
      connection.status = "reconnecting";
      this.emitConnectionStatus(connection);
      this.scheduleReconnect(connection);
    }
    handleSocketMessage(connection, data) {
      if (typeof data !== "string") return;
      let payload;
      try {
        payload = JSON.parse(data);
      } catch {
        return;
      }
      if (payload && typeof payload.id === "number") {
        const pending = connection.pending.get(payload.id);
        if (!pending) return;
        clearTimeout(pending.timeoutId);
        connection.pending.delete(payload.id);
        if (payload.error) {
          pending.reject(new Error(payload.error?.message ?? "JSON-RPC error"));
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
    scheduleReconnect(connection) {
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
    async resubscribeConnection(connection) {
      const subscriptions = [...connection.subscriptions].map((subscriptionKey) => this.subscriptions.get(subscriptionKey)).filter((item) => Boolean(item));
      for (const subscription of subscriptions) {
        subscription.serverSubscriptionId = null;
        await this.attachSubscription(subscription);
      }
    }
    async attachSubscription(subscription) {
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
    async detachSubscription(subscription) {
      const connection = this.connections.get(subscription.connectionId);
      if (!connection) return;
      const serverSubscriptionId = subscription.serverSubscriptionId;
      if (!serverSubscriptionId) {
        connection.subscriptions.delete(subscription.subscriptionKey);
        return;
      }
      if (connection.status === "open" && connection.ws?.readyState === WebSocket.OPEN) {
        try {
          await this.sendRpcRequest(connection, subscription.unsubscribeMethod, [serverSubscriptionId]);
        } catch {
        }
      }
      connection.serverSubscriptionToKey.delete(serverSubscriptionId);
      connection.subscriptions.delete(subscription.subscriptionKey);
      subscription.serverSubscriptionId = null;
    }
    async teardownSubscription(subscription) {
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
    async sendRpcRequest(connection, method, params) {
      if (!(connection.ws && connection.ws.readyState === WebSocket.OPEN)) {
        throw new Error(`Connection "${connection.connectionId}" is not open`);
      }
      const id = connection.nextRpcId++;
      const payload = {
        jsonrpc: "2.0",
        id,
        method,
        params
      };
      return await new Promise((resolve, reject) => {
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
          reject(error instanceof Error ? error : new Error("JSON-RPC send failure"));
        }
      });
    }
    flushSubscriptionEvent(subscriptionKey, payload) {
      const subscription = this.subscriptions.get(subscriptionKey);
      if (!subscription || !subscription.clients.size) return;
      const interval = resolveRealtimeFlushIntervalMs({
        profile: this.profile,
        priority: subscription.priority,
        visible: this.visible
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
        subscription.pendingPayload = void 0;
      }, interval);
    }
    emitSubscriptionEvent(subscription, payload) {
      const event = {
        type: "event",
        subscriptionKey: subscription.subscriptionKey,
        payload
      };
      subscription.clients.forEach((clientId) => this.send(clientId, event));
    }
    resolveHighestPriority(current, incoming) {
      const order = {
        critical: 3,
        standard: 2,
        background: 1
      };
      return order[incoming] > order[current] ? incoming : current;
    }
    closeSocket(connection) {
      if (connection.reconnectTimer) {
        clearTimeout(connection.reconnectTimer);
        connection.reconnectTimer = null;
      }
      connection.manualClose = true;
      if (connection.ws) {
        try {
          connection.ws.close();
        } catch {
        }
        connection.ws = null;
      }
    }
    disposeConnection(connectionId) {
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
      connection.status = "closed";
      this.emitConnectionStatus(connection);
      this.connections.delete(connectionId);
    }
  }
  const worker = self;
  const core = new RealtimeDataPlaneCore();
  const CLIENT_ID = "dedicated-main-client";
  core.registerClient(CLIENT_ID, (message) => {
    worker.postMessage(message);
  });
  worker.onmessage = (event) => {
    void core.receive(CLIENT_ID, event.data);
  };
})();
