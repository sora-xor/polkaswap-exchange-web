import type { Ref, PropType } from 'vue';
import { cloneVNode, nextTick } from 'vue';
import type { Placement, Instance, State } from '@popperjs/core';
import { placements } from '@popperjs/core';
import type { MaybeElementRef } from '@vueuse/core';
import { not, or } from '@vueuse/math';
import { usePopper } from '@soramitsu-ui/ui/composables/popper';
import type { PopoverApi } from './api';
import { POPOVER_API_KEY } from './api';
import type { Except } from 'type-fest';

function useDelayNumberGreaterThanOrEqualToZero(reactiveGetter: () => string | number): Ref<number> {
  return computed(() => {
    const val = reactiveGetter();
    const num = typeof val === 'number' ? val : Number(val);
    return Math.max(0, num);
  });
}

function useNumberCast(reactiveGetter: () => string | number): Ref<number> {
  return computed(() => Number(reactiveGetter()));
}

function useDelayedShow(show: Ref<boolean>, delays: { show: Ref<number>; hide: Ref<number> }): Ref<boolean> {
  const delayed = ref(show.value);

  debouncedWatch(
    show,
    (flag) => {
      if (flag) {
        delayed.value = true;
      }
    },
    { debounce: delays.show }
  );

  debouncedWatch(
    not(show),
    (flag) => {
      if (flag) {
        delayed.value = false;
      }
    },
    { debounce: delays.hide }
  );

  return delayed;
}

function createSanitizedTemplateRef(): { rawRef: Ref<any>; sanitizedRef: Ref<null | HTMLElement> } {
  const rawRef: MaybeElementRef = ref(null);

  const sanitizedRef = eagerComputed(() => {
    const el = unrefElement(rawRef);
    if (el && el instanceof HTMLElement) return el;
    return null;
  });

  return { rawRef, sanitizedRef };
}

function useElHover(elemRef: Ref<null | Element>): {
  hover: Ref<boolean>;
  listeners: { onMouseenter: () => void; onMouseleave: () => void };
} {
  const hover = ref(false);

  watch(elemRef, (el, oldEl) => {
    if (oldEl) hover.value = false;
  });

  return {
    hover,
    listeners: {
      onMouseenter: () => {
        hover.value = true;
      },
      onMouseleave: () => {
        hover.value = false;
      },
    },
  };
}

function defineReadonlyApi(
  raw: {
    show: Ref<boolean>;
    popper: Ref<Instance | null>;
  } & Except<PopoverApi, 'show' | 'popper'>
): PopoverApi {
  const api: PopoverApi = reactive(raw);
  return readonly(api) as PopoverApi;
}

/**
 * HOC-wrapper for `@popperjs/core` with many convenient features out of the box:
 *
 * - Automatic popup at hover (default), click, focus
 * - ...or manual control over visibility
 * - Listens for clicks outside of popper
 * - Show/hide delay (optional)
 *
 * Partially based on:
 * https://github.com/TuSimple/naive-ui/blob/195c94a0c3610ee4492676dbbe0e781333658218/src/popover/src/Popover.tsx
 */
