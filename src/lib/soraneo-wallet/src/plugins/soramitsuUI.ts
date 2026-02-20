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
  // eslint-disable-next-line vue/component-definition-name-casing -- Preserve Vue 2 legacy kebab-case global alias.
  app.component('el-popover', ElPopoverCompat);
  app.component('SCollapse', SCollapseCompat);
  // eslint-disable-next-line vue/component-definition-name-casing -- Preserve Vue 2 legacy kebab-case global alias.
  app.component('s-collapse', SCollapseCompat);
  app.component('SCollapseItem', SCollapseItemCompat);
  // eslint-disable-next-line vue/component-definition-name-casing -- Preserve Vue 2 legacy kebab-case global alias.
  app.component('s-collapse-item', SCollapseItemCompat);
  app.component('SFloatInput', SFloatInputCompat);
  // eslint-disable-next-line vue/component-definition-name-casing -- Preserve Vue 2 legacy kebab-case global alias.
  app.component('s-float-input', SFloatInputCompat);
}
