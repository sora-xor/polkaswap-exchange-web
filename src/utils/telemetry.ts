type TelemetryPayload = Record<string, unknown>;

type TelemetryClient = {
  track?: (event: string, payload?: TelemetryPayload) => void;
};

const getTelemetryClient = (): TelemetryClient | undefined => {
  if (typeof globalThis === 'undefined') return undefined;

  const scope = globalThis as Record<string, unknown>;
  const client =
    (scope.__PS_TELEMETRY__ as TelemetryClient | undefined) ?? (scope.__PS_ANALYTICS__ as TelemetryClient | undefined);

  if (client && typeof client.track === 'function') {
    return client;
  }

  return undefined;
};

export const trackEvent = (event: string, payload: TelemetryPayload = {}): void => {
  try {
    const client = getTelemetryClient();
    if (client?.track) {
      client.track(event, payload);
      return;
    }
  } catch (error) {
    console.warn('[telemetry] trackEvent failed', error);
    return;
  }

  if (typeof console !== 'undefined' && typeof console.debug === 'function') {
    console.debug(`[telemetry] ${event}`, payload);
  }
};
