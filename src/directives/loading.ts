import { SSpinner } from '@soramitsu-ui/ui';
import { createVNode, type Directive, render } from 'vue';

const HOST_CLASS = 'app-loading-overlay__host';
const OVERLAY_CLASS = 'app-loading-overlay';
const SPINNER_CLASS = 'app-loading-overlay__spinner';

interface LoadingState {
  overlay: HTMLDivElement;
  spinnerMount: HTMLDivElement;
  addedHostClass: boolean;
  originalPosition: string;
}

type LoadingHTMLElement = HTMLElement & { __loadingState__?: LoadingState };

function createOverlay(): LoadingState {
  const overlay = document.createElement('div');
  overlay.className = OVERLAY_CLASS;

  const spinnerMount = document.createElement('div');
  spinnerMount.className = SPINNER_CLASS;
  overlay.appendChild(spinnerMount);

  const spinnerVNode = createVNode(SSpinner, { size: 'var(--s-size-medium)', width: 5 });
  render(spinnerVNode, spinnerMount);

  return {
    overlay,
    spinnerMount,
    addedHostClass: false,
    originalPosition: '',
  };
}

function ensureState(el: LoadingHTMLElement): LoadingState {
  if (!el.__loadingState__) {
    el.__loadingState__ = createOverlay();
  }
  return el.__loadingState__;
}

function ensureHostClass(el: LoadingHTMLElement, state: LoadingState): void {
  const style = window.getComputedStyle(el);
  state.originalPosition = el.style.position;

  if (style.position === 'static') {
    el.classList.add(HOST_CLASS);
    state.addedHostClass = true;
  }
}

function resetHostClass(el: LoadingHTMLElement, state: LoadingState): void {
  if (state.addedHostClass) {
    el.classList.remove(HOST_CLASS);
  }
}

function toggleOverlay(el: LoadingHTMLElement, show: boolean): void {
  const state = ensureState(el);

  if (show) {
    ensureHostClass(el, state);
    if (!state.overlay.parentElement) {
      el.appendChild(state.overlay);
    }
  } else if (state.overlay.parentElement) {
    state.overlay.parentElement.removeChild(state.overlay);
    resetHostClass(el, state);
  }
}

const loadingDirective: Directive<LoadingHTMLElement, boolean> = {
  mounted(el, binding) {
    toggleOverlay(el, Boolean(binding.value));
  },
  updated(el, binding) {
    toggleOverlay(el, Boolean(binding.value));
  },
  unmounted(el) {
    const state = el.__loadingState__;
    if (!state) return;

    if (state.overlay.parentElement) {
      state.overlay.parentElement.removeChild(state.overlay);
    }
    resetHostClass(el, state);
    render(null, state.spinnerMount);
    delete el.__loadingState__;
  },
};

export default loadingDirective;
