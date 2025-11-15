<template>
  <div class="widget-container" :class="{ 'widget-container--bordered': withBorder }" v-loading="widgetLoading">
    <iframe v-if="src" class="widget" :src="src" @load="onLoadWidget"></iframe>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    src?: string;
    withBorder?: boolean;
  }>(),
  {
    src: '',
    withBorder: false,
  }
);

const widgetLoading = ref(false);

watch(
  () => props.src,
  (value) => {
    if (value) {
      widgetLoading.value = true;
    }
  },
  { immediate: true }
);

function onLoadWidget(): void {
  widgetLoading.value = false;
}

defineExpose({
  widgetLoading,
});
</script>

<style lang="scss">
.widget-container .el-loading-mask {
  background-color: var(--s-color-utility-surface);
}
</style>

<style lang="scss" scoped>
$widget-border-radius: 20px;

.widget {
  flex: 1;
  border: none;
  border-radius: $widget-border-radius;

  &-container {
    display: flex;
    border: none;
    width: 100%;
    min-height: 600px;
    overflow: hidden;

    &--bordered {
      .widget {
        box-shadow: var(--s-shadow-element);
        padding: $widget-border-radius $inner-spacing-mini;
        margin: $inner-spacing-tiny;
      }
    }
  }
}
</style>
