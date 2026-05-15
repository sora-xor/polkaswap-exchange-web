import { describe, expect, it, vi } from 'vitest';

import { createDataPlaneTelemetry } from '@/app/shell/useDataPlaneTelemetry';

describe('createDataPlaneTelemetry', () => {
  it('dedupes realtime metrics and status events and tears down subscriptions', () => {
    const trackEvent = vi.fn();
    let metricsHandler!: (payload: any) => void;
    let statusHandler!: (payload: any) => void;
    const teardownMetrics = vi.fn();
    const teardownStatus = vi.fn();
    const client = {
      onMetrics: vi.fn((handler) => {
        metricsHandler = handler;
        return teardownMetrics;
      }),
      onStatus: vi.fn((handler) => {
        statusHandler = handler;
        return teardownStatus;
      }),
    };

    const telemetry = createDataPlaneTelemetry({ buildVariant: 'test', trackEvent });
    telemetry.subscribe(client as any);
    telemetry.subscribe(client as any);

    expect(client.onMetrics).toHaveBeenCalledTimes(1);
    expect(client.onStatus).toHaveBeenCalledTimes(1);

    const metrics = {
      openConnections: 1,
      activeSubscriptions: 2,
      pendingRpcRequests: 3,
      connectedClients: 1,
      visible: true,
      profile: 'balanced',
    };

    metricsHandler({ metrics });
    metricsHandler({ metrics });
    statusHandler({ connectionId: 'a', status: 'connected' });
    statusHandler({ connectionId: 'a', status: 'connected' });

    expect(trackEvent).toHaveBeenCalledTimes(2);
    expect(trackEvent).toHaveBeenNthCalledWith(1, 'realtime_dataplane_metrics', {
      ...metrics,
      buildVariant: 'test',
    });
    expect(trackEvent).toHaveBeenNthCalledWith(2, 'realtime_dataplane_status', {
      connectionId: 'a',
      status: 'connected',
      buildVariant: 'test',
    });

    telemetry.unsubscribe();

    expect(teardownMetrics).toHaveBeenCalledTimes(1);
    expect(teardownStatus).toHaveBeenCalledTimes(1);
  });
});
