import type { FnWithoutArgs, Nullable } from '@/types/common';

type RealtimeModule = typeof import('@/services/realtime');
type DataPlaneClient = ReturnType<RealtimeModule['getDataPlaneClient']>;
type TrackEvent = (eventName: string, payload?: Record<string, unknown>) => void;

type DataPlaneTelemetryOptions = {
  buildVariant: string;
  trackEvent: TrackEvent;
};

const DATAPLANE_PRESSURE_PENDING_RPC_THRESHOLD = 40;
const DATAPLANE_PRESSURE_OPEN_CONNECTIONS_THRESHOLD = 8;
const DATAPLANE_PRESSURE_MIN_INTERVAL_MS = 60_000;

/**
 * Dedupe and lifecycle management for realtime worker telemetry emitted from
 * the app shell. The shell decides when the data plane starts; this helper owns
 * only telemetry subscription state.
 */
export function createDataPlaneTelemetry({ buildVariant, trackEvent }: DataPlaneTelemetryOptions) {
  let teardownMetrics: Nullable<FnWithoutArgs> = null;
  let teardownStatus: Nullable<FnWithoutArgs> = null;
  let lastMetricsKey = '';
  let lastPressureKey = '';
  let lastPressureTs = 0;
  const statusByConnection = new Map<string, string>();

  const unsubscribe = (): void => {
    teardownMetrics?.();
    teardownStatus?.();
    teardownMetrics = null;
    teardownStatus = null;
    lastMetricsKey = '';
    lastPressureKey = '';
    lastPressureTs = 0;
    statusByConnection.clear();
  };

  const subscribe = (client: DataPlaneClient): void => {
    if (teardownMetrics || teardownStatus) {
      return;
    }

    teardownMetrics = client.onMetrics(({ metrics }) => {
      const dedupeKey = `${metrics.openConnections}:${metrics.activeSubscriptions}:${metrics.pendingRpcRequests}:${metrics.connectedClients}:${metrics.visible}:${metrics.profile}`;
      if (dedupeKey === lastMetricsKey) return;

      lastMetricsKey = dedupeKey;
      trackEvent('realtime_dataplane_metrics', {
        ...metrics,
        buildVariant,
      });

      const isPressure =
        metrics.pendingRpcRequests >= DATAPLANE_PRESSURE_PENDING_RPC_THRESHOLD ||
        metrics.openConnections >= DATAPLANE_PRESSURE_OPEN_CONNECTIONS_THRESHOLD;

      if (!isPressure) return;

      const pressureKey = `${metrics.openConnections}:${metrics.pendingRpcRequests}:${metrics.profile}`;
      const now = Date.now();
      const canEmitByTime = now - lastPressureTs >= DATAPLANE_PRESSURE_MIN_INTERVAL_MS;
      if (pressureKey === lastPressureKey && !canEmitByTime) return;

      lastPressureKey = pressureKey;
      lastPressureTs = now;
      trackEvent('realtime_dataplane_pressure', {
        ...metrics,
        buildVariant,
        pendingRpcThreshold: DATAPLANE_PRESSURE_PENDING_RPC_THRESHOLD,
        openConnectionsThreshold: DATAPLANE_PRESSURE_OPEN_CONNECTIONS_THRESHOLD,
      });
    });

    teardownStatus = client.onStatus(({ connectionId, status, details }) => {
      const previous = statusByConnection.get(connectionId);
      if (previous === status) return;

      statusByConnection.set(connectionId, status);
      trackEvent('realtime_dataplane_status', {
        connectionId,
        status,
        ...(details ? { details } : {}),
        buildVariant,
      });
    });
  };

  return {
    subscribe,
    unsubscribe,
  };
}
