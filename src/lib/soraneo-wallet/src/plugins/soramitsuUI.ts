import { plugin } from '@soramitsu-ui/ui';
import ElPopoverCompat from '@/components/compat/ElPopoverCompat';
import SCollapseCompat from '@/components/compat/SCollapseCompat.vue';
import SCollapseItemCompat from '@/components/compat/SCollapseItemCompat.vue';
import SFloatInputCompat from '@/components/compat/SFloatInputCompat.vue';

import type { App } from 'vue';
import '@soramitsu-ui/ui/styles';

export function install(app: App): void {
  app.use(plugin());
  app.component('ElPopover', ElPopoverCompat);
  app.component('ElPopover', ElPopoverCompat);
  app.component('SCollapse', SCollapseCompat);
  app.component('SCollapse', SCollapseCompat);
  app.component('SCollapseItem', SCollapseItemCompat);
  app.component('SCollapseItem', SCollapseItemCompat);
  app.component('SFloatInput', SFloatInputCompat);
  app.component('SFloatInput', SFloatInputCompat);
}
