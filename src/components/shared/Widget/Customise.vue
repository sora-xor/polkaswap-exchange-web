<template>
  <base-widget v-bind="$attrs" :title="t('customisePageText')">
    <template #filters>
      <el-popover popper-class="customise-widget-popper" trigger="click" v-model="visible" :visible-arrow="false">
        <s-button slot="reference" type="action" alternative size="small" icon="basic-settings-24" />

        <div class="customise">
          <div class="customise-title">{{ t('customisePageText') }}</div>

          <div v-for="(model, name) in { widgets, options }" :key="name" class="customise-options">
            <s-divider />
            <label v-for="(value, key) in model" :key="key" class="customise-option">
              <s-switch :value="value" @input="toggle(name, model, key, $event)" />
              <span>{{ getLabel(key, name) }}</span>
            </label>
          </div>

          <slot />
        </div>
      </el-popover>
    </template>
  </base-widget>
</template>

<script lang="ts">
import { Component, Mixins, ModelSync, PropSync, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, ObjectInit } from '@/consts';
import { lazyComponent } from '@/router';
import type { WidgetsVisibilityModel } from '@/types/layout';

@Component({
  components: {
    BaseWidget: lazyComponent(Components.BaseWidget),
  },
})
export default class CustomiseWidget extends Mixins(TranslationMixin) {
  @PropSync('widgetsModel', { default: ObjectInit, type: Object }) readonly widgets!: WidgetsVisibilityModel;
  @PropSync('optionsModel', { default: ObjectInit, type: Object }) readonly options!: WidgetsVisibilityModel;
  @Prop({ default: ObjectInit, type: Object }) readonly labels!: Record<string, string>;

  @ModelSync('value', 'input', { type: Boolean }) visible!: boolean;

  toggle(name: string, model: WidgetsVisibilityModel, key: string, value: boolean): void {
    this[name] = { ...model, [key]: value };
  }

  getLabel(key: string, name: string): string {
    if (key in this.labels) return this.labels[key];

    return this.t(`${name}.${key}`);
  }
}
</script>

<style lang="scss">
.customise-widget-popper.el-popover.el-popper {
  @include popper-content;
}
</style>

<style lang="scss" scoped>
.customise-widget-icon {
  @include icon-styles(true);
}

.customise {
  display: flex;
  flex-flow: column nowrap;
  gap: $inner-spacing-medium;

  @include vertical-divider('el-divider', 0);

  &-title {
    font-size: var(--s-font-size-small);
    font-weight: 500;
  }

  &-options {
    display: flex;
    flex-flow: column nowrap;
    gap: $inner-spacing-medium;
  }

  &-option {
    cursor: pointer;
    display: flex;
    flex-flow: row nowrap;
    gap: $inner-spacing-small;
    text-transform: capitalize;
  }
}
</style>
