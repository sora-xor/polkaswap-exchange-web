<template>
  <div class="customise-widget-wrapper" @click.stop="toggleVisibility">
    <base-widget v-bind="$attrs" :title="t('customisePageText')" class="customise-widget">
      <template #filters>
        <s-popover-panel
          popper-class="customise-widget-popper"
          placement="bottom-end"
          trigger="click"
          v-model:show="visible"
          :visible-arrow="false"
        >
          <template #reference>
            <s-button
              id="customise-button"
              type="action"
              alternative
              size="small"
              icon="basic-settings-24"
              :aria-label="t('customisePageText')"
            ></s-button>
          </template>

          <div class="customise">
            <div class="customise-title">{{ t('customisePageText') }}</div>

            <div v-for="entry in modelEntries" :key="entry.name" class="customise-options">
              <s-divider></s-divider>
              <div v-for="(value, key) in entry.model" :key="key" class="customise-option">
                <s-switch
                  :model-value="value"
                  @update:model-value="(val) => toggle(entry.name, key, val)"
                  @change="(val) => toggle(entry.name, key, val)"
                />
                <button type="button" class="customise-option__label" @click="toggleLabel(entry.name, key, value)">
                  {{ getLabel(key) }}
                </button>
              </div>
            </div>

            <slot></slot>
          </div>
        </s-popover-panel>
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
  if (Boolean(target.value?.[key]) === Boolean(value)) return;

  const nextValue: WidgetsVisibilityModel = {
    ...(target.value ?? ((ObjectInit() ?? {}) as WidgetsVisibilityModel)),
    [key]: value,
  };
  target.value = nextValue;
}

function toggleLabel(name: ModelKey, key: string, value: boolean): void {
  toggle(name, key, !value);
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

  :deep(#customise-button) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    min-width: 32px;
    height: 32px;
    min-height: 32px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    box-shadow: none;
    color: var(--s-color-base-content-tertiary);
  }

  :deep(#customise-button .s-button__icon),
  :deep(#customise-button i[class*='s-icon-']) {
    display: inline-block;
    font-size: 18px;
    line-height: 18px;
    color: inherit;
    opacity: 0.7;
  }
}

.customise {
  display: flex;
  flex-flow: column nowrap;
  gap: $inner-spacing-small;
  min-width: 240px;

  @include vertical-divider('el-divider', 0);

  &-title {
    font-size: var(--s-font-size-small);
    font-weight: 500;
  }

  &-options {
    display: flex;
    flex-flow: column nowrap;
    gap: $inner-spacing-small;
  }

  &-option {
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    gap: $inner-spacing-small;
  }

  &-option__label {
    cursor: pointer;
    border: 0;
    padding: 0;
    margin: 0;
    background: transparent;
    color: var(--s-color-base-content-primary);
    text-align: left;
    font: inherit;
    text-transform: capitalize;
  }

  :deep(.customise-options .el-divider) {
    margin: 0 0 $inner-spacing-small;
  }

  :deep(> .s-button) {
    width: 100%;
    height: 42px;
    border: 0;
    border-radius: 24px;
    background: var(--s-color-base-border-secondary);
    box-shadow: var(--s-shadow-element-pressed);
    text-transform: uppercase;
  }

  :deep(> .s-button .s-button__text) {
    font-weight: 700;
    color: var(--s-color-base-content-quaternary);
    text-transform: uppercase;
  }
}
</style>
