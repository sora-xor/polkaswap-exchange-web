<template>
  <div class="customise-widget-wrapper" @click.stop="toggleVisibility">
    <base-widget v-bind="$attrs" :title="t('customisePageText')" class="customise-widget">
      <template #filters>
        <el-popover popper-class="customise-widget-popper" trigger="click" v-model="visible" :visible-arrow="false">
          <template #reference>
            <s-button id="customise-button" type="action" alternative size="small" icon="basic-settings-24"></s-button>
          </template>

          <div class="customise">
            <div class="customise-title">{{ t('customisePageText') }}</div>

            <div v-for="entry in modelEntries" :key="entry.name" class="customise-options">
              <s-divider></s-divider>
              <label v-for="(value, key) in entry.model" :key="key" class="customise-option">
                <s-switch :model-value="value" @update:model-value="(val) => toggle(entry.name, key, val)" />
                <span>{{ getLabel(key) }}</span>
              </label>
            </div>

            <slot></slot>
          </div>
        </el-popover>
      </template>
    </base-widget>
  </div>
</template>

<script setup lang="ts">
import isEmpty from 'lodash/fp/isEmpty';
import { computed } from 'vue';

import BaseWidget from '@/components/shared/Widget/Base.vue';
import { useTranslation } from '@/composables/useTranslation';
import { ObjectInit } from '@/consts';
import type { WidgetsVisibilityModel } from '@/types/layout';
import { capitalize } from '@/utils';

type ModelKey = 'widgets' | 'options';

const visible = defineModel<boolean>({ default: false });
const widgetsModel = defineModel<WidgetsVisibilityModel>('widgets', {
  default: () => (ObjectInit() ?? {}) as WidgetsVisibilityModel,
});
const optionsModel = defineModel<WidgetsVisibilityModel>('options', {
  default: () => (ObjectInit() ?? {}) as WidgetsVisibilityModel,
});

const props = withDefaults(
  defineProps<{
    labels?: Record<string, string>;
  }>(),
  {
    labels: () => (ObjectInit() ?? {}) as Record<string, string>,
  }
);

const { t } = useTranslation();

const modelEntries = computed(() => {
  const entries: Array<{ name: ModelKey; model: WidgetsVisibilityModel }> = [];
  const sources: Record<ModelKey, WidgetsVisibilityModel | null | undefined> = {
    widgets: widgetsModel.value,
    options: optionsModel.value,
  };

  (Object.keys(sources) as ModelKey[]).forEach((name) => {
    const model = sources[name];
    if (model && !isEmpty(model)) {
      entries.push({ name, model });
    }
  });

  return entries;
});

function toggle(name: ModelKey, key: string, value: boolean): void {
  const target = name === 'widgets' ? widgetsModel : optionsModel;
  const nextValue: WidgetsVisibilityModel = {
    ...(target.value ?? ((ObjectInit() ?? {}) as WidgetsVisibilityModel)),
    [key]: value,
  };
  target.value = nextValue;
}

function getLabel(key: string): string {
  const label = props.labels?.[key] ?? '';
  return capitalize(label);
}

function toggleVisibility(event: PointerEvent): void {
  const target = event.target as HTMLElement | null;
  if (target?.closest('#customise-button')) return;

  visible.value = !visible.value;
}
</script>

<style lang="scss">
.customise-widget-popper.el-popover.el-popper {
  @include popper-content;
}
</style>

<style lang="scss" scoped>
.customise-widget-wrapper {
  cursor: pointer;
}

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
