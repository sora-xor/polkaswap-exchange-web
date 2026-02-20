<template>
  <div class="widget-container" :class="{ 'widget-container--bordered': withBorder }" v-loading="widgetLoading">
    <iframe
      v-if="safeSrc"
      class="widget"
      :src="safeSrc"
      :sandbox="sandbox"
      referrerpolicy="no-referrer"
      loading="lazy"
      @load="onLoadWidget"
    ></iframe>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    src?: string;
    withBorder?: boolean;
    allowedOrigins?: string[];
    sandbox?: string;
  }>(),
  {
    src: '',
    withBorder: false,
    allowedOrigins: () => [],
    // Needed for embedded purchase flows.
    // Note: kept inline because `defineProps()` defaults are hoisted out of `<script setup>`.
    sandbox:
      'allow-forms allow-popups allow-popups-to-escape-sandbox allow-scripts allow-same-origin allow-top-navigation-by-user-activation',
  }
);

const widgetLoading = ref(false);

const safeSrc = computed(() => {
  const raw = props.src?.trim();
  if (!raw) return '';

  if (typeof window === 'undefined') return raw;

  try {
    const url = new URL(raw, window.location.origin);
    const isSameOrigin = url.origin === window.location.origin;

    if (isSameOrigin) return url.toString();
    if (url.protocol !== 'https:') return '';

    const allowed = new Set(props.allowedOrigins.map((origin) => origin.toLowerCase()));
    return allowed.has(url.origin.toLowerCase()) ? url.toString() : '';
  } catch {
    return '';
  }
});

watch(
  safeSrc,
  (value) => {
    widgetLoading.value = Boolean(value);
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
