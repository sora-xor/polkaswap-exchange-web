import {
  Teleport,
  cloneVNode,
  computed,
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type CSSProperties,
  type PropType,
  type VNode,
} from 'vue';

type PopoverTrigger = 'click' | 'hover' | 'focus' | 'manual';

const DEFAULT_OFFSET = 8;
const VIEWPORT_PADDING = 8;

const SUPPORTED_PLACEMENTS = new Set([
  'top',
  'top-start',
  'top-end',
  'bottom',
  'bottom-start',
  'bottom-end',
  'left',
  'left-start',
  'left-end',
  'right',
  'right-start',
  'right-end',
]);

/**
 * Safely converts unknown values to finite non-negative numbers.
 */
function toDelay(value: string | number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

/**
 * Resolves a DOM element from either a raw element ref or a Vue component instance.
 */
function resolveElement(candidate: unknown): HTMLElement | null {
  if (candidate instanceof HTMLElement) return candidate;

  const maybeComponent = candidate as { $el?: unknown } | null;
  if (maybeComponent?.$el instanceof HTMLElement) {
    return maybeComponent.$el;
  }

  return null;
}

/**
 * Extracts base placement (top/bottom/left/right) and alignment suffix.
 */
function parsePlacement(rawPlacement: string): { base: string; align: string } {
  const normalized = SUPPORTED_PLACEMENTS.has(rawPlacement) ? rawPlacement : 'bottom';
  const [base, align = 'center'] = normalized.split('-');
  return { base, align };
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function mergeClassNames(base: string[], extraClass: unknown): Array<string> {
  if (!extraClass) return base;
  if (typeof extraClass === 'string') return [...base, ...extraClass.split(/\s+/).filter(Boolean)];
  if (Array.isArray(extraClass))
    return [...base, ...extraClass.filter((item): item is string => typeof item === 'string')];
  return base;
}

export default defineComponent({
  name: 'ElPopover',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    visible: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    value: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    trigger: {
      type: String as PropType<PopoverTrigger>,
      default: 'click',
    },
    placement: {
      type: String,
      default: 'bottom',
    },
    popperClass: {
      type: String,
      default: '',
    },
    visibleArrow: {
      type: Boolean,
      default: true,
    },
    tabindex: {
      type: [String, Number] as PropType<string | number | undefined>,
      default: undefined,
    },
    openDelay: {
      type: [String, Number],
      default: 0,
    },
    closeDelay: {
      type: [String, Number],
      default: 0,
    },
  },
  emits: ['update:modelValue', 'update:visible', 'input', 'visible-change', 'show', 'hide'],
  setup(props, { attrs, emit, slots, expose }) {
    const referenceEl = ref<HTMLElement | null>(null);
    const popperEl = ref<HTMLElement | null>(null);
    const localVisible = ref(false);
    const hoverTrigger = ref(false);
    const hoverPopper = ref(false);
    const popperStyle = ref<CSSProperties>({
      position: 'fixed',
      top: '-99999px',
      left: '-99999px',
      zIndex: 2100,
    });

    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const normalizedTrigger = computed<PopoverTrigger>(() => {
      const value = props.trigger;
      if (value === 'click' || value === 'hover' || value === 'focus' || value === 'manual') return value;
      return 'click';
    });

    const controlledVisible = computed<boolean | undefined>(() => {
      if (typeof props.modelValue === 'boolean') return props.modelValue;
      if (typeof props.visible === 'boolean') return props.visible;
      if (typeof props.value === 'boolean') return props.value;
      return undefined;
    });

    const isControlled = computed<boolean>(() => typeof controlledVisible.value === 'boolean');
    const isVisible = computed<boolean>(() =>
      isControlled.value ? Boolean(controlledVisible.value) : localVisible.value
    );
    const popperClassNames = computed<Array<string>>(() =>
      mergeClassNames(['el-popover', 'el-popper'], [props.popperClass, attrs.class].filter(Boolean).join(' '))
    );

    const placement = computed(() => (SUPPORTED_PLACEMENTS.has(props.placement) ? props.placement : 'bottom'));

    const clearTimers = (): void => {
      if (showTimer) {
        clearTimeout(showTimer);
        showTimer = null;
      }
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    };

    const emitModelUpdates = (next: boolean): void => {
      emit('update:modelValue', next);
      emit('update:visible', next);
      emit('input', next);
    };

    const setVisible = (next: boolean): void => {
      if (!isControlled.value) {
        localVisible.value = next;
      }
      emitModelUpdates(next);
    };

    const show = (): void => setVisible(true);
    const hide = (): void => setVisible(false);
    const toggle = (): void => setVisible(!isVisible.value);

    const updatePosition = (): void => {
      const trigger = referenceEl.value;
      const popper = popperEl.value;
      if (!trigger || !popper) return;

      const triggerRect = trigger.getBoundingClientRect();
      const popperRect = popper.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const { base, align } = parsePlacement(placement.value);

      let left = triggerRect.left + triggerRect.width / 2 - popperRect.width / 2;
      let top = triggerRect.top + triggerRect.height / 2 - popperRect.height / 2;

      if (base === 'top') top = triggerRect.top - popperRect.height - DEFAULT_OFFSET;
      if (base === 'bottom') top = triggerRect.bottom + DEFAULT_OFFSET;
      if (base === 'left') left = triggerRect.left - popperRect.width - DEFAULT_OFFSET;
      if (base === 'right') left = triggerRect.right + DEFAULT_OFFSET;

      if (base === 'top' || base === 'bottom') {
        if (align === 'start') left = triggerRect.left;
        if (align === 'end') left = triggerRect.right - popperRect.width;
      }

      if (base === 'left' || base === 'right') {
        if (align === 'start') top = triggerRect.top;
        if (align === 'end') top = triggerRect.bottom - popperRect.height;
      }

      left = clamp(
        left,
        VIEWPORT_PADDING,
        Math.max(VIEWPORT_PADDING, viewportWidth - popperRect.width - VIEWPORT_PADDING)
      );
      top = clamp(
        top,
        VIEWPORT_PADDING,
        Math.max(VIEWPORT_PADDING, viewportHeight - popperRect.height - VIEWPORT_PADDING)
      );

      popperStyle.value = {
        ...popperStyle.value,
        top: `${Math.round(top)}px`,
        left: `${Math.round(left)}px`,
      };
    };

    const scheduleShow = (): void => {
      clearTimers();
      showTimer = setTimeout(show, toDelay(props.openDelay));
    };

    const scheduleHide = (): void => {
      clearTimers();
      hideTimer = setTimeout(() => {
        if (!hoverTrigger.value && !hoverPopper.value) {
          hide();
        }
      }, toDelay(props.closeDelay));
    };

    const handleReferenceClick = (): void => {
      if (normalizedTrigger.value !== 'click') return;
      toggle();
    };

    const handleReferenceMouseEnter = (): void => {
      hoverTrigger.value = true;
      if (normalizedTrigger.value === 'hover') {
        scheduleShow();
      }
    };

    const handleReferenceMouseLeave = (): void => {
      hoverTrigger.value = false;
      if (normalizedTrigger.value === 'hover') {
        scheduleHide();
      }
    };

    const handleReferenceFocusIn = (): void => {
      if (normalizedTrigger.value === 'focus') {
        show();
      }
    };

    const handleReferenceFocusOut = (event: FocusEvent): void => {
      if (normalizedTrigger.value !== 'focus') return;
      const related = event.relatedTarget as Node | null;
      const popper = popperEl.value;
      if (related && popper?.contains(related)) return;
      hide();
    };

    const handlePopperMouseEnter = (): void => {
      hoverPopper.value = true;
      if (normalizedTrigger.value === 'hover') {
        clearTimers();
      }
    };

    const handlePopperMouseLeave = (): void => {
      hoverPopper.value = false;
      if (normalizedTrigger.value === 'hover') {
        scheduleHide();
      }
    };

    const handleDocumentPointerDown = (event: MouseEvent): void => {
      if (!isVisible.value || normalizedTrigger.value !== 'click') return;

      const target = event.target as Node | null;
      const trigger = referenceEl.value;
      const popper = popperEl.value;
      if (!target || !trigger || !popper) return;
      if (trigger.contains(target) || popper.contains(target)) return;

      hide();
    };

    const handleViewportUpdate = (): void => {
      if (!isVisible.value) return;
      updatePosition();
    };

    watch(
      isVisible,
      (next, prev) => {
        if (next === prev) return;

        emit('visible-change', next);
        emit(next ? 'show' : 'hide');

        if (next) {
          nextTick(() => {
            updatePosition();
          });
        }
      },
      { flush: 'post' }
    );

    onMounted(() => {
      window.addEventListener('resize', handleViewportUpdate);
      window.addEventListener('scroll', handleViewportUpdate, true);
      window.addEventListener('mousedown', handleDocumentPointerDown, true);
    });

    onBeforeUnmount(() => {
      clearTimers();
      window.removeEventListener('resize', handleViewportUpdate);
      window.removeEventListener('scroll', handleViewportUpdate, true);
      window.removeEventListener('mousedown', handleDocumentPointerDown, true);
    });

    expose({
      doClose: hide,
      doShow: show,
      doToggle: toggle,
      updatePopper: updatePosition,
      get popperElm() {
        return popperEl.value;
      },
    });

    const setReference = (instance: unknown): void => {
      referenceEl.value = resolveElement(instance);
    };

    const setPopper = (instance: unknown): void => {
      popperEl.value = resolveElement(instance);
    };

    return () => {
      const referenceNodes = slots.reference?.() ?? [];
      const referenceVNode = referenceNodes.find(Boolean) as VNode | undefined;

      const clonedReference = referenceVNode
        ? cloneVNode(
            referenceVNode,
            {
              ref: setReference,
              tabindex: props.tabindex,
              onClick: handleReferenceClick,
              onMouseenter: handleReferenceMouseEnter,
              onMouseleave: handleReferenceMouseLeave,
              onFocusin: handleReferenceFocusIn,
              onFocusout: handleReferenceFocusOut,
            },
            true
          )
        : null;

      const popperNode =
        isVisible.value && slots.default
          ? h(
              Teleport,
              { to: 'body' },
              h(
                'div',
                {
                  ref: setPopper,
                  class: popperClassNames.value,
                  style: popperStyle.value,
                  'x-placement': placement.value,
                  onMouseenter: handlePopperMouseEnter,
                  onMouseleave: handlePopperMouseLeave,
                },
                [props.visibleArrow ? h('div', { class: 'popper__arrow' }) : null, slots.default()]
              )
            )
          : null;

      return [clonedReference, popperNode];
    };
  },
});
