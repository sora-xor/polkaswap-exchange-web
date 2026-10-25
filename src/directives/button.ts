import type { Directive } from 'vue';

const CLICKABLE_CLASS = 's-clickable';
const INTERACTIVE_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'OPTION', 'SELECT', 'SUMMARY', 'TEXTAREA']);
const KEYS = new Set(['Enter', ' ']);

type ButtonState = {
  addedClass: boolean;
  addedRole: boolean;
  addedTabindex: boolean;
  keyHandler: (event: KeyboardEvent) => void;
};

type ButtonDirectiveElement = HTMLElement & {
  __buttonDirectiveState__?: ButtonState;
};

const isNativeInteractive = (el: HTMLElement): boolean => INTERACTIVE_TAGS.has(el.tagName);

const isAriaDisabled = (el: HTMLElement): boolean => {
  return el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('disabled');
};

const createState = (): ButtonState => ({
  addedClass: false,
  addedRole: false,
  addedTabindex: false,
  keyHandler: (event: KeyboardEvent) => {
    const currentTarget = event.currentTarget as HTMLElement | null;

    if (!currentTarget || isAriaDisabled(currentTarget) || !KEYS.has(event.key)) {
      return;
    }

    event.preventDefault();
    currentTarget.click();
  },
});

const ensureState = (el: ButtonDirectiveElement): ButtonState => {
  if (!el.__buttonDirectiveState__) {
    el.__buttonDirectiveState__ = createState();
  }

  return el.__buttonDirectiveState__;
};

const updateButtonBehavior = (el: ButtonDirectiveElement, withTabindex: boolean): void => {
  const state = ensureState(el);
  const isInteractive = isNativeInteractive(el);

  if (!el.classList.contains(CLICKABLE_CLASS)) {
    el.classList.add(CLICKABLE_CLASS);
    state.addedClass = true;
  }

  if (!isInteractive && !el.hasAttribute('role')) {
    el.setAttribute('role', 'button');
    state.addedRole = true;
  }

  if (!isInteractive) {
    if (withTabindex) {
      if (!el.hasAttribute('tabindex') || state.addedTabindex) {
        el.setAttribute('tabindex', '0');
        state.addedTabindex = true;
      }
    } else if (state.addedTabindex) {
      el.setAttribute('tabindex', '-1');
    }

    el.removeEventListener('keydown', state.keyHandler);
    el.addEventListener('keydown', state.keyHandler);
  }
};

const cleanupButtonBehavior = (el: ButtonDirectiveElement): void => {
  const state = el.__buttonDirectiveState__;

  if (!state) return;

  el.removeEventListener('keydown', state.keyHandler);

  if (state.addedClass) {
    el.classList.remove(CLICKABLE_CLASS);
  }

  if (state.addedRole) {
    el.removeAttribute('role');
  }

  if (state.addedTabindex) {
    el.removeAttribute('tabindex');
  }

  delete el.__buttonDirectiveState__;
};

const buttonDirective: Directive<ButtonDirectiveElement, boolean | undefined> = {
  mounted(el, binding) {
    updateButtonBehavior(el, binding.value !== false);
  },
  updated(el, binding) {
    updateButtonBehavior(el, binding.value !== false);
  },
  unmounted(el) {
    cleanupButtonBehavior(el);
  },
};

export default buttonDirective;
