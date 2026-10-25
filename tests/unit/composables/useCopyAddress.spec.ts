import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountSetup } from '@stubs/mountSetup';

const translationMocks = vi.hoisted(() => ({
  t: vi.fn((key: string, params?: { value?: string }) => (params?.value ? `${key}:${params.value}` : key)),
}));

const utilsMocks = vi.hoisted(() => ({
  copyToClipboard: vi.fn(() => Promise.resolve()),
  delay: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: translationMocks.t,
  }),
}));

vi.mock('@/utils', () => ({
  copyToClipboard: utilsMocks.copyToClipboard,
  delay: utilsMocks.delay,
}));

import { useCopyAddress } from '@/composables/useCopyAddress';

describe('useCopyAddress', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns translated tooltip text before and after a successful copy interaction', async () => {
    let mouseleaveHandler: (() => Promise<void>) | undefined;
    const target = {
      addEventListener: vi.fn((type: string, handler: () => Promise<void>) => {
        if (type === 'mouseleave') {
          mouseleaveHandler = handler;
        }
      }),
      removeEventListener: vi.fn(),
    };
    const event = {
      stopImmediatePropagation: vi.fn(),
      target,
    } as unknown as PointerEvent;

    const { copyTooltip, handleCopyAddress } = setupCopyAddress();

    expect(copyTooltip()).toBe('assets.receive');
    expect(copyTooltip('XOR')).toBe('copyWithValue:XOR');

    await handleCopyAddress('xor-address', event);

    expect(event.stopImmediatePropagation).toHaveBeenCalledTimes(1);
    expect(utilsMocks.copyToClipboard).toHaveBeenCalledWith('xor-address');
    expect(target.addEventListener).toHaveBeenCalledWith('mouseleave', expect.any(Function));
    expect(utilsMocks.delay).toHaveBeenCalledWith(1000);
    expect(copyTooltip()).toBe('assets.copied');
    expect(copyTooltip('XOR')).toBe('copiedWithValue:XOR');

    await mouseleaveHandler?.({ currentTarget: target } as unknown as Event);

    expect(utilsMocks.delay).toHaveBeenCalledWith(500);
    expect(target.removeEventListener).toHaveBeenCalledWith('mouseleave', mouseleaveHandler);
    expect(copyTooltip()).toBe('assets.receive');
    expect(copyTooltip('XOR')).toBe('copyWithValue:XOR');
  });

  it('copies without registering mouseleave handling when the event target is missing', async () => {
    const event = {
      stopImmediatePropagation: vi.fn(),
      target: null,
    } as unknown as MouseEvent;

    const { copyTooltip, handleCopyAddress } = setupCopyAddress();

    await handleCopyAddress('val-address', event);

    expect(event.stopImmediatePropagation).toHaveBeenCalledTimes(1);
    expect(utilsMocks.copyToClipboard).toHaveBeenCalledWith('val-address');
    expect(copyTooltip('VAL')).toBe('copiedWithValue:VAL');
  });

  it('removes the previous target listener when copy moves to another element', async () => {
    const first = document.createElement('button');
    const second = document.createElement('button');
    const firstAdd = vi.spyOn(first, 'addEventListener');
    const firstRemove = vi.spyOn(first, 'removeEventListener');
    const { handleCopyAddress } = setupCopyAddress();

    await handleCopyAddress('first', {
      stopImmediatePropagation: vi.fn(),
      target: first,
    } as unknown as PointerEvent);
    const firstListener = firstAdd.mock.calls.find(([type]) => type === 'mouseleave')?.[1];

    await handleCopyAddress('second', {
      stopImmediatePropagation: vi.fn(),
      target: second,
    } as unknown as PointerEvent);

    expect(firstRemove).toHaveBeenCalledWith('mouseleave', firstListener);
  });

  it('removes the tracked listener when the host component unmounts', async () => {
    const { state, unmount } = mountSetup({ setup: () => useCopyAddress() }, {});
    const target = document.createElement('button');
    const addEventListenerSpy = vi.spyOn(target, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(target, 'removeEventListener');

    await state.handleCopyAddress('component-address', {
      stopImmediatePropagation: vi.fn(),
      target,
    } as unknown as PointerEvent);
    const listener = addEventListenerSpy.mock.calls.find(([type]) => type === 'mouseleave')?.[1];

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseleave', listener);
  });
});

const setupCopyAddress = () => mountSetup({ setup: () => useCopyAddress() }, {}).state;
