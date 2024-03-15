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
import { Component, Emit, Mixins, Prop, Watch } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import type { Layout, ResponsiveLayouts } from '@/types/layout';
import { layoutsStorage } from '@/utils/storage';

@Component({
  components: {
    WidgetsGrid: lazyComponent(Components.WidgetsGrid),
  },
})
export default class WidgetsLayout extends Mixins(mixins.LoadingMixin) {
  /** Layout ID to sync it with storage */
  @Prop({ default: '', type: String }) readonly id!: string;
  /** Default layouts */
  @Prop({ default: () => ({}), type: Object }) readonly defaultLayouts!: ResponsiveLayouts;
  /** Widgets visibility by widget ID */
  @Prop({ default: () => ({}), type: Object }) readonly value!: Record<string, boolean>;

  @Watch('value')
  private updateLayoutWidgets(): void {
    const layouts = cloneDeep(this.layouts);

    Object.entries(this.value).forEach(([widgetKey, visibilityFlag]) => {
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

  layouts!: ResponsiveLayouts;

  created(): void {
    const storedLayouts = layoutsStorage.get(this.id);
    const layouts = storedLayouts ? JSON.parse(storedLayouts) : this.defaultLayouts;
    this.saveLayouts(layouts);
    this.updateWidgetsVisibility();
  }

  updateLayouts(updated: ResponsiveLayouts): void {
    if (!isEqual(this.layouts, updated)) {
      this.saveLayouts({ ...this.layouts, ...updated });
    }
  }

  private saveLayouts(layouts: ResponsiveLayouts): void {
    this.layouts = cloneDeep(layouts);
    // update layouts in storage
    if (this.id) {
      layoutsStorage.set(this.id, JSON.stringify(this.layouts));
    }
  }

  /**
   * Emits widgets visibility model update.
   * Occurs after component created and initial layout is loaded from storage.
   */
  @Emit('input')
  private updateWidgetsVisibility() {
    // chose first layout
    const layout: Layout = Object.values(this.layouts)[0];
    // create new model based on chosen layout
    return Object.keys(this.value).reduce((acc, widgetId) => {
      acc[widgetId] = !!layout.find((widget) => widget.i === widgetId);

      return acc;
    }, {});
  }
}
</script>
