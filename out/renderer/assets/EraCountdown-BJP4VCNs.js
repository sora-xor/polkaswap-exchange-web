import { z as defineComponent, u as useTranslation, aA as watch, a4 as onMounted, aB as onBeforeUnmount, h as computed, a9 as ref, A as createElementBlock, C as openBlock, aN as toDisplayString } from "./index-73GArslZ.js";
import { u as useSoraStaking } from "./useSoraStaking-B7oKU4Xa.js";
import "./useFormattedAmount-D-xkdlPs.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "EraCountdown",
  props: {
    translationKey: {},
    targetEra: {}
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const { t } = useTranslation();
    const { activeEra, activeEraStart } = useSoraStaking();
    const days = ref(0);
    const hours = ref(0);
    const minutes = ref(0);
    let interval = null;
    const translationLabel = computed(() => props.translationKey ? t(props.translationKey) : "");
    const calculateCountdown = () => {
      if (!activeEra.value || !activeEraStart.value || !props.targetEra) {
        days.value = 0;
        hours.value = 0;
        minutes.value = 0;
        return;
      }
      const erasToTarget = props.targetEra - activeEra.value;
      if (erasToTarget <= 0) {
        days.value = 0;
        hours.value = 0;
        minutes.value = 0;
        return;
      }
      const start = new Date(activeEraStart.value);
      const targetDateTime = new Date(start.getTime() + erasToTarget * 6 * 36e5);
      const diff = targetDateTime.getTime() - Date.now();
      if (diff <= 0) {
        days.value = 0;
        hours.value = 0;
        minutes.value = 0;
        return;
      }
      days.value = Math.floor(diff / (1e3 * 60 * 60 * 24));
      hours.value = Math.floor(diff / (1e3 * 60 * 60) % 24);
      minutes.value = Math.floor(diff / (1e3 * 60) % 60);
    };
    watch([() => props.targetEra, activeEra, activeEraStart], calculateCountdown, { immediate: true });
    onMounted(() => {
      if (!interval) {
        interval = setInterval(calculateCountdown, 1e4);
      }
    });
    onBeforeUnmount(() => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    });
    __expose({
      days,
      hours,
      minutes,
      translationLabel
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("span", null, toDisplayString(days.value) + "D " + toDisplayString(hours.value) + "H " + toDisplayString(minutes.value) + "M " + toDisplayString(translationLabel.value), 1);
    };
  }
});
export {
  _sfc_main as default
};
