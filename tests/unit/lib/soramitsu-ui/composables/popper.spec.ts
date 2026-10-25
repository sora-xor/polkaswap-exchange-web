import type { Instance, Options } from '@popperjs/core';
import { effectScope, nextTick, reactive, ref, shallowRef } from 'vue';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';

interface PopperInstanceMock {
  destroy: Mock;
  setOptions: Mock;
}

const popperMocks = vi.hoisted(() => {
  const created: Array<{
    reference: Element;
    popper: HTMLElement;
    options: Partial<Options> | undefined;
    instance: PopperInstanceMock;
  }> = [];
  const createPopper = vi.fn((reference: Element, popper: HTMLElement, options?: Partial<Options>) => {
    const instance: PopperInstanceMock = {
      destroy: vi.fn(),
      setOptions: vi.fn(),
    };

    created.push({ reference, popper, options, instance });

    return instance as unknown as Instance;
  });

  return {
    created,
    createPopper,
  };
});

vi.mock('@popperjs/core', () => ({
  createPopper: popperMocks.createPopper,
}));

import { usePopper } from '@/lib/soramitsu-ui/composables/popper';

describe('usePopper', () => {
  afterEach(() => {
    popperMocks.created.length = 0;
    popperMocks.createPopper.mockClear();
  });

  it('waits for both elements before creating a popper instance', async () => {
    const reference = shallowRef<Element | null>(null);
    const popper = shallowRef<HTMLElement | null>(null);
    const scope = effectScope();
    let result: ReturnType<typeof usePopper> | undefined;

    scope.run(() => {
      result = usePopper({
        referenceElem: reference,
        popperElem: popper,
        options: { placement: 'bottom' },
      });
    });

    expect(popperMocks.createPopper).not.toHaveBeenCalled();

    reference.value = document.createElement('button');
    await nextTick();

    expect(popperMocks.createPopper).not.toHaveBeenCalled();

    popper.value = document.createElement('div');
    await nextTick();

    expect(popperMocks.createPopper).toHaveBeenCalledTimes(1);
    expect(popperMocks.created[0]).toMatchObject({
      reference: reference.value,
      popper: popper.value,
      options: { placement: 'bottom' },
    });
    expect(result?.instance.value).toBe(popperMocks.created[0].instance);

    scope.stop();

    expect(result?.instance.value).toBeNull();
  });

  it('destroys and recreates the instance when bound elements change', async () => {
    const reference = shallowRef<Element | null>(document.createElement('button'));
    const popper = shallowRef<HTMLElement | null>(document.createElement('div'));
    const scope = effectScope();

    scope.run(() => {
      usePopper({ referenceElem: reference, popperElem: popper });
    });
    const firstInstance = popperMocks.created[0].instance;

    reference.value = document.createElement('a');
    await nextTick();

    expect(firstInstance.destroy).toHaveBeenCalledTimes(1);
    expect(popperMocks.createPopper).toHaveBeenCalledTimes(2);
    expect(popperMocks.created[1].reference).toBe(reference.value);

    scope.stop();

    expect(popperMocks.created[1].instance.destroy).toHaveBeenCalledTimes(1);
  });

  it('clears the exposed instance when a bound element is removed', async () => {
    const reference = shallowRef<Element | null>(document.createElement('button'));
    const popper = shallowRef<HTMLElement | null>(document.createElement('div'));
    const scope = effectScope();
    let result: ReturnType<typeof usePopper> | undefined;

    scope.run(() => {
      result = usePopper({ referenceElem: reference, popperElem: popper });
    });
    const instance = popperMocks.created[0].instance;

    popper.value = null;
    await nextTick();

    expect(instance.destroy).toHaveBeenCalledTimes(1);
    expect(result?.instance.value).toBeNull();

    scope.stop();

    expect(instance.destroy).toHaveBeenCalledTimes(1);
  });

  it('updates instance options when reactive options change', async () => {
    const reference = shallowRef<Element | null>(document.createElement('button'));
    const popper = shallowRef<HTMLElement | null>(document.createElement('div'));
    const options = reactive<Partial<Options>>({ placement: 'bottom' });
    const scope = effectScope();

    scope.run(() => {
      usePopper({ referenceElem: reference, popperElem: popper, options });
    });
    const instance = popperMocks.created[0].instance;

    options.placement = 'top';
    await nextTick();

    expect(instance.setOptions).toHaveBeenCalledWith(expect.objectContaining({ placement: 'top' }));

    scope.stop();
  });

  it('updates instance options when ref options are replaced', async () => {
    const reference = shallowRef<Element | null>(document.createElement('button'));
    const popper = shallowRef<HTMLElement | null>(document.createElement('div'));
    const options = ref<Partial<Options>>({ placement: 'bottom' });
    const scope = effectScope();

    scope.run(() => {
      usePopper({ referenceElem: reference, popperElem: popper, options });
    });
    const instance = popperMocks.created[0].instance;

    options.value = { placement: 'top' };
    await nextTick();

    expect(instance.setOptions).toHaveBeenCalledWith(expect.objectContaining({ placement: 'top' }));

    scope.stop();
  });

  it('ignores reactive option changes until an instance exists', async () => {
    const reference = shallowRef<Element | null>(null);
    const popper = shallowRef<HTMLElement | null>(null);
    const options = reactive<Partial<Options>>({ placement: 'bottom' });
    const scope = effectScope();
    let result: ReturnType<typeof usePopper> | undefined;

    scope.run(() => {
      result = usePopper({ referenceElem: reference, popperElem: popper, options });
    });

    options.placement = 'top';
    await nextTick();

    expect(popperMocks.createPopper).not.toHaveBeenCalled();
    expect(result?.instance.value).toBeNull();

    scope.stop();
  });

  it('uses custom init and destroy callbacks when provided', () => {
    const reference = document.createElement('button');
    const popper = document.createElement('div');
    const customInstance = {
      destroy: vi.fn(),
      setOptions: vi.fn(),
    } as unknown as Instance;
    const callbackInit = vi.fn(() => customInstance);
    const callbackDestroy = vi.fn();
    const scope = effectScope();
    let result: ReturnType<typeof usePopper> | undefined;

    scope.run(() => {
      result = usePopper({
        referenceElem: reference,
        popperElem: popper,
        callbackInit,
        callbackDestroy,
      });
    });

    expect(callbackInit).toHaveBeenCalledWith(reference, popper);
    expect(popperMocks.createPopper).not.toHaveBeenCalled();
    expect(result?.instance.value).toBe(customInstance);

    scope.stop();

    expect(callbackDestroy).toHaveBeenCalledWith(customInstance);
    expect(result?.instance.value).toBeNull();
  });
});
