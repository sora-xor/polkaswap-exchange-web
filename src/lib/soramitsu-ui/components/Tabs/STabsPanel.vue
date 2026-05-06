<script lang="ts">
import {
  Comment,
  Fragment,
  Text,
  cloneVNode,
  createTextVNode,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  type CSSProperties,
  type PropType,
  type VNode,
} from 'vue';

type TabItem = {
  key: string;
  name: string;
  label: string;
  labelNodes: Array<VNode>;
  disabled: boolean;
};

const toNodeArray = (nodes: unknown): Array<unknown> => {
  if (Array.isArray(nodes)) return nodes;
  if (!nodes) return [];
  return [nodes];
};

const flattenVNodes = (nodes: unknown): Array<VNode> => {
  const result: Array<VNode> = [];

  toNodeArray(nodes).forEach((node) => {
    if (!node) return;
    if (typeof node === 'string' || typeof node === 'number') {
      const text = String(node);
      if (text.trim()) {
        result.push(createTextVNode(text));
      }
      return;
    }
    if (typeof node !== 'object') return;

    const vnode = node as VNode;

    if (vnode.type === Comment) return;
    if (vnode.type === Text && typeof vnode.children === 'string' && !vnode.children.trim()) return;

    if (vnode.type === Fragment) {
      result.push(...flattenVNodes(vnode.children));
      return;
    }

    result.push(vnode);
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

const parseTabs = (defaultNodes: Array<VNode>): Array<TabItem> => {
  return defaultNodes
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

      return {
        key: String(node.key ?? name),
        name,
        label,
        labelNodes: hasLabelProp ? [] : slotNodes,
        disabled,
      };
    });
};

const resolveActiveTab = (parsedTabs: Array<TabItem>, requested: string): string => {
  if (requested && parsedTabs.some((tab) => tab.name === requested)) {
    return requested;
  }

  return parsedTabs.find((tab) => !tab.disabled)?.name ?? '';
};

const buildContentNodes = (defaultNodes: Array<VNode>, activeTab: string): Array<VNode> => {
  return defaultNodes.reduce<Array<VNode>>((buffer, node, index) => {
    if (!isTabNode(node)) {
      buffer.push(cloneVNode(node, { key: `extra-${index}` }));
      return buffer;
    }

    const rawProps = (node.props as Record<string, unknown> | null | undefined) ?? {};
    const name = String(rawProps.name ?? node.key ?? `tab-${index}`);
    const hasLabelProp = rawProps.label !== undefined && rawProps.label !== null && String(rawProps.label).length > 0;
    const slotObject =
      node.children && typeof node.children === 'object' && 'default' in node.children
        ? (node.children as { default?: () => Array<VNode> })
        : null;

    if (!(name === activeTab && hasLabelProp && slotObject?.default)) return buffer;
    const panelNodes = flattenVNodes(slotObject.default());
    panelNodes.forEach((panelNode, panelIndex) => {
      buffer.push(cloneVNode(panelNode, { key: panelNode.key ?? `panel-${name}-${index}-${panelIndex}` }));
    });

    return buffer;
  }, []);
};

export default {
  name: 'STabs',
  props: {
    modelValue: {
      type: String as PropType<string>,
      default: '',
    },
    value: {
      type: String as PropType<string>,
      default: '',
    },
    type: {
      type: String as PropType<string>,
      default: '',
    },
    background: {
      type: String as PropType<string>,
      default: 'primary',
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit, slots }) {
    const navRef = ref<HTMLElement | null>(null);
    const tabRefs = ref<Record<string, HTMLElement | null>>({});
    const viewportTick = ref(0);
    const activeBarTransitionsEnabled = ref(false);
    let metricsObserver: ResizeObserver | null = null;
    const refreshTimeouts = new Set<number>();
    let lastRenderedLayoutSignature = '';
    let lastScheduledLayoutSignature = '';
    let lastRenderedActiveTab = '';

    const handleResize = (): void => {
      viewportTick.value += 1;
    };

    const disconnectMetricsObserver = (): void => {
      metricsObserver?.disconnect();
      metricsObserver = null;
    };

    const clearScheduledRefreshes = (): void => {
      refreshTimeouts.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      refreshTimeouts.clear();
    };

    const observeActiveTabMetrics = (activeTabName: string): void => {
      disconnectMetricsObserver();

      if (typeof ResizeObserver === 'undefined') return;

      const observer = new ResizeObserver(() => {
        handleResize();
      });

      const navElement = navRef.value;
      const activeElement = tabRefs.value[activeTabName];

      if (navElement) observer.observe(navElement);
      if (activeElement) observer.observe(activeElement);

      metricsObserver = observer;
    };

    const scheduleActiveBarRefresh = (activeTabName: string): void => {
      if (typeof window === 'undefined') return;

      clearScheduledRefreshes();

      window.requestAnimationFrame(() => {
        handleResize();
        observeActiveTabMetrics(activeTabName);
        activeBarTransitionsEnabled.value = true;

        // Run a second pass after the first paint to catch late tab width changes.
        window.requestAnimationFrame(() => {
          handleResize();
        });
      });

      [250, 400].forEach((delay) => {
        const timeoutId = window.setTimeout(() => {
          refreshTimeouts.delete(timeoutId);
          handleResize();
          observeActiveTabMetrics(activeTabName);
        }, delay);

        refreshTimeouts.add(timeoutId);
      });
    };

    const setTabRef =
      (name: string) =>
      (el: Element | null): void => {
        tabRefs.value[name] = el as HTMLElement | null;
      };

    const emitSelection = (tabName: string, isDisabled: boolean): void => {
      if (isDisabled) return;

      emit('update:modelValue', tabName);
    };

    const activateByKeyboard = (event: KeyboardEvent, tabName: string, isDisabled: boolean): void => {
      const key = event.key.toLowerCase();
      if (key !== 'enter' && key !== ' ') return;

      event.preventDefault();
      emitSelection(tabName, isDisabled);
    };

    const resolveActiveBarStyle = (parsedTabs: Array<TabItem>, activeTabName: string): CSSProperties => {
      // Recompute metrics on viewport changes to keep active-bar alignment in sync.
      viewportTick.value;

      const navElement = navRef.value;
      const activeElement = tabRefs.value[activeTabName];

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

      const count = parsedTabs.length;
      if (!count) return {};

      const activeIndex = parsedTabs.findIndex((tab) => tab.name === activeTabName);
      const safeIndex = activeIndex >= 0 ? activeIndex : 0;

      return {
        width: `${100 / count}%`,
        transform: `translateX(${safeIndex * 100}%)`,
      };
    };

    onMounted(() => {
      if (typeof window === 'undefined') return;

      window.addEventListener('resize', handleResize);
      void nextTick(() => {
        if (lastRenderedLayoutSignature) {
          scheduleActiveBarRefresh(lastRenderedActiveTab);
        }
      });

      void document.fonts?.ready?.then(() => {
        if (lastRenderedLayoutSignature) {
          scheduleActiveBarRefresh(lastRenderedActiveTab);
        }
      });
    });

    onUpdated(() => {
      if (!lastRenderedLayoutSignature || lastRenderedLayoutSignature === lastScheduledLayoutSignature) return;

      activeBarTransitionsEnabled.value = false;
      lastScheduledLayoutSignature = lastRenderedLayoutSignature;
      void nextTick(() => {
        scheduleActiveBarRefresh(lastRenderedActiveTab);
      });
    });

    onBeforeUnmount(() => {
      if (typeof window === 'undefined') return;

      window.removeEventListener('resize', handleResize);
      clearScheduledRefreshes();
      disconnectMetricsObserver();
    });

    return () => {
      const defaultNodes = flattenVNodes(slots.default?.() ?? []);
      const parsedTabs = parseTabs(defaultNodes);
      const activeTab = resolveActiveTab(parsedTabs, props.modelValue || props.value);
      const contentNodes = buildContentNodes(defaultNodes, activeTab);
      const roundedTypeClass = props.type ? `s-${props.type}` : null;
      const activeBarStyle = resolveActiveBarStyle(parsedTabs, activeTab);
      const layoutSignature = `${parsedTabs
        .map((tab) => `${tab.name}:${tab.label}:${tab.disabled ? '1' : '0'}`)
        .join('|')}::${activeTab}`;

      lastRenderedLayoutSignature = layoutSignature;
      lastRenderedActiveTab = activeTab;

      return h(
        'div',
        {
          role: 'tablist',
          class: ['s-tabs', 'el-tabs', 'el-tabs--top', 'neumorphic', 's-border-radius-small', roundedTypeClass],
        },
        [
          h('div', { class: 'el-tabs__header is-top' }, [
            h('div', { class: 'el-tabs__nav-wrap is-top' }, [
              h('div', { class: 'el-tabs__nav-scroll' }, [
                h(
                  'div',
                  {
                    ref: navRef,
                    class: 'el-tabs__nav is-top',
                  },
                  [
                    h('div', {
                      class: ['el-tabs__active-bar', 'is-top', { 'is-ready': activeBarTransitionsEnabled.value }],
                      style: activeBarStyle,
                    }),
                    ...parsedTabs.map((tab) =>
                      h(
                        'div',
                        {
                          key: tab.key,
                          ref: setTabRef(tab.name),
                          role: 'tab',
                          class: [
                            'el-tabs__item',
                            'is-top',
                            {
                              'is-active': tab.name === activeTab,
                              'is-disabled': tab.disabled,
                            },
                          ],
                          'aria-selected': tab.name === activeTab,
                          tabindex: tab.disabled ? -1 : 0,
                          onClick: () => emitSelection(tab.name, tab.disabled),
                          onKeydown: (event: KeyboardEvent) => activateByKeyboard(event, tab.name, tab.disabled),
                        },
                        tab.labelNodes.length
                          ? tab.labelNodes.map((node, index) =>
                              cloneVNode(node, { key: node.key ?? `${tab.key}-label-${index}` })
                            )
                          : tab.label
                      )
                    ),
                  ]
                ),
              ]),
            ]),
          ]),
          h('div', { class: 'el-tabs__content' }, contentNodes),
        ]
      );
    };
  },
};
</script>

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
  pointer-events: none;
}

.s-tabs .el-tabs__active-bar.is-ready {
  transition:
    transform 0.3s ease,
    width 0.3s ease;
}
</style>
