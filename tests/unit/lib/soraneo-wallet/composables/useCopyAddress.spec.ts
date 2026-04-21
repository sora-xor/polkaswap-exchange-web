import { afterEach, describe, expect, it, vi } from 'vitest';

const translationMocks = vi.hoisted(() => ({
  t: vi.fn((key: string, params?: { value?: string }) => (params?.value ? `${key}:${params.value}` : key)),
}));

const utilsMocks = vi.hoisted(() => ({
  copyToClipboard: vi.fn(() => Promise.resolve()),
  delay: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: translationMocks.t,
  }),
}));

vi.mock('@/util', () => ({
  copyToClipboard: utilsMocks.copyToClipboard,
  delay: utilsMocks.delay,
}));

import { useCopyAddress } from '@/lib/soraneo-wallet/src/composables/useCopyAddress';

describe('wallet useCopyAddress', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns translated tooltip text before and after a successful copy interaction', async () => {
    let mouseleaveHandler: (() => Promise<void>) | undefined;
    const target = document.createElement('button');
    const addEventListenerSpy = vi.spyOn(target, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(target, 'removeEventListener');
    addEventListenerSpy.mockImplementation(((type: string, handler: EventListenerOrEventListenerObject) => {
      if (type === 'mouseleave' && typeof handler === 'function') {
        mouseleaveHandler = handler as () => Promise<void>;
      }
    }) as typeof target.addEventListener);
    const event = {
      stopImmediatePropagation: vi.fn(),
      target,
    } as unknown as PointerEvent;

    const { copyTooltip, handleCopyAddress } = useCopyAddress();

    expect(copyTooltip()).toBe('assets.receive');
    expect(copyTooltip('XOR')).toBe('copyWithValue:XOR');

    await handleCopyAddress('xor-address', event);

    expect(event.stopImmediatePropagation).toHaveBeenCalledTimes(1);
    expect(utilsMocks.copyToClipboard).toHaveBeenCalledWith('xor-address');
    expect(addEventListenerSpy).toHaveBeenCalledWith('mouseleave', expect.any(Function));
    expect(utilsMocks.delay).toHaveBeenCalledWith(1000);
    expect(copyTooltip()).toBe('assets.copied');
    expect(copyTooltip('XOR')).toBe('copiedWithValue:XOR');

    await mouseleaveHandler?.();

    expect(utilsMocks.delay).toHaveBeenCalledWith(500);
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseleave', mouseleaveHandler as EventListener);
    expect(copyTooltip()).toBe('assets.receive');
    expect(copyTooltip('XOR')).toBe('copyWithValue:XOR');
  });

  it('copies without registering mouseleave handling when the event target is missing', async () => {
    const event = {
      stopImmediatePropagation: vi.fn(),
      target: null,
    } as unknown as MouseEvent;

    const { copyTooltip, handleCopyAddress } = useCopyAddress();

    await handleCopyAddress('val-address', event);

    expect(event.stopImmediatePropagation).toHaveBeenCalledTimes(1);
    expect(utilsMocks.copyToClipboard).toHaveBeenCalledWith('val-address');
    expect(copyTooltip('VAL')).toBe('copiedWithValue:VAL');
  });
});
