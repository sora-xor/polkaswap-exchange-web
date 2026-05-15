import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import STooltip from '@/lib/soramitsu-ui/components/Tooltip/STooltip.vue';

async function showHoverTooltip(wrapper: ReturnType<typeof mount>): Promise<void> {
  await wrapper.get('[data-testid="tooltip-trigger"]').trigger('mouseenter');
  vi.runOnlyPendingTimers();
  await nextTick();
  await nextTick();
}

describe('STooltip', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('teleports hover content to the overlay layer with custom popper classes', async () => {
    vi.useFakeTimers();

    const wrapper = mount(STooltip, {
      attachTo: document.body,
      props: {
        content: 'Accounts are digital addresses',
        popperClass: 'stats-tooltip',
      },
      slots: {
        default: '<button class="tooltip-trigger">Info</button>',
      },
      global: {
        stubs: {
          SPopoverPanel: false,
          's-popover-panel': false,
        },
      },
    });

    expect(document.body.querySelector('.s-tooltip-popper')).toBeNull();

    await showHoverTooltip(wrapper);

    const popper = document.body.querySelector('.s-tooltip-popper.stats-tooltip');
    const tooltipBody = document.body.querySelector('[data-testid="tooltip-body"]');

    expect(popper).not.toBeNull();
    expect(tooltipBody?.textContent).toContain('Accounts are digital addresses');
    expect(wrapper.element.contains(tooltipBody)).toBe(false);
  });
});
