<template>
  <div class="asset-list" v-bind="rootAttrs">
    <recycle-scroller
      ref="wrap"
      :items="assets"
      :item-size="itemHeightValue"
      :buffer="itemHeightValue"
      :style="style"
      key-field="address"
      :class="['asset-list-inner', { 'hidden-scrollbar': !gutterOffset }]"
      @scroll="handleScroll"
    >
      <template #before>
        <div v-if="isEmptyList" class="asset-list-empty">
          <slot name="list-empty">{{ t('assets.empty') }}</slot>
        </div>
      </template>
      <template #default="slotProps">
        <template v-if="slotProps?.item">
          <asset-list-item
            :key="slotProps.index"
            :asset="slotProps.item"
            :with-clickable-logo="withClickableLogo"
            :selectable="selectable"
            :selected="isSelected(slotProps.item)"
            :pinnable="pinnable"
            :with-fiat="withFiat"
            :with-tabindex="withTabindex"
            v-on="wrapListeners(slotProps.item)"
          >
            <template v-for="name in forwardedSlots" #[name]="forwardedSlotProps">
              <slot :name="name" v-bind="forwardedSlotProps ?? {}"></slot>
            </template>
          </asset-list-item>
          <s-divider
            v-if="divider && slotProps.index !== assets.length - 1"
            :key="`${slotProps.index}-divider`"
          ></s-divider>
        </template>
      </template>
    </recycle-scroller>

    <scrollbar
      :move="barMove"
      :size="barSize"
      :scroll-height="scrollHeight"
      class="asset-list-scrollbar"
      @change="scrollTo"
    ></scrollbar>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, useAttrs, useSlots, watch } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { delay, getCssVariableValue, getScrollbarWidth } from '@/util';

import AssetListItem from './AssetListItem.vue';
import Scrollbar from './ScrollBar.vue';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import type { RecycleScroller } from 'vue-virtual-scroller';

defineOptions({
  inheritAttrs: false,
});

type Props = {
  assets?: Asset[];
  size?: number;
  divider?: boolean;
  withClickableLogo?: boolean;
  selected?: Asset[];
  selectable?: boolean;
  pinnable?: boolean;
  pinned?: Asset[];
  withFiat?: boolean;
  withTabindex?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  assets: () => [],
  size: 5,
  divider: false,
  withClickableLogo: false,
  selected: () => [],
  selectable: false,
  pinnable: false,
  pinned: () => [],
  withFiat: false,
  withTabindex: true,
});

const attrs = useAttrs();
const slots = useSlots();

const { t } = useTranslation();

const wrap = ref<InstanceType<typeof RecycleScroller> | null>(null);
const barSize = ref(0);
const barMove = ref(0);
const scrollHeight = ref(0);

const forwardedSlots = computed(() => Object.keys(slots).filter((name) => name !== 'list-empty'));
const rootAttrs = computed(() => {
  return Object.fromEntries(Object.entries(attrs).filter(([key]) => !key.startsWith('on')));
});

const invokeListener = (handler: unknown, asset: Asset, args: unknown[]): void => {
  if (Array.isArray(handler)) {
    handler.forEach((fn) => {
      if (typeof fn === 'function') {
        fn(asset, ...args);
      }
    });
  } else if (typeof handler === 'function') {
    handler(asset, ...args);
  }
};

const wrapListeners = (asset: Asset): Record<string, (...args: unknown[]) => void> => {
  const entries = Object.entries(attrs).filter(([key]) => key.startsWith('on'));

  return entries.reduce<Record<string, (...args: unknown[]) => void>>((result, [key, handler]) => {
    const eventName = key.slice(2);
    const normalized = eventName.charAt(0).toLowerCase() + eventName.slice(1);

    if (!handler) {
      return result;
    }

    result[normalized] = (...args: unknown[]) => {
      invokeListener(handler, asset, args);
    };

    return result;
  }, {});
};

const getScrollerEl = () => wrap.value?.$el as HTMLDivElement | undefined;

const isEmptyList = computed(() => props.assets.length === 0);

const itemHeightCssVar = computed(() => `--s-asset-item-height${props.withFiat ? '--fiat' : ''}`);

const itemHeightValue = computed(() => parseFloat(getCssVariableValue(itemHeightCssVar.value)) + Number(props.divider));

const gutterOffset = computed(() => (props.assets.length > props.size ? -1 * getScrollbarWidth() : 0));

const style = computed(() => {
  const dividersHeight = props.divider ? props.size : 0;

  return {
    height: `calc(var(${itemHeightCssVar.value}) * ${props.size} + ${dividersHeight}px)`,
    marginRight: `${gutterOffset.value}px`,
  };
});

const updateScrollbar = () => {
  const el = getScrollerEl();
  if (!el) return;

  barSize.value = (el.clientHeight * 100) / el.scrollHeight;
  scrollHeight.value = el.scrollHeight;
};

const handleScroll = () => {
  const el = getScrollerEl();
  if (!el) return;

  barMove.value = (el.scrollTop * 100) / el.clientHeight;
};

const scrollTo = (value: number) => {
  const el = getScrollerEl();
  if (!el) return;

  el.scrollTop = value;
};

const isSelected = (asset: Asset) => props.selected.some((selectedAsset) => selectedAsset.address === asset.address);

const waitForAssetsListReady = async (): Promise<void> => {
  const scroller = wrap.value as (InstanceType<typeof RecycleScroller> & { ready?: boolean }) | null;

  if (scroller?.ready) return;

  await delay();
  await waitForAssetsListReady();
};

const rerenderScrollbar = async () => {
  await nextTick();
  updateScrollbar();
  handleScroll();
};

watch(
  () => props.size,
  async () => {
    await rerenderScrollbar();
  }
);

watch(
  () => props.assets,
  async () => {
    await rerenderScrollbar();
  }
);

onMounted(async () => {
  await waitForAssetsListReady();
  updateScrollbar();
});

defineExpose({
  wrap,
  barSize,
  barMove,
  scrollHeight,
  forwardedSlots,
  wrapListeners,
  isEmptyList,
  itemHeightValue,
  gutterOffset,
  style,
  handleScroll,
  scrollTo,
  isSelected,
});
</script>

<style lang="scss">
.asset-list {
  position: relative;
  overflow: hidden;

  &-empty {
    margin-top: $basic-spacing-medium;
    text-align: center;
    @include hint-text;
  }

  &-inner {
    &.hidden-scrollbar {
      scrollbar-width: none;

      &::-webkit-scrollbar {
        width: 0;
        height: 0;
      }
    }
  }

  .el-divider {
    margin: 0;
  }

  .scrollbar {
    opacity: 0;
    transition: opacity 0.12s ease-out;
  }

  &:hover,
  &:focus,
  &:active {
    .scrollbar {
      opacity: 1;
      transition: opacity 0.34s ease-out;
    }
  }

  .s-action {
    margin-right: 1px;
  }
}
</style>
