import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
  }),
}));

const SccpPage = (await import('@/views/Sccp.vue')).default;

const validEthAddress = `0x${'1'.repeat(40)}`;

const mountView = () => mount(SccpPage);

async function fillValidPayloadFields(wrapper: ReturnType<typeof mountView>, amount: string): Promise<void> {
  await wrapper.get('input[placeholder="Wallet: 0x..."]').setValue(validEthAddress);
  await wrapper.get('input[inputmode="decimal"]').setValue(amount);
}

function getGenerateButton(wrapper: ReturnType<typeof mountView>) {
  const button = wrapper.findAll('button').find((item) => item.text() === 'sccp.generatePayload');
  if (!button) {
    throw new Error('Generate button was not rendered');
  }
  return button;
}

describe('Sccp.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('generates a stable payload with a precise string amount only after user action', async () => {
    const wrapper = mountView();
    const preciseAmount = '12345678901234567890.123456789012345678';

    await fillValidPayloadFields(wrapper, preciseAmount);

    expect(wrapper.find('pre').exists()).toBe(false);

    await getGenerateButton(wrapper).trigger('click');

    const payload = JSON.parse(wrapper.get('pre').text());

    expect(payload.amount).toBe(preciseAmount);
    expect(typeof payload.amount).toBe('string');
    expect(payload.generatedAt).toBe('2026-05-14T00:00:00.000Z');

    await wrapper.get('input[inputmode="decimal"]').setValue('1');
    await flushPromises();

    expect(wrapper.find('pre').exists()).toBe(false);
  });

  it('rejects exponent notation instead of silently changing the amount', async () => {
    const wrapper = mountView();

    await fillValidPayloadFields(wrapper, '1e3');

    const generateButton = getGenerateButton(wrapper);

    expect(generateButton.attributes('disabled')).toBeDefined();

    await generateButton.trigger('click');

    expect(wrapper.find('pre').exists()).toBe(false);
  });
});
