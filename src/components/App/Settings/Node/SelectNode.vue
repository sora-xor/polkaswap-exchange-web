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
              <s-button
                v-if="node.address === currentAddressValue && !nodeAddressConnecting"
                class="select-node-details"
                type="action"
                alternative
                icon="arrows-swap-90-24"
                @click.stop="handleNode?.(node)"
              ></s-button>
              <s-icon v-else-if="isConnecting(node.address)" name="el-icon-loading"></s-icon>
            </div>
            <s-button
              class="select-node-details"
              type="action"
              alternative
              icon="arrows-chevron-right-rounded-24"
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
