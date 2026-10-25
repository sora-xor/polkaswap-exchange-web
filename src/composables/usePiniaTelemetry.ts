import { onMounted } from 'vue';

import { getBuildVariant, trackEvent } from '@/utils/telemetry';

type StoreTarget = {
  store: unknown;
  storeId: string;
  fallbackReason?: string;
};

type UsePiniaTelemetryOptions = {
  metadata?: () => Record<string, unknown>;
};

const isPiniaStore = (store: unknown): boolean => {
  return Boolean(store && typeof (store as Record<string, unknown>).$id === 'string');
};

export const usePiniaTelemetry = (
  flowId: string,
  targets: StoreTarget[],
  options: UsePiniaTelemetryOptions = {}
): void => {
  const buildVariant = getBuildVariant();

  const emit = (event: string, storeId: string, extra: Record<string, unknown>): void => {
    trackEvent(event, {
      flowId,
      storeId,
      buildVariant,
      ...(typeof options.metadata === 'function' ? options.metadata() : {}),
      ...extra,
    });
  };

  onMounted(() => {
    targets.forEach(({ store, storeId, fallbackReason }) => {
      if (isPiniaStore(store)) {
        emit('pinia_store_usage', storeId, { isLegacyFallback: false });
      } else {
        emit('pinia_store_fallback', storeId, {
          isLegacyFallback: true,
          reason: fallbackReason ?? 'unknown',
        });
      }
    });
  });
};
