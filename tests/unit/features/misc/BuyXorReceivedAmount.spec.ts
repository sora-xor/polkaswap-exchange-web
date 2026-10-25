import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BuyXorReceivedAmount from '@/features/misc/components/buy-xor/BuyXorReceivedAmount.vue';

let wrapper: VueWrapper | undefined;
let frames: Map<number, FrameRequestCallback>;
let sequence: number;
let reduced: boolean;

/** Run the queued animation frames at `time`; the count-up measures time on the frames' own clock. */
async function frameAt(time: number): Promise<void> {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((callback) => callback(time));
  await nextTick();
}

function mountAmount(amount: string): VueWrapper {
  wrapper = mount(BuyXorReceivedAmount, { props: { amount }, attachTo: document.body });
  return wrapper;
}

const visible = (art: VueWrapper) => art.get('.received-amount__value').text();

beforeEach(() => {
  frames = new Map();
  sequence = 0;
  reduced = false;
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      frames.set(++sequence, callback);
      return sequence;
    })
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => frames.delete(id))
  );
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: reduced }))
  );
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('BuyXorReceivedAmount', () => {
  it('counts the amount up to what arrived, and lands exactly on it', async () => {
    const art = mountAmount('9.99');
    await frameAt(0);
    expect(visible(art)).toBe('0');
    await frameAt(300);
    const early = Number(visible(art));
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(9.99);
    await frameAt(700);
    expect(Number(visible(art))).toBeGreaterThan(early);
    await frameAt(5000);
    expect(visible(art)).toBe('9.99');
    expect(frames.size).toBe(0);
  });

  it('gives assistive technology the finished amount from the start, not the count', async () => {
    const art = mountAmount('1234.56789');
    // Four decimals for reading, cut the way the page always showed it.
    expect(art.get('.received-amount__text').text()).toBe('1,234.5678 XOR');
    expect(art.get('.received-amount__value').attributes('aria-hidden')).toBe('true');
    expect(art.get('.received-amount__unit').attributes('aria-hidden')).toBe('true');
    expect(art.get('.received-amount__coin').attributes('aria-hidden')).toBe('true');
    await frameAt(100);
    expect(art.get('.received-amount__text').text()).toBe('1,234.5678 XOR');
    // The count reserves the width of the finished amount, so the unit does not move while digits are added.
    expect(art.get('.received-amount__value').attributes('data-final')).toBe('1,234.5678');
  });

  it('shows the finished amount at once for reduced motion', () => {
    reduced = true;
    const art = mountAmount('9.99');
    expect(visible(art)).toBe('9.99');
    expect(frames.size).toBe(0);
  });

  it('throws confetti from the XOR coin once it is on screen', async () => {
    const art = mountAmount('2');
    const burst = art.getComponent({ name: 'RewardsBurst' });
    await nextTick();
    await nextTick();
    expect(burst.props('active')).toBe(true);
    expect(burst.props('count')).toBe(24);
    // The coin carries the bundled XOR logo, so nothing is fetched.
    expect(art.get('.received-amount__coin').element.style.getPropertyValue('--coin')).toContain('data:image/svg+xml');
  });

  it('follows a changed amount from where the count stands', async () => {
    const art = mountAmount('5');
    await frameAt(0);
    await frameAt(5000);
    expect(visible(art)).toBe('5');
    await art.setProps({ amount: '8' });
    await frameAt(6000);
    await frameAt(6300);
    const between = Number(visible(art));
    expect(between).toBeGreaterThan(5);
    expect(between).toBeLessThan(8);
    await frameAt(9000);
    expect(visible(art)).toBe('8');
    expect(art.get('.received-amount__text').text()).toBe('8 XOR');
  });

  it('shows an amount it cannot read as it came, without counting', () => {
    const art = mountAmount('soon');
    expect(art.get('.received-amount__text').text()).toBe('soon XOR');
    expect(visible(art)).toBe('');
    expect(frames.size).toBe(0);
  });

  it('is plain text and a coin: nothing to focus or press', () => {
    const art = mountAmount('3');
    expect(art.find('button, a, input, [tabindex]').exists()).toBe(false);
  });
});
