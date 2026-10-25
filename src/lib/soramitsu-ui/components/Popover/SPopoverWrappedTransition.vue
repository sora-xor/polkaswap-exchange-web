<script setup lang="ts">
import { mergeProps } from 'vue';
import type { BaseTransitionProps } from 'vue';
import { useWrappedTransitionVisibility } from './util';
import { usePopoverApi } from './api';

type TransitionHook = (...args: any[]) => void;
type TransitionListener = TransitionHook | TransitionHook[] | undefined;

defineOptions({ inheritAttrs: false });

const props = defineProps({
  eager: Boolean,
  wrapperAttrs: {
    type: Object,
    default: null,
  },
  innerWrapperAttrs: {
    type: Object,
    default: null,
  },
});

const api = usePopoverApi();

const transitionPropKeys = new Set([
  'appear',
  'css',
  'type',
  'duration',
  'mode',
  'persisted',
  'enterFromClass',
  'enterActiveClass',
  'enterToClass',
  'leaveFromClass',
  'leaveActiveClass',
  'leaveToClass',
  'appearFromClass',
  'appearActiveClass',
  'appearToClass',
]);
const transitionEventKeys = new Set([
  'onBeforeEnter',
  'onEnter',
  'onAfterEnter',
  'onEnterCancelled',
  'onBeforeLeave',
  'onLeave',
  'onAfterLeave',
  'onLeaveCancelled',
  'onBeforeAppear',
  'onAppear',
  'onAfterAppear',
  'onAppearCancelled',
]);

const attrs = useAttrs();

const splitAttrs = computed(() => {
  const transition: Record<string, unknown> = {};
  const listeners: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};
  let name: unknown;

  for (const key in attrs) {
    if (!Object.prototype.hasOwnProperty.call(attrs, key)) continue;

    if (key === 'name') {
      name = attrs[key];
      continue;
    }

    if (transitionEventKeys.has(key)) {
      listeners[key] = attrs[key];
    } else if (transitionPropKeys.has(key)) {
      transition[key] = attrs[key];
    } else {
      rest[key] = attrs[key];
    }
  }

  return { transition, listeners, rest, name };
});

const transitionName = eagerComputed(() => {
  const raw = splitAttrs.value.name;
  return typeof raw === 'string' ? raw : undefined;
});
const transitionAttrs = eagerComputed(() => splitAttrs.value.transition);
const transitionListeners = eagerComputed(() => splitAttrs.value.listeners);
const forwardedAttrs = eagerComputed(() => splitAttrs.value.rest);

function invokeListener(key: string, ...args: any[]) {
  const handler = transitionListeners.value[key] as TransitionListener;
  if (!handler) return;
  if (Array.isArray(handler)) {
    handler.forEach((fn) => fn(...args));
  } else {
    handler(...args);
  }
}

type TransitionPropValue = Pick<BaseTransitionProps, 'onBeforeEnter' | 'onAfterLeave'>[keyof Pick<
  BaseTransitionProps,
  'onBeforeEnter' | 'onAfterLeave'
>];

function invokeTransitionProp(handler: TransitionPropValue, args: [Element, ...any[]]) {
  if (!handler) return;

  if (Array.isArray(handler)) {
    handler.forEach((fn) => (fn as (...hookArgs: [Element, ...any[]]) => void)(...args));
  } else {
    (handler as (...hookArgs: [Element, ...any[]]) => void)(...args);
  }
}

const { wrapperIf, wrapperShow, contentIf, contentShow, transitionProps } = useWrappedTransitionVisibility({
  show: computed(() => api.show),
  eager: computed(() => props.eager),
});

const transitionStateProps = eagerComputed(() => {
  const { onBeforeEnter: _ignoreBefore, onAfterLeave: _ignoreAfter, ...rest } = transitionProps;
  return rest;
});

function onEnter() {
  api.popper?.update();
}

const wrapper = templateRef('wrapper');
const content = templateRef('content');
const wrapperNormalized = eagerComputed(() => unrefElement(wrapper) as null | HTMLDivElement);
const contentNormalized = eagerComputed(() => unrefElement(content) as null | HTMLElement);
watch(wrapperNormalized, (el, oldEl) => {
  if (oldEl) api.deletePopperRefOverride(oldEl);
  if (el) api.addPopperRefOverride(el);
});

