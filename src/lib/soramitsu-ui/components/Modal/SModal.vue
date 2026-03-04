<script setup lang="ts">
import { computed, provide, readonly, shallowRef, unref, watch, type Ref, type StyleValue } from 'vue';
import { normalizeTransitionAttrs, useCloseOnEsc, useModalVisibility } from './util';
import type { ModalApi } from './api';
import { MODAL_API_KEY } from './api';
import { useFocusTrap } from '@soramitsu-ui/ui/composables/focus-trap';
import type { FocusTrap, Options as FocusTrapOptions } from 'focus-trap';
import { uniqueElementId } from '@soramitsu-ui/ui/util';
import { useBodyScrollLockIfPossible } from '../BodyScrollLockProvider';
import { templateRef } from '@vueuse/core';

type ClassType = object | string | string[];
type StyleType = StyleValue;

interface Props {
  /**
   * CSS-Selector. The Teleport target. Set `null` to render in-place.
   *
   * @default 'body'
   */
  teleportTo?: string;

  /**
   * Whether position the modal as `absolute` instead of `fixed`
   * @default false
   */
  absolute?: boolean;

  rootClass?: ClassType;
  modalClass?: ClassType;
  overlayClass?: ClassType;
  rootStyle?: StyleType;
  modalStyle?: StyleType;
  overlayStyle?: StyleType;

  /**
   * Name or raw bindings. You can even pass event listeners to the Transition component.
   */
  modalTransition?: string | object;

  /**
   * @see `modalTransition` prop
   */
  overlayTransition?: string | object;

  /**
   * Lock scroll if possible. You should provide a `BodyScrollLockApi` with `SBodyScrollLockProvider` component.
   *
   * @default true
   */
  lockScroll?: boolean;

  /**
   * Set to `false` to not show overlay at all
   *
   * @default true
   */
  showOverlay?: boolean;

  /**
   * @default true
   */
  closeOnOverlayClick?: boolean;

  /**
   * @default true
   */
  closeOnEsc?: boolean;

  /**
   * You can pass options to focus trap constructor or disable trap completely by passing `false`
   *
   * Note: that this prop is applied only on setup and is not reactive.
   *
   * @default true
   */
  focusTrap?: boolean | object;

  /**
   * Always render modal content and toggle modal visibility with `v-show` instead of `v-if`
   *
   * @default false
   */
  eager?: boolean;

  /**
   * ID of the modal label. If it is not set, then an unique ID will be generated.
   */
  labelledBy?: string;

  /**
   * Used for `aria-describedby`. It is not automatically generated.
   */
  describedBy?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  teleportTo: 'body',
  modalTransition: 's-modal__modal-transition',
  overlayTransition: 's-modal__overlay-transition',
  closeOnOverlayClick: true,
  closeOnEsc: true,
  showOverlay: true,
  lockScroll: true,
  focusTrap: true,
  eager: false,
  labelledBy:
    // here is a Vue typing error - primitive value factory is a valid default value
    uniqueElementId as unknown as string,
  describedBy: null,
});

const emit = defineEmits(['click:overlay', 'before-open', 'after-open', 'before-close', 'after-close']);

// ***

const showModel = defineModel<boolean>('show', { default: false });
const eager = computed(() => props.eager);
const showOverlay = computed(() => props.showOverlay);

function close() {
  showModel.value = false;
}

const modalRef = templateRef<HTMLElement | SVGElement | null>('modal');
const rootRef = templateRef<HTMLElement | SVGElement | null>('root');

// VISIBILITY

const overlayTransitionAttrs = computed(() => normalizeTransitionAttrs(props.overlayTransition));
const modalTransitionAttrs = computed(() => normalizeTransitionAttrs(props.modalTransition));

const {
  rootIf,
  rootShow,
  modalIf,
  modalShow,
  overlayIf,
  overlayTransitionListeners,
  modalTransitionListeners,
  modalTransitionAppear,
} = useModalVisibility({
  show: showModel,
  overlayEnabled: showOverlay,
  eager,
  emit,
});

