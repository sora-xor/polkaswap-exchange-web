import { effectScope, nextTick, shallowRef } from 'vue';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';

interface FocusTrapMock {
  deactivate: Mock;
  updateContainerElements: Mock;
}

const focusTrapMocks = vi.hoisted(() => {
  const created: Array<{ element: Element; options: unknown; trap: FocusTrapMock }> = [];
  const createFocusTrap = vi.fn((element: Element, options: unknown) => {
    const trap: FocusTrapMock = {
      deactivate: vi.fn(),
      updateContainerElements: vi.fn(),
    };

    created.push({ element, options, trap });

    return trap;
  });

  return {
    created,
    createFocusTrap,
  };
});

vi.mock('focus-trap', () => ({
  createFocusTrap: focusTrapMocks.createFocusTrap,
}));

import { useFocusTrap } from '@/lib/soramitsu-ui/composables/focus-trap';

describe('useFocusTrap', () => {
  afterEach(() => {
    focusTrapMocks.created.length = 0;
    focusTrapMocks.createFocusTrap.mockClear();
  });

  it('creates a trap for the current element and updates it when the element changes', async () => {
    const first = document.createElement('div');
    const second = document.createElement('section');
    const elem = shallowRef<HTMLElement | null>(first);
    const options = { allowOutsideClick: true };
    const scope = effectScope();
    let result: ReturnType<typeof useFocusTrap> | undefined;

    scope.run(() => {
      result = useFocusTrap({ elem, options });
    });

    expect(focusTrapMocks.createFocusTrap).toHaveBeenCalledTimes(1);
    expect(focusTrapMocks.created[0]).toMatchObject({ element: first, options });
    expect(result?.trap.value).toBe(focusTrapMocks.created[0].trap);

    elem.value = second;
    await nextTick();

    expect(focusTrapMocks.createFocusTrap).toHaveBeenCalledTimes(1);
    expect(focusTrapMocks.created[0].trap.updateContainerElements).toHaveBeenCalledWith(second);

    scope.stop();

    expect(focusTrapMocks.created[0].trap.deactivate).toHaveBeenCalledTimes(1);
    expect(result?.trap.value).toBeNull();
  });

  it('deactivates and clears the trap when the element is removed', async () => {
    const elem = shallowRef<HTMLElement | null>(document.createElement('div'));
    const scope = effectScope();
    let result: ReturnType<typeof useFocusTrap> | undefined;

    scope.run(() => {
      result = useFocusTrap({ elem });
    });
    const trap = focusTrapMocks.created[0].trap;

    elem.value = null;
    await nextTick();

    expect(trap.deactivate).toHaveBeenCalledTimes(1);
    expect(result?.trap.value).toBeNull();

    scope.stop();

    expect(trap.deactivate).toHaveBeenCalledTimes(1);
  });

  it('does not create or deactivate a trap when initialized without an element', () => {
    const elem = shallowRef<HTMLElement | null>(null);
    const scope = effectScope();
    let result: ReturnType<typeof useFocusTrap> | undefined;

    scope.run(() => {
      result = useFocusTrap({ elem });
    });

    expect(focusTrapMocks.createFocusTrap).not.toHaveBeenCalled();
    expect(result?.trap.value).toBeNull();

    scope.stop();

    expect(focusTrapMocks.createFocusTrap).not.toHaveBeenCalled();
  });
});
