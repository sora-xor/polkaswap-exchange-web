<template>
  <widgets-grid v-bind="$attrs" :layouts="layouts" @update="updateLayouts">
    <template v-for="(_, scopedSlotName) in $scopedSlots" v-slot:[scopedSlotName]="slotData">
      <slot :name="scopedSlotName" v-bind="slotData" />
    </template>
  </widgets-grid>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import cloneDeep from 'lodash/fp/cloneDeep';
import isEqual from 'lodash/fp/isEqual';
import { Component, Mixins, Prop, ModelSync, Watch } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import type { ResponsiveLayouts } from '@/types/layout';

@Component({
  components: {
    WidgetsGrid: lazyComponent(Components.WidgetsGrid),
  },
})
export default class Swap extends Mixins(mixins.LoadingMixin) {
  /**
   * Layout ID to sync it with storage
   */
  @Prop({ default: '', type: String }) readonly id!: string;
  /**
   * Layout widgets IDs
   */
  // @Prop({ default: () => [], type: Array }) readonly widgets!: string[];
  /**
   * Default layouts
   */
  @Prop({ default: () => ({}), type: Object }) readonly defaultLayouts!: ResponsiveLayouts;
  /**
   * Layout Widgets visibility by widget ID
   */
  @ModelSync('visibility', 'update:visibility', { type: Object })
  widgetsVisibility!: Record<string, boolean>;

  layouts!: ResponsiveLayouts;

  @Watch('widgetsVisibility')
  private updateLayoutWidgets(visibility: Record<string, boolean>) {
    const layouts = cloneDeep(this.layouts);

    Object.entries(visibility).forEach(([widgetKey, visibilityFlag]) => {
      Object.keys(layouts).forEach((key) => {
        if (visibilityFlag) {
          const currentWidget = layouts[key].find((widget) => widget.i === widgetKey);

          if (!currentWidget) {
            const defaultWidget = this.defaultLayouts[key].find((widget) => widget.i === widgetKey);

            if (defaultWidget) {
              layouts[key] = [...layouts[key], { ...defaultWidget }];
            }
          }
        } else {
          layouts[key] = layouts[key].filter((widget) => widget.i !== widgetKey);
        }
      });
    });

    this.saveLayouts(layouts);
  }

  created(): void {
    if (this.id) {
      // load layouts from storage
    }

    // or use default
    this.saveLayouts(this.defaultLayouts);
    this.widgetsVisibility = this.getVisibilityFromLayouts(this.layouts);
  }

  updateLayouts(updated: ResponsiveLayouts): void {
    if (!isEqual(this.layouts, updated)) {
      this.saveLayouts({ ...this.layouts, ...updated });
    }
  }

  saveLayouts(layouts: ResponsiveLayouts) {
    this.layouts = cloneDeep(layouts);
  }

  getVisibilityFromLayouts(layouts: ResponsiveLayouts) {
    const layout = Object.values(layouts)[0];

    return Object.keys(this.widgetsVisibility).reduce((acc, key) => {
      acc[key] = layout.find((widget) => widget.i === key);

      return acc;
    }, {});
  }
}
</script>
