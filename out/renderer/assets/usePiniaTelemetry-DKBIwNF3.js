import { a4 as onMounted, a5 as trackEvent, a6 as getBuildVariant } from "./index-73GArslZ.js";
const isPiniaStore = (store) => {
  return Boolean(store && typeof store.$id === "string");
};
const usePiniaTelemetry = (flowId, targets, options = {}) => {
  const buildVariant = getBuildVariant();
  const emit = (event, storeId, extra) => {
    trackEvent(event, {
      flowId,
      storeId,
      buildVariant,
      ...typeof options.metadata === "function" ? options.metadata() : {},
      ...extra
    });
  };
  onMounted(() => {
    targets.forEach(({ store, storeId, fallbackReason }) => {
      if (isPiniaStore(store)) {
        emit("pinia_store_usage", storeId, { isLegacyFallback: false });
      } else {
        emit("pinia_store_fallback", storeId, {
          isLegacyFallback: true,
          reason: fallbackReason ?? "unknown"
        });
      }
    });
  });
};
export {
  usePiniaTelemetry as u
};
