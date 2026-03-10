<script setup lang="ts">
import {
  Comment,
  Fragment,
  Text,
  cloneVNode,
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  useSlots,
  type Component,
  type CSSProperties,
  type VNode,
} from 'vue';

defineOptions({
  name: 'STabs',
});

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    value?: string;
    type?: string;
    background?: string;
  }>(),
  {
    modelValue: '',
    value: '',
    type: '',
    background: 'primary',
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'input', value: string): void;
}>();

type TabItem = {
  key: string;
  name: string;
  label: string;
  disabled: boolean;
  panelRenderer: Component | null;
};

const slots = useSlots();

const toNodeArray = (nodes: unknown): Array<VNode | null | undefined> => {
  if (Array.isArray(nodes)) return nodes as Array<VNode | null | undefined>;
  if (!nodes) return [];
  return [nodes as VNode];
};

const flattenVNodes = (nodes: unknown): Array<VNode> => {
  const result: Array<VNode> = [];

  toNodeArray(nodes).forEach((node) => {
    if (!node) return;
    if (node.type === Comment) return;
    if (node.type === Text && typeof node.children === 'string' && !node.children.trim()) return;

    if (node.type === Fragment) {
      result.push(...flattenVNodes(node.children));
      return;
    }

    result.push(node);
  });

  return result;
};

const stringifyNodes = (nodes: Array<VNode>): string => {
  return nodes
    .map((node) => {
      if (typeof node.children === 'string') return node.children;
      if (Array.isArray(node.children)) return stringifyNodes(flattenVNodes(node.children as Array<VNode>));
      return '';
    })
    .join('')
    .trim();
};

const isTabNode = (node: VNode): boolean => {
  const nodeType = node.type as { name?: string; __name?: string } | string;
  const nodeName = typeof nodeType === 'string' ? nodeType : nodeType?.name || nodeType?.__name;

  return nodeName === 'STab' || Boolean((node.props as Record<string, unknown> | null | undefined)?.name);
};

const defaultNodes = computed(() => flattenVNodes(slots.default?.() ?? []));

const parsedTabs = computed<Array<TabItem>>(() => {
  return defaultNodes.value
    .filter((node) => isTabNode(node))
    .map((node, index) => {
      const rawProps = (node.props as Record<string, unknown> | null | undefined) ?? {};
      const slotObject =
        node.children && typeof node.children === 'object' && 'default' in node.children
          ? (node.children as { default?: () => Array<VNode> })
          : null;
      const slotNodes = slotObject?.default ? flattenVNodes(slotObject.default()) : [];

      const name = String(rawProps.name ?? node.key ?? `tab-${index}`);
      const hasLabelProp = rawProps.label !== undefined && rawProps.label !== null && String(rawProps.label).length > 0;
      const label = hasLabelProp ? String(rawProps.label) : stringifyNodes(slotNodes);
      const disabled =
        rawProps.disabled === '' ||
        rawProps.disabled === true ||
        rawProps.disabled === 'true' ||
        rawProps.disabled === 1;
      const panelRenderer =
        hasLabelProp && slotObject?.default
          ? ({
              render: () => flattenVNodes(slotObject.default?.() ?? []),
            } as Component)
          : null;

      return {
        key: String(node.key ?? name),
        name,
        label,
        disabled,
        panelRenderer,
      };
    });
});

const activeTab = computed(() => {
  const requested = props.modelValue || props.value;
  if (requested && parsedTabs.value.some((tab) => tab.name === requested)) {
    return requested;
  }

  return parsedTabs.value.find((tab) => !tab.disabled)?.name ?? '';
});

const orderedContentRenderers = computed<Array<{ key: string; renderer: Component }>>(() => {
  return defaultNodes.value.reduce<Array<{ key: string; renderer: Component }>>((buffer, node, index) => {
    if (!isTabNode(node)) {
      buffer.push({
        key: `extra-${index}`,
        renderer: {
          render: () => [cloneVNode(node)],
        } as Component,
      });
      return buffer;
    }

    const rawProps = (node.props as Record<string, unknown> | null | undefined) ?? {};
    const name = String(rawProps.name ?? node.key ?? `tab-${index}`);
    const hasLabelProp = rawProps.label !== undefined && rawProps.label !== null && String(rawProps.label).length > 0;
    const slotObject =
      node.children && typeof node.children === 'object' && 'default' in node.children
        ? (node.children as { default?: () => Array<VNode> })
        : null;

    if (!(name === activeTab.value && hasLabelProp && slotObject?.default)) return buffer;

    buffer.push({
      key: `panel-${name}-${index}`,
      renderer: {
        render: () => flattenVNodes(slotObject.default?.() ?? []),
      } as Component,
    });

    return buffer;
  }, []);
});

