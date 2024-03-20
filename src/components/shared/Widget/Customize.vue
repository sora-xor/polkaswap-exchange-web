<template>
  <base-widget v-bind="$attrs" title="Customise page">
    <template #filters>
      <el-popover popper-class="customise-widget-popper" trigger="click" v-model="visible" :visible-arrow="false">
        <template #reference>
          <s-icon name="basic-settings-24" size="24px" class="customise-widget-icon" />
        </template>

        <div class="customise">
          <div class="customise-title">Customise page</div>

          <div v-for="(model, name) in { widgetsModel, optionsModel }" :key="name" class="customise-options">
            <s-divider />
            <label v-for="(value, key) in model" :key="key" class="customise-option">
              <s-switch :value="value" @input="toggle(name, model, key, $event)" />
              <span>{{ key }}</span>
            </label>
          </div>
        </div>
      </el-popover>
    </template>
  </base-widget>
</template>

<script lang="ts">
import { Component, Mixins, ModelSync, PropSync } from 'vue-property-decorator';

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
  @PropSync('widgets', { default: ObjectInit, type: Object }) readonly widgetsModel!: WidgetsVisibilityModel;
  @PropSync('options', { default: ObjectInit, type: Object }) readonly optionsModel!: WidgetsVisibilityModel;

  @ModelSync('value', 'input', { type: Boolean }) readonly visible!: boolean;

  toggle(name: string, model: WidgetsVisibilityModel, key: string, value: boolean) {
    this[name] = { ...model, [key]: value };
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
