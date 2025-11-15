<template>
  <s-button
    type="action"
    size="mini"
    alternative
    :tooltip="t('selectNodeText')"
    @click="handleClick"
    class="status-button"
  >
    <s-icon :class="`status--${status}`" :name="icon" size="16"></s-icon>
  </s-button>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { Status } from '@soramitsu-ui/ui/types';
import { useTranslation } from '@/composables/useTranslation';
import type { NodesConnection } from '@/utils/connection';

const emit = defineEmits<{
  (e: 'click'): void;
}>();

const props = withDefaults(
  defineProps<{
    connection?: NodesConnection | null;
  }>(),
  {
    connection: null,
  }
);

const { t } = useTranslation();

const loading = computed(() => Boolean(props.connection?.nodeAddressConnecting));
const connected = computed(() => Boolean(props.connection?.nodeIsConnected));
const icon = computed(() => (loading.value ? 'el-icon-loading' : 'globe-16'));
const status = computed(() => {
  if (connected.value) return Status.SUCCESS;
  if (loading.value) return Status.INFO;
  return Status.ERROR;
});

function handleClick(): void {
  emit('click');
}
</script>

<style lang="scss" scoped>
$status-classes: 'error', 'success';
$size: calc(var(--s-size-small) / 2);

.status {
  &-button.el-button.neumorphic.s-action.s-mini {
    width: $size;
    height: $size;
    font-size: $size;
  }

  @each $status in $status-classes {
    &--#{$status} {
      &,
      &:hover {
        color: var(--s-color-status-#{$status});
      }

      &:hover,
      &:focus {
        opacity: 0.5;
      }
    }
  }
}
</style>
