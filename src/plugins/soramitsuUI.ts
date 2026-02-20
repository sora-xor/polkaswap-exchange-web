import { plugin as soramitsuUIPlugin } from '@soramitsu-ui/ui';
import ElPopoverCompat from '@/components/compat/ElPopoverCompat';
import SCollapseCompat from '@/components/compat/SCollapseCompat.vue';
import SCollapseItemCompat from '@/components/compat/SCollapseItemCompat.vue';
import SDropdownCompat from '@/components/compat/SDropdownCompat.vue';
import SDropdownItemCompat from '@/components/compat/SDropdownItemCompat.vue';
import SFloatInputCompat from '@/components/compat/SFloatInputCompat.vue';

import type { App } from 'vue';

import '@soramitsu-ui/ui/styles';

export function install(app: App): void {
  app.use(soramitsuUIPlugin());
  app.component('ElPopover', ElPopoverCompat);
  app.component('ElPopover', ElPopoverCompat);
  app.component('SCollapse', SCollapseCompat);
  app.component('SCollapse', SCollapseCompat);
  app.component('SCollapseItem', SCollapseItemCompat);
  app.component('SCollapseItem', SCollapseItemCompat);
  app.component('SDropdown', SDropdownCompat);
  app.component('SDropdown', SDropdownCompat);
  app.component('SDropdownItem', SDropdownItemCompat);
  app.component('SDropdownItem', SDropdownItemCompat);
  app.component('SFloatInput', SFloatInputCompat);
  app.component('SFloatInput', SFloatInputCompat);
}