// FOCUS TRAP

let focusTrapRef: null | Ref<null | FocusTrap> = null;
if (props.focusTrap) {
  const optionsFromProps: FocusTrapOptions = props.focusTrap === true ? {} : props.focusTrap;

  const focusTrapTarget = shallowRef<null | HTMLElement | SVGElement>(null);
  const fallbackFocus = () => {
    const modalEl = unref(modalRef);
    if (modalEl instanceof HTMLElement || modalEl instanceof SVGElement) return modalEl;

    const rootEl = unref(rootRef);
    if (rootEl instanceof HTMLElement || rootEl instanceof SVGElement) return rootEl;

    return typeof document !== 'undefined' ? document.body : (undefined as unknown as HTMLElement);
  };
  watch(
    [modalShow, rootRef],
    ([val, el]) => {
      focusTrapTarget.value = val ? (el ?? null) : null;
    },
    {
      // edge case: eager rendering, modal is "display: none". `tabbable` throws an error
      // because contents are hidden yet. Post flush fixes it.
      flush: 'post',
    }
  );
  const { trap } = useFocusTrap({
    elem: focusTrapTarget,
    options: {
      ...optionsFromProps,
      fallbackFocus: optionsFromProps.fallbackFocus ?? fallbackFocus,
      escapeDeactivates(event) {
        if (typeof optionsFromProps.escapeDeactivates === 'function') {
          return optionsFromProps.escapeDeactivates(event);
        }

        return props.closeOnEsc ? true : false;
      },
    },
  });

  focusTrapRef = trap;

  watch(
    trap,
    (value) => {
      try {
        value?.activate();
      } catch (err) {
        console.warn(
          '[SModal] focus-trap activation is failed. Does your modal contain any tabbable node?' +
            '\nTip: you can disable focus-trap completely by setting `focus-trap` prop to `false`' +
            '\n\nOriginal error:\n\n%o',
          err
        );
        value?.deactivate();
        trap.value = null;
      }
    },
    { immediate: true }
  );
}

// BODY SCROLL LOCK

useBodyScrollLockIfPossible(computed(() => (props.lockScroll ? unref(modalRef) : null)));

// API

const api: ModalApi = readonly({
  close,
  focusTrap: focusTrapRef,
  labelledBy: computed(() => props.labelledBy),
  describedBy: computed(() => props.describedBy),
});
provide(MODAL_API_KEY, api);

// ETC

function onOverlayClick() {
  emit('click:overlay');
  if (props.closeOnOverlayClick) {
    showModel.value = false;
  }
}

useCloseOnEsc(
  computed(() => showModel.value && props.closeOnEsc),
  close
);
</script>

<template>
  <Teleport :to="teleportTo" :disabled="teleportTo === null">
    <div
      v-if="rootIf"
      v-show="rootShow"
      ref="root"
      :class="['s-modal__root', rootClass]"
      :style="rootStyle"
      :data-absolute="absolute"
      :data-open="showModel ? 'true' : 'false'"
      data-testid="root"
    >
      <Transition appear v-bind="overlayTransitionAttrs" v-on="overlayTransitionListeners">
        <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events -->
        <div
          v-if="overlayIf"
          :class="['s-modal__overlay', overlayClass]"
          :style="overlayStyle"
          data-testid="overlay"
          @click="onOverlayClick"
        />
      </Transition>

      <Transition :appear="modalTransitionAppear" v-bind="modalTransitionAttrs" v-on="modalTransitionListeners">
        <div
          v-if="modalIf"
          v-show="modalShow"
          ref="modal"
          :style="modalStyle"
          :class="['s-modal__modal', modalClass]"
          data-testid="modal"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="labelledBy"
          :aria-describedby="describedBy || ''"
        >
          <slot v-bind="api" />
        </div>
      </Transition>
    </div>
  </Teleport>
</template>
