import { defineStore } from 'pinia';
import { ref } from 'vue';

import { SWAP_GRID_ID, buildDefaultSwapWidgetsVisibility } from '../constants/layout';

/**
 * UI-only swap page state. Domain trading state remains on the legacy swap
 * store until the full feature migration lands.
 */
export const useSwapPageStore = defineStore('swapPage', () => {
  const customizePopper = ref(false);
  const options = ref({ edit: false });
  const widgets = ref(buildDefaultSwapWidgetsVisibility());

  const resetWidgetPreferences = (): void => {
    customizePopper.value = false;
    options.value = { edit: false };
    widgets.value = buildDefaultSwapWidgetsVisibility();
  };

  return {
    customizePopper,
    options,
    widgets,
    gridId: SWAP_GRID_ID,
    resetWidgetPreferences,
  };
});