onScopeDispose(() => {
  const el = wrapperNormalized.value;
  el && api.deletePopperRefOverride(el);
});

const transitionActiveClass = eagerComputed(() => {
  const name = transitionName.value;
  return name ? `${name}-enter-active` : null;
});

const afterEnterPending = ref(false);

function handleBeforeEnter(...args: [Element, ...any[]]) {
  afterEnterPending.value = true;
  invokeTransitionProp(transitionProps.onBeforeEnter, args);
  invokeListener('onBeforeEnter', ...args);
}

function handleEnter(...args: [Element, ...any[]]) {
  onEnter();
  invokeListener('onEnter', ...args);
}

function handleAfterEnter(...args: [Element, ...any[]]) {
  const [el] = args;
  if (!afterEnterPending.value) return;
  afterEnterPending.value = false;
  invokeListener('onAfterEnter', ...args);
}

function handleEnterCancelled(...args: [Element, ...any[]]) {
  afterEnterPending.value = false;
  invokeListener('onEnterCancelled', ...args);
}

function handleBeforeLeave(...args: [Element, ...any[]]) {
  invokeListener('onBeforeLeave', ...args);
}

function handleLeave(...args: [Element, ...any[]]) {
  invokeListener('onLeave', ...args);
}

function handleAfterLeave(...args: [Element, ...any[]]) {
  afterEnterPending.value = false;
  invokeTransitionProp(transitionProps.onAfterLeave, args);
  invokeListener('onAfterLeave', ...args);
}

function handleLeaveCancelled(...args: [Element, ...any[]]) {
  invokeListener('onLeaveCancelled', ...args);
}

function handleBeforeAppear(...args: [Element, ...any[]]) {
  afterEnterPending.value = true;
  invokeTransitionProp(transitionProps.onBeforeEnter, args);
  invokeListener('onBeforeAppear', ...args);
  invokeListener('onBeforeEnter', ...args);
}

function handleAppear(...args: [Element, ...any[]]) {
  onEnter();
  invokeListener('onAppear', ...args);
  invokeListener('onEnter', ...args);
}

function handleAfterAppear(...args: [Element, ...any[]]) {
  if (!afterEnterPending.value) return;
  afterEnterPending.value = false;
  invokeListener('onAfterAppear', ...args);
  invokeListener('onAfterEnter', ...args);
}

function handleAppearCancelled(...args: [Element, ...any[]]) {
  afterEnterPending.value = false;
  invokeListener('onAppearCancelled', ...args);
  invokeListener('onEnterCancelled', ...args);
}

watch([contentNormalized, transitionActiveClass, contentShow], () => {
  const wrapperEl = contentNormalized.value;
  if (!wrapperEl) {
    return;
  }

  const childEl = wrapperEl.firstElementChild instanceof HTMLElement ? wrapperEl.firstElementChild : null;
  const cls = transitionActiveClass.value;
  if (!cls) return;

  const action: 'add' | 'remove' = contentShow.value ? 'add' : 'remove';
  wrapperEl.classList[action](cls);
  childEl?.classList[action](cls);
});
</script>

<template>
  <div v-if="wrapperIf" v-show="wrapperShow" ref="wrapper" v-bind="mergeProps(forwardedAttrs, wrapperAttrs)">
    <Transition
      :name="transitionName"
      v-bind="mergeProps(transitionAttrs, transitionStateProps)"
      @before-enter="handleBeforeEnter"
      @enter="handleEnter"
      @after-enter="handleAfterEnter"
      @enter-cancelled="handleEnterCancelled"
      @before-leave="handleBeforeLeave"
      @leave="handleLeave"
      @after-leave="handleAfterLeave"
      @leave-cancelled="handleLeaveCancelled"
      @before-appear="handleBeforeAppear"
      @appear="handleAppear"
      @after-appear="handleAfterAppear"
      @appear-cancelled="handleAppearCancelled"
    >
      <span v-if="contentIf" v-show="contentShow" ref="content" v-bind="innerWrapperAttrs">
        <slot />
      </span>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
span {
  display: inline-block;
}
</style>
