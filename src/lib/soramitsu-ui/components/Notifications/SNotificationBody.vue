<script setup lang="ts">
import type { Status } from '@soramitsu-ui/ui/types';
import SNotificationBodyTimeline from './SNotificationBodyTimeline.vue';
import { IconClose, STATUS_ICONS_MAP } from '@soramitsu-ui/ui/components/icons';

const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    status?: Status;
    timeout?: number;
    showCloseBtn?: boolean;
  }>(),
  {
    timeout: 0,
  }
);

const StatusIcon = computed(() => (props.status ? STATUS_ICONS_MAP[props.status] : undefined));

const emit = defineEmits(['click:close', 'timeout']);

function onClickClose() {
  emit('click:close');
}

function onTimeout() {
  emit('timeout');
}
</script>

<template>
  <div class="s-notification-body" :data-status="status">
    <div class="flex space-x-4">
      <div v-if="StatusIcon" class="s-notification-body__icon-wrapper">
        <component :is="StatusIcon" />
      </div>

      <div class="flex-1">
        <div v-if="title || $slots.title" class="sora-tpg-p2">
          <slot name="title">
            {{ title }}
          </slot>
        </div>

        <div v-if="description || $slots.description" class="sora-tpg-p4">
          <slot name="description">
            {{ description }}
          </slot>
        </div>
      </div>

      <div class="s-notification-body__close-wrapper">
        <button v-if="showCloseBtn" data-testid="close-btn" @click="onClickClose">
          <IconClose />
        </button>
      </div>
    </div>

    <SNotificationBodyTimeline :timeout="timeout" @timeout="onTimeout" />
  </div>
</template>
