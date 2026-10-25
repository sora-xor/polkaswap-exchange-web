import { DynamicScroller, DynamicScrollerItem, RecycleScroller } from 'vue-virtual-scroller';

import type { App } from 'vue';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

export function install(app: App): void {
  app.component('RecycleScroller', RecycleScroller);
  app.component('DynamicScroller', DynamicScroller);
  app.component('DynamicScrollerItem', DynamicScrollerItem);
}
