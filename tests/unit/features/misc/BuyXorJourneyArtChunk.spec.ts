import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BuyXorJourneyArt from '@/features/misc/components/buy-xor/BuyXorJourneyArt.vue';

// The water code is its own chunk, loaded after first paint. If that load fails (offline, blocked by an extension,
// a stale deployment), the art must still show its CSS drops.
vi.mock('@/features/misc/lib/buyXorJourneyWater', () => {
  throw new Error('the chunk could not be loaded');
});

let idle: (() => void) | undefined;

beforeEach(() => {
  idle = undefined;
  vi.stubGlobal('WebGLRenderingContext', class {});
  vi.stubGlobal(
    'requestIdleCallback',
    vi.fn((callback: () => void) => {
      idle = callback;
      return 1;
    })
  );
  vi.stubGlobal('cancelIdleCallback', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('BuyXorJourneyArt when its water code cannot be loaded', () => {
  it('keeps showing the CSS drops, and never tries to draw', async () => {
    const wrapper = mount(BuyXorJourneyArt, { props: { stage: 'receive' }, attachTo: document.body });
    expect(wrapper.attributes('data-renderer')).toBe('pending');
    idle?.();
    await vi.waitFor(() => expect(wrapper.attributes('data-renderer')).toBe('static'), { timeout: 10_000 });
    expect(wrapper.findAll('.journey-art__drop').map((drop) => drop.attributes('data-coin'))).toEqual([
      'ETH',
      'ETH-SORA',
      'XOR',
    ]);
    // The page keeps working: a new step still moves the drops.
    await wrapper.setProps({ stage: 'send' });
    expect(wrapper.get('.journey-art__drop.is-focus').attributes('data-coin')).toBe('ETH-SORA');
    wrapper.unmount();
  });
});