const roundedTypeClass = computed(() => (props.type ? `s-${props.type}` : null));

const navRef = ref<HTMLElement | null>(null);
const tabRefs = ref<Record<string, HTMLElement | null>>({});
const viewportTick = ref(0);

const handleResize = (): void => {
  viewportTick.value += 1;
};

const setTabRef =
  (name: string) =>
  (el: Element | null): void => {
    tabRefs.value[name] = el as HTMLElement | null;
  };

onMounted(() => {
  if (typeof window === 'undefined') return;

  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return;

  window.removeEventListener('resize', handleResize);
});

const activeBarStyle = computed<CSSProperties>(() => {
  // Recompute metrics on viewport changes to keep active-bar alignment in sync.
  viewportTick.value;

  const navElement = navRef.value;
  const activeElement = tabRefs.value[activeTab.value];

  if (navElement && activeElement) {
    const navRect = navElement.getBoundingClientRect();
    const activeRect = activeElement.getBoundingClientRect();
    const styles = getComputedStyle(activeElement);
    const leftPadding = parseFloat(styles.paddingLeft) || 0;
    const rightPadding = parseFloat(styles.paddingRight) || 0;
    const width = Math.max(activeRect.width - leftPadding - rightPadding, 0);
    const offset = activeRect.left - navRect.left + leftPadding;

    return {
      width: `${width}px`,
      transform: `translateX(${offset}px)`,
    };
  }

  const count = parsedTabs.value.length;
  if (!count) return {};

  const activeIndex = parsedTabs.value.findIndex((tab) => tab.name === activeTab.value);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;

  return {
    width: `${100 / count}%`,
    transform: `translateX(${safeIndex * 100}%)`,
  };
});

const emitSelection = (tabName: string, isDisabled: boolean): void => {
  if (isDisabled) return;

  emit('update:modelValue', tabName);
  emit('input', tabName);
};

const activateByKeyboard = (event: KeyboardEvent, tabName: string, isDisabled: boolean): void => {
  const key = event.key.toLowerCase();
  if (key !== 'enter' && key !== ' ') return;

  event.preventDefault();
  emitSelection(tabName, isDisabled);
};
</script>

<template>
  <div role="tablist" class="s-tabs el-tabs el-tabs--top neumorphic s-border-radius-small" :class="[roundedTypeClass]">
    <div class="el-tabs__header is-top">
      <div class="el-tabs__nav-wrap is-top">
        <div class="el-tabs__nav-scroll">
          <div ref="navRef" class="el-tabs__nav is-top">
            <div class="el-tabs__active-bar is-top" :style="activeBarStyle"></div>

            <div
              v-for="tab in parsedTabs"
              :key="tab.key"
              :ref="setTabRef(tab.name)"
              role="tab"
              class="el-tabs__item is-top"
              :class="{
                'is-active': tab.name === activeTab,
                'is-disabled': tab.disabled,
              }"
              :aria-selected="tab.name === activeTab"
              :tabindex="tab.disabled ? -1 : 0"
              @click="emitSelection(tab.name, tab.disabled)"
              @keydown="activateByKeyboard($event, tab.name, tab.disabled)"
            >
              {{ tab.label }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="el-tabs__content">
      <component v-for="entry in orderedContentRenderers" :is="entry.renderer" :key="entry.key" />
    </div>
  </div>
</template>

<style lang="scss">
.s-tabs .el-tabs__nav-wrap {
  position: relative;
  overflow: hidden;
}

.s-tabs .el-tabs__nav-scroll {
  overflow: hidden;
}

.s-tabs .el-tabs__nav {
  position: relative;
  display: block;
  white-space: nowrap;
}

.s-tabs .el-tabs__active-bar {
  position: absolute;
  z-index: 1;
  left: 0;
  bottom: 0;
  height: 2px;
  transition:
    transform 0.3s ease,
    width 0.3s ease;
  pointer-events: none;
}
</style>