export default /* @__PURE__ */ defineComponent({
  name: 'SPopover',
  props: {
    show: Boolean,
    trigger: {
      type: String as PropType<'manual' | 'hover' | 'click'>,
      default: 'hover',
      validator: (v: unknown) => v === 'manual' || v === 'hover' || v === 'click',
    },
    placement: {
      type: String as PropType<Placement>,
      default: 'auto',
      validator: (v: unknown) => placements.includes(v as any),
    },
    skidding: {
      type: [Number, String],
      default: 0,
    },
    distance: {
      type: [Number, String],
      default: 0,
    },
    showDelay: {
      type: [Number, String],
      default: 0,
    },
    hideDelay: {
      type: [Number, String],
      default: 0,
    },
    sameWidth: Boolean,
  },
  emits: ['update:show', 'click-outside'],
  setup(props, { slots, emit }) {
    const showDelay = useDelayNumberGreaterThanOrEqualToZero(() => props.showDelay);
    const hideDelay = useDelayNumberGreaterThanOrEqualToZero(() => props.hideDelay);
    const skidding = useNumberCast(() => props.skidding);
    const distance = useNumberCast(() => props.distance);

    const { rawRef: triggerRawRef, sanitizedRef: triggerRef } = createSanitizedTemplateRef();
    const { rawRef: popperRawRef, sanitizedRef: popperNativeRef } = createSanitizedTemplateRef();

    // popper ref overrides for edge cases
    const popperRefOverrides = reactive(new Set<HTMLElement>());
    const somePopperRefOverride = computed(() => {
      if (popperRefOverrides.size) {
        // just return first entry

        for (const i of popperRefOverrides) return i;
      }
      return null;
    });
    const popperRef = eagerComputed(() => somePopperRefOverride.value || popperNativeRef.value);

    const optionsState = reactive({
      placement: computed(() => props.placement),
      modifiers: [
        {
          name: 'offset',
          options: { offset: computed(() => [skidding.value, distance.value]) },
        },
        shallowReactive({
          name: 'sameWidth',
          enabled: props.sameWidth,
          phase: 'beforeWrite' as const,
          requires: ['computeStyles'],
          fn: ({ state }: { state: State }) => {
            state.styles.popper.width = `${state.rects.reference.width}px`;
          },
          effect: ({ state }: { state: State }) => {
            if (state.elements.reference instanceof HTMLElement) {
              state.elements.popper.style.width = `${state.elements.reference.offsetWidth}px`;
            }
          },
        }),
      ],
    });

    const { instance } = usePopper({
      referenceElem: triggerRef,
      popperElem: popperRef,
      options: optionsState,
    });

    watch([skidding, distance], () => {
      const inst = instance.value;
      if (!inst) return;

      inst.setOptions({
        ...inst.state.options,
        modifiers: (inst.state.options.modifiers || []).map((modifier: any) => {
          if (modifier?.name === 'offset') {
            return {
              ...modifier,
              options: {
                ...modifier.options,
                offset: [skidding.value, distance.value],
              },
            };
          }
          return modifier;
        }),
      });
    });

    const show = ref(props.show);
    let syncingShow = false;

    watch(
      () => props.show,
      (value) => {
        if (syncingShow) return;
        syncingShow = true;
        show.value = value;
        nextTick(() => {
          syncingShow = false;
        });
      }
    );

    watch(show, (value) => {
      if (syncingShow) return;
      if (!Object.is(value, props.show)) {
        emit('update:show', value);
      }
    });
    const showDelayed = useDelayedShow(show, { show: showDelay, hide: hideDelay });
    const showFinal = showDelayed;

    const { hover: triggerHover, listeners: triggerHoverListeners } = useElHover(triggerRef);
    const { hover: popperHover, listeners: popperHoverListeners } = useElHover(popperRef);
    const sharedHover = or(triggerHover, popperHover);

    useResizeObserver(triggerRef, () => {
      instance.value?.update();
    });

    debouncedWatch(
      () => props.trigger === 'hover' && [sharedHover.value],
      (maybeHover) => {
        if (maybeHover) {
          const [val] = maybeHover;
          show.value = val;
        }
      },
      { debounce: 50 }
    );

    function onTriggerClick() {
      if (props.trigger === 'click') {
        show.value = !show.value;
      }
    }

    onClickOutside(popperRef, (ev) => {
      const doesPathIncludeTrigger = ev.composedPath().includes(unrefElement(triggerRef) as any);
      if (!doesPathIncludeTrigger) {
        emit('click-outside');
        if (props.trigger === 'click') {
          show.value = false;
        }
      }
    });

    const api = defineReadonlyApi({
      show: showFinal,
      popper: instance,
      addPopperRefOverride: (el) => popperRefOverrides.add(el),
      deletePopperRefOverride: (el) => popperRefOverrides.delete(el),
    });

    provide(POPOVER_API_KEY, api);

    return () => {
      let trigger;
      {
        if (!slots.trigger) {
          throw new Error('"trigger" slot is required');
        }

        const nodes = slots.trigger();
        if (nodes.length !== 1) {
          throw new Error('"trigger" slot should render exact 1 element');
        }
        [trigger] = nodes;
      }

      let popper;

      if (!slots.popper) {
        popper = null;
      } else {
        const nodes = slots.popper(api);
        if (!nodes.length) {
          popper = null;
        } else if (nodes.length === 1) {
          [popper] = nodes;
        } else {
          throw new Error('"popper" slot should return either nothing or the only 1 element');
        }
      }

      return [
        cloneVNode(
          trigger,
          {
            ref: triggerRawRef,
            ...triggerHoverListeners,
            onClick: onTriggerClick,
          },
          true
        ),
        popper &&
          cloneVNode(
            popper,
            {
              ref: popperRawRef,
              ...popperHoverListeners,
            },
            true
          ),
      ];
    };
  },
});
