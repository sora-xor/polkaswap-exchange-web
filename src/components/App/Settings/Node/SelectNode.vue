<template>
  <div class="select-node s-flex">
    <s-scrollbar class="select-node-scrollbar">
      <s-radio-group v-model="currentAddressValue" class="select-node-list s-flex">
        <s-radio
          v-for="node in nodes"
          :key="node.address"
          :label="node.address"
          :value="node.address"
          :disabled="disabled || isConnecting(node.address)"
          size="medium"
          class="select-node-list__item s-flex"
        >
          <div class="select-node-item s-flex">
            <div class="select-node-info s-flex">
              <div class="select-node-info__label">
                {{ getTitle(node) }}
              </div>
              <div class="select-node-info__desc s-flex">
                <div>{{ node.address }}</div>
                <div v-if="node.location" v-html="formatNodeLocation(node.location)"></div>
              </div>
            </div>
            <div class="select-node-badge">
              <s-icon
                v-if="node.address === currentAddressValue && !nodeAddressConnecting"
                class="select-node-details"
                name="basic-check-mark-24"
                size="16px"
              ></s-icon>
              <s-icon v-else-if="isConnecting(node.address)" name="el-icon-loading"></s-icon>
            </div>
            <s-button
              class="select-node-details"
              type="action"
              alternative
              icon="arrows-chevron-right-rounded-24"
              :aria-label="t('assets.details')"
              @click.stop="viewNode?.(node)"
            ></s-button>
          </div>
        </s-radio>
      </s-radio-group>
    </s-scrollbar>
    <s-button class="select-node-button s-typography-button--big" @click.stop="viewNode?.()">
      {{ t('selectNodeDialog.addNode') }}
    </s-button>
  </div>
</template>

<script lang="ts" setup>
import { computed, toRefs } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import type { Node } from '@/types/nodes';
import { escapeHtml, sanitizeHtml } from '@/utils/sanitize';

import { formatLocation } from './utils';

const props = withDefaults(
  defineProps<{
    nodes?: Node[];
    handleNode?: (node?: Node) => void;
    viewNode?: (node?: Node) => void;
    nodeAddressConnecting?: string;
    disabled?: boolean;
  }>(),
  {
    nodes: () => [],
    handleNode: undefined,
    viewNode: undefined,
    nodeAddressConnecting: '',
    disabled: false,
  }
);

const { nodes, nodeAddressConnecting, disabled } = toRefs(props);
const { t } = useTranslation();

const currentAddressValue = defineModel<string>('value', { default: '' });

function formatNodeLocation(code: string): string {
  const location = formatLocation(code);
  if (!location) return '';
  const safeFlag = `<span class="flag-emodji">${escapeHtml(location.flag)}</span>`;
  const raw = location.name ? `${escapeHtml(location.name)} ${safeFlag}` : safeFlag;

  return sanitizeHtml(raw, {
    allowedTags: ['span'],
    allowedAttributes: {
      span: ['class'],
    },
  });
}

function isConnecting(address: string): boolean {
  return address === nodeAddressConnecting.value;
}

function getTitle(node: Node): string {
  const { name, chain } = node;
  return name && chain ? t('selectNodeDialog.nodeTitle', { chain, name }) : name || chain || '';
}
</script>

<style lang="scss">
.select-node-list__item {
  &.el-radio,
  &.s-radio {
    height: initial;
  }

  &.s-radio {
    width: 100%;
    border-radius: var(--s-border-radius-mini);
    cursor: pointer;
    transition:
      background-color 120ms ease,
      box-shadow 120ms ease;

    > .flex {
      display: flex;
      align-items: stretch;
      width: 100%;
      min-width: 0;
    }

    .s-radio-atom {
      display: none;
    }

    > .flex.space-x-2 {
      column-gap: 0;
    }

    > .flex.space-x-2 > :not([hidden]) ~ :not([hidden]) {
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
  }

  .el-radio__label,
  > .flex > label {
    display: block;
    flex: 1;
    width: 100%;
    min-width: 0;
    cursor: inherit;
  }

  &[aria-checked='true'] {
    background: var(--s-color-base-background-hover);
    box-shadow: inset 3px 0 0 var(--s-color-theme-accent);
  }

  &:hover:not([aria-disabled='true']):not([aria-checked='true']) {
    background: var(--s-color-base-background);
  }
}

.select-node-scrollbar {
  @include scrollbar(0, 4px);

  &.el-scrollbar {
    width: 100%;

    > .el-scrollbar__wrap {
      max-height: 420px;
    }

    > .el-scrollbar__bar.is-vertical {
      bottom: 4px;
      top: 4px;
    }
  }
}

.select-node {
  .el-button + .el-button {
    margin-left: 0;
  }
}
</style>

<style lang="scss" scoped>
$node-desc-spacing: 6px;
$node-desc-border-radius: 8px;

.select-node {
  flex-direction: column;

  & > *:not(:last-child) {
    margin-bottom: $inner-spacing-medium;
  }

  &-list {
    flex-direction: column;
    gap: $inner-spacing-mini;

    &__item {
      margin-right: 0;
      align-items: center;
      padding: $inner-spacing-small $inner-spacing-medium;
      white-space: normal;
    }
  }

  &-item {
    flex: 1;
    align-items: center;
    min-width: 0;
  }

  &-info {
    flex-direction: column;
    flex: 1;
    margin-right: $inner-spacing-small;

    &__label {
      color: var(--s-color-base-content-primary);
      line-height: var(--s-line-height-medium);
      @include radio-title;
    }

    &__desc {
      flex-wrap: wrap;
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-mini);
      font-weight: 300;
      line-height: var(--s-line-height-medium);

      > div {
        background: var(--s-color-base-background);
        padding: $node-desc-spacing;
        margin-top: $node-desc-spacing;
        margin-right: $inner-spacing-mini;
        border-radius: $node-desc-border-radius;
      }
    }
  }

  &-details {
    padding: 0;
    color: var(--s-color-base-content-tertiary);
  }

  &-button {
    width: 100%;
  }

  &-badge {
    width: var(--s-size-medium);
    height: var(--s-size-medium);
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 var(--s-size-medium);
    color: var(--s-color-theme-accent);

    .el-icon-loading {
      color: var(--s-color-base-content-tertiary);
    }
  }

  &-description {
    font-size: var(--s-font-size-extra-small);
    font-weight: 300;
    line-height: var(--s-line-height-base);
    padding: 0 $inner-spacing-small;
  }
}
</style>
