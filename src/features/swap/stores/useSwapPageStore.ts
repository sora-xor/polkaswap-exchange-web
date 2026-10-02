import { defineStore } from 'pinia';
import { ref } from 'vue';

import { SWAP_GRID_ID, buildDefaultSwapWidgetsVisibility } from '../constants/layout';

/**
 * UI-only swap page state. Domain trading state remains on the legacy swap
 * store until the full feature migration lands.
 */
export const useSwapPageStore = defineStore('swapPage', () => {
  const customizePopper = ref(false);
  const chartExpanded = ref(false);
  const options = ref({ edit: false });
  const widgets = ref(buildDefaultSwapWidgetsVisibility());

  /** Restores page controls and optional widget visibility without persisting chart disclosure state. */
  const resetWidgetPreferences = (): void => {
    customizePopper.value = false;
    chartExpanded.value = false;
    options.value = { edit: false };
    widgets.value = buildDefaultSwapWidgetsVisibility();
  };

  return {
    customizePopper,
    chartExpanded,
    options,
    widgets,
    gridId: SWAP_GRID_ID,
    resetWidgetPreferences,
  };
});
