import {
  Comment,
  Fragment,
  Teleport,
  Text,
  cloneVNode,
  computed,
  defineComponent,
  h,
  isVNode,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type CSSProperties,
  type PropType,
  type VNode,
} from 'vue';
import { useResolvedOverlayTarget, type OverlayTarget } from '@/lib/soramitsu-ui/composables/overlayTarget';

type PopoverTrigger = 'click' | 'hover' | 'focus' | 'manual';

const DEFAULT_OFFSET = 8;
const VIEWPORT_PADDING = 8;
const VIEWPORT_BOUNDS_STYLE: CSSProperties = {
  maxWidth: `calc(100vw - ${VIEWPORT_PADDING * 2}px)`,
  maxHeight: `calc(100vh - ${VIEWPORT_PADDING * 2}px)`,
  overflowX: 'auto',
  overflowY: 'auto',
  boxSizing: 'border-box',
  overscrollBehavior: 'contain',
};

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

/**
 * Finds the first element/component vnode that can be used as a popover trigger.
 * Skips whitespace text/comment nodes and unwraps fragments.
 */
function resolveReferenceVNode(nodes: Array<unknown>): VNode | null {
  for (const node of nodes) {
    if (!isVNode(node)) continue;
    if (node.type === Text || node.type === Comment) continue;
    if (node.type === Fragment) {
      const fragmentChildren = Array.isArray(node.children) ? node.children : [];
      const nested = resolveReferenceVNode(fragmentChildren);
      if (nested) return nested;
      continue;
    }
    return node;
  }

  return null;
}

