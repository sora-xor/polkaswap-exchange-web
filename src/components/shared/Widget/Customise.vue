<template>
  <base-widget
    v-bind="$attrs"
    :title="t('customisePageText')"
    class="customise-widget"
    @click.native.stop="toggleVisibility"
  >
    <template #filters>
      <el-popover popper-class="customise-widget-popper" trigger="click" v-model="visible" :visible-arrow="false">
        <template #reference>
          <s-button id="customise-button" type="action" alternative size="small" icon="basic-settings-24" />
        </template>

        <div class="customise">
          <div class="customise-title">{{ t('customisePageText') }}</div>

          <div v-for="(model, name) in models" :key="name" class="customise-options">
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
import isEmpty from 'lodash/fp/isEmpty';
import { Component, Mixins, ModelSync, PropSync, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, ObjectInit } from '@/consts';
import { lazyComponent } from '@/router';
import type { WidgetsVisibilityModel } from '@/types/layout';
import { capitalize } from '@/utils';

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

  get models(): Record<string, WidgetsVisibilityModel> {
    const { widgets, options } = this;
    return Object.entries({ widgets, options }).reduce((acc, [name, model]) => {
      if (isEmpty(model)) return acc;
      return { ...acc, [name]: model };
    }, {});
  }

  toggle(name: string, model: WidgetsVisibilityModel, key: string, value: boolean): void {
    this[name] = { ...model, [key]: value };
  }

  getLabel(key: string, name: string): string {
    const label = key in this.labels ? this.labels[key] : this.t(`${name}.${key}`);

    return capitalize(label);
  }

  toggleVisibility(event: PointerEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('#customise-button')) return;

    this.visible = !this.visible;
  }
}
</script>

<style lang="scss">
.customise-widget-popper.el-popover.el-popper {
  @include popper-content;
}
</style>

<style lang="scss" scoped>
.customise-widget {
  cursor: pointer;

  &-icon {
    @include icon-styles(true);
  }
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
