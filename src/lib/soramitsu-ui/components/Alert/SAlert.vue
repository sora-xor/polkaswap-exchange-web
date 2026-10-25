<script setup lang="ts">
import { IconClose, STATUS_ICONS_MAP } from '@soramitsu-ui/ui/components/icons';
import type { Status } from '@soramitsu-ui/ui/types';
import type { Component } from 'vue';

interface Props {
  inline?: boolean;
  status?: Status;
  showCloseBtn?: boolean;
  title?: string;
  description?: string;
}

const props = withDefaults(defineProps<Props>(), {
  status: 'info' as Status,
  showCloseBtn: false,
});

const emit = defineEmits<(event: 'click:close') => void>();

const StatusIcon = shallowRef<Component>();

watchSyncEffect(() => {
  StatusIcon.value = STATUS_ICONS_MAP[props.status];
});

function onClickClose() {
  emit('click:close');
}
</script>

<template>
  <div :class="['s-alert', { 's-alert_inline': inline }]" :data-status="status">
    <div class="s-alert__icon-wrapper">
      <component :is="StatusIcon" />
    </div>

    <div class="flex-1">
      <div class="sora-tpg-h5">
        <slot name="title">
          {{ title }}
        </slot>
      </div>

      <div class="sora-tpg-p3">
        <slot name="description">
          {{ description }}
        </slot>
      </div>
    </div>

    <div v-if="showCloseBtn" class="s-alert__close-wrapper">
      <button data-testid="close-btn" @click="onClickClose">
        <IconClose />
      </button>
    </div>
  </div>
</template>