export default defineComponent({
  name: 'SPopoverPanel',
  inheritAttrs: false,
  props: {
    show: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    disabled: {
      type: Boolean,
      default: false,
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
    teleportTo: {
      type: [String, Object] as PropType<OverlayTarget>,
      default: 'body',
    },
  },
  emits: ['update:show', 'show', 'hide'],
  setup(props, { attrs, emit, slots, expose }) {
    const referenceEl = ref<HTMLElement | null>(null);
    const popperEl = ref<HTMLElement | null>(null);
    const localVisible = ref(false);
    const hoverTrigger = ref(false);
    const hoverPopper = ref(false);
    const isHeaderMenuSlidingIn = ref(false);
    const popperStyle = ref<CSSProperties>({
      position: 'fixed',
      top: '-99999px',
      left: '-99999px',
      zIndex: 2100,
      ...VIEWPORT_BOUNDS_STYLE,
    });

    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let headerMenuSlideTimer: ReturnType<typeof setTimeout> | null = null;
    let activeReferenceEl: HTMLElement | null = null;
    let popperResizeObserver: ResizeObserver | null = null;
    let eventTargetWindow: Window | null = null;
    let eventTargetSupportsPointerEvents = false;

    const onReferenceClick = (): void => {
      handleReferenceClick();
    };

    const onReferenceMouseEnter = (): void => {
      handleReferenceMouseEnter();
    };

    const onReferenceMouseLeave = (): void => {
      handleReferenceMouseLeave();
    };

    const onReferenceFocusIn = (): void => {
      handleReferenceFocusIn();
    };

    const onReferenceFocusOut = (event: FocusEvent): void => {
      handleReferenceFocusOut(event);
    };

    const normalizedTrigger = computed<PopoverTrigger>(() => {
      const value = props.trigger;
      if (value === 'click' || value === 'hover' || value === 'focus' || value === 'manual') return value;
      return 'click';
    });

    const controlledVisible = computed<boolean | undefined>(() => {
      return typeof props.show === 'boolean' ? props.show : undefined;
    });

    const isControlled = computed<boolean>(() => typeof controlledVisible.value === 'boolean');
    const isVisible = computed<boolean>(() =>
      isControlled.value ? Boolean(controlledVisible.value) : localVisible.value
    );
    const isHeaderMenuPopover = computed<boolean>(() => props.popperClass.includes('header-menu'));
    const popperClassNames = computed<Array<string>>(() =>
      mergeClassNames(
        isHeaderMenuPopover.value ? ['el-popper'] : ['el-popover', 'el-popper'],
        [props.popperClass, attrs.class, isHeaderMenuSlidingIn.value ? 'slide-in' : ''].filter(Boolean).join(' ')
      )
    );

    const placement = computed(() => (SUPPORTED_PLACEMENTS.has(props.placement) ? props.placement : 'bottom'));
    const resolvedTeleportTo = useResolvedOverlayTarget(computed(() => props.teleportTo));

    const getReferenceWindow = (): Window => {
      return referenceEl.value?.ownerDocument?.defaultView ?? window;
    };

    const unbindWindowListeners = (): void => {
      if (!eventTargetWindow) return;

      eventTargetWindow.removeEventListener('resize', handleWindowResize);
      eventTargetWindow.removeEventListener('scroll', handleViewportScroll, true);
      if (eventTargetSupportsPointerEvents) {
        eventTargetWindow.removeEventListener('pointerdown', handleDocumentPointerDown, true);
      } else {
        eventTargetWindow.removeEventListener('mousedown', handleDocumentPointerDown, true);
        eventTargetWindow.removeEventListener('touchstart', handleDocumentPointerDown, true);
      }
      eventTargetWindow.removeEventListener('keydown', handleDocumentKeyDown, true);
      eventTargetWindow.removeEventListener('hashchange', handleNavigationChange);
      eventTargetWindow.removeEventListener('popstate', handleNavigationChange);
      eventTargetWindow = null;
    };

    const bindWindowListeners = (targetWindow: Window): void => {
      if (eventTargetWindow === targetWindow) return;

      unbindWindowListeners();
      eventTargetSupportsPointerEvents = 'PointerEvent' in targetWindow;
      targetWindow.addEventListener('resize', handleWindowResize);
      targetWindow.addEventListener('scroll', handleViewportScroll, true);
      if (eventTargetSupportsPointerEvents) {
        targetWindow.addEventListener('pointerdown', handleDocumentPointerDown, true);
      } else {
        targetWindow.addEventListener('mousedown', handleDocumentPointerDown, true);
        targetWindow.addEventListener('touchstart', handleDocumentPointerDown, true);
      }
      targetWindow.addEventListener('keydown', handleDocumentKeyDown, true);
      targetWindow.addEventListener('hashchange', handleNavigationChange);
      targetWindow.addEventListener('popstate', handleNavigationChange);
      eventTargetWindow = targetWindow;
    };

    const syncWindowListeners = (): void => {
      bindWindowListeners(getReferenceWindow());
    };

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

    const clearHeaderMenuSlideTimer = (): void => {
      if (!headerMenuSlideTimer) return;
      clearTimeout(headerMenuSlideTimer);
      headerMenuSlideTimer = null;
    };

    /**
     * Header menu popper starts from translate(0) and then settles to its base transform.
     * This mirrors the settings panel slide animation on polkaswap.io.
     */
    const startHeaderMenuSlideIn = (): void => {
      if (!isHeaderMenuPopover.value) return;
      clearHeaderMenuSlideTimer();
      isHeaderMenuSlidingIn.value = true;
    };

    const finishHeaderMenuSlideIn = (): void => {
      if (!isHeaderMenuPopover.value) return;
      clearHeaderMenuSlideTimer();

      headerMenuSlideTimer = setTimeout(() => {
        headerMenuSlideTimer = null;
        if (!isVisible.value) return;
        isHeaderMenuSlidingIn.value = false;
      }, 0);
    };

    const disconnectPopperObserver = (): void => {
      popperResizeObserver?.disconnect();
      popperResizeObserver = null;
    };

    const setVisible = (next: boolean): void => {
      if (next && props.disabled) return;

      if (next) {
        startHeaderMenuSlideIn();
      } else {
        clearHeaderMenuSlideTimer();
        isHeaderMenuSlidingIn.value = false;
      }

      if (!isControlled.value) {
        localVisible.value = next;
      }
      emit('update:show', next);
    };

    const show = (): void => setVisible(true);
    const hide = (): void => setVisible(false);
    const toggle = (): void => setVisible(!isVisible.value);

    const updatePosition = (): void => {
      syncWindowListeners();
      const trigger = referenceEl.value;
      const popper = popperEl.value;
      if (!trigger || !popper) return;

      const triggerRect = trigger.getBoundingClientRect();
      const popperRect = popper.getBoundingClientRect();
      const viewportWindow = getReferenceWindow();
      const viewportWidth = viewportWindow.innerWidth;
      const viewportHeight = viewportWindow.innerHeight;
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
        ...VIEWPORT_BOUNDS_STYLE,
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

    const unbindReferenceListeners = (): void => {
      if (!activeReferenceEl) return;

      activeReferenceEl.removeEventListener('click', onReferenceClick);
      activeReferenceEl.removeEventListener('mouseenter', onReferenceMouseEnter);
      activeReferenceEl.removeEventListener('mouseleave', onReferenceMouseLeave);
      activeReferenceEl.removeEventListener('focusin', onReferenceFocusIn);
      activeReferenceEl.removeEventListener('focusout', onReferenceFocusOut);
      activeReferenceEl = null;
    };

    const bindReferenceListeners = (el: HTMLElement | null): void => {
      if (activeReferenceEl === el) {
        return;
      }

      // Bind directly on the resolved element so trigger behavior works
      // even when the reference slot is a component that does not forward attrs/events.
      unbindReferenceListeners();
      if (!el) return;

      if (props.tabindex !== undefined && props.tabindex !== null) {
        el.setAttribute('tabindex', String(props.tabindex));
      }

      el.addEventListener('click', onReferenceClick);
      el.addEventListener('mouseenter', onReferenceMouseEnter);
      el.addEventListener('mouseleave', onReferenceMouseLeave);
      el.addEventListener('focusin', onReferenceFocusIn);
      el.addEventListener('focusout', onReferenceFocusOut);
      activeReferenceEl = el;
      syncWindowListeners();
    };

    const handleReferenceClick = (): void => {
      if (props.disabled) return;
      if (normalizedTrigger.value !== 'click') return;
      syncWindowListeners();
      toggle();
    };

    const handleReferenceMouseEnter = (): void => {
      if (props.disabled) return;
      syncWindowListeners();
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
      if (props.disabled) return;
      syncWindowListeners();
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

    const handleDocumentPointerDown = (event: Event): void => {
      if (!isVisible.value || normalizedTrigger.value !== 'click') return;

      const target = event.target as Node | null;
      const trigger = referenceEl.value;
      const popper = popperEl.value;
      if (!target || !trigger || !popper) return;
      if (trigger.contains(target) || popper.contains(target)) return;

      hide();
    };

    const handleWindowResize = (): void => {
      if (!isVisible.value) return;
      hide();
    };

    const handleViewportScroll = (): void => {
      if (!isVisible.value) return;
      updatePosition();
    };

    const handleDocumentKeyDown = (event: KeyboardEvent): void => {
      if (!isVisible.value) return;
      if (event.key !== 'Escape') return;
      hide();
    };

    const handleNavigationChange = (): void => {
      if (!isVisible.value) return;
      hide();
    };

    const observePopper = (element: HTMLElement | null): void => {
      disconnectPopperObserver();
      if (!element) return;
      const ownerWindow = element.ownerDocument?.defaultView ?? window;
      if (typeof ownerWindow.ResizeObserver === 'undefined') return;

      popperResizeObserver = new ownerWindow.ResizeObserver(() => {
        if (!isVisible.value) return;
        updatePosition();
      });
      popperResizeObserver.observe(element);
    };

    watch(
      isVisible,
      (next, prev) => {
        if (next === prev) return;

        emit(next ? 'show' : 'hide');

        if (next) {
          syncWindowListeners();
          finishHeaderMenuSlideIn();
          nextTick(() => {
            updatePosition();
          });
        } else {
          clearHeaderMenuSlideTimer();
          isHeaderMenuSlidingIn.value = false;
        }
      },
      { flush: 'post' }
    );

    watch(
      () => props.tabindex,
      (value) => {
        if (!activeReferenceEl) return;
        if (value === undefined || value === null) return;
        activeReferenceEl.setAttribute('tabindex', String(value));
      }
    );

    watch(
      () => props.disabled,
      (disabled) => {
        if (disabled && isVisible.value) {
          hide();
        }
      }
    );

    onMounted(() => {
      syncWindowListeners();
    });

    onBeforeUnmount(() => {
      clearTimers();
      clearHeaderMenuSlideTimer();
      unbindReferenceListeners();
      disconnectPopperObserver();
      unbindWindowListeners();
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
      const resolved = resolveElement(instance);
      referenceEl.value = resolved;
      bindReferenceListeners(resolved);
    };

    const setPopper = (instance: unknown): void => {
      const resolved = resolveElement(instance);
      popperEl.value = resolved;
      observePopper(resolved);
    };

    return () => {
      const referenceNodes = slots.reference?.() ?? [];
      const referenceVNode = resolveReferenceVNode(referenceNodes);

      const clonedReference = referenceVNode
        ? cloneVNode(
            referenceVNode,
            {
              ref: setReference,
            },
            true
          )
        : null;

      const popperNode =
        isVisible.value && slots.default
          ? h(
              Teleport,
              { to: resolvedTeleportTo.value, disabled: resolvedTeleportTo.value === null },
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
