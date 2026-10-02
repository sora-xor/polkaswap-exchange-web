import { mount, flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import GetTsConversionRecovery from '@/features/misc/components/burn/GetTsConversionRecovery.vue';

const mocked = vi.hoisted(() => ({ verify: vi.fn(), web3: {} as Record<string, unknown>, provider: {} }));
vi.mock('@/composables/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/stores/web3', () => ({ useWeb3Store: () => mocked.web3 }));
vi.mock('@/utils/ethers-util', () => ({ default: { getEthersInstance: () => mocked.provider } }));
vi.mock('@/features/misc/lib/getTsConversionRecovery', () => ({ verifyGetTsConversionReplacement: mocked.verify }));
const original = '0x' + 'a'.repeat(64);
const replacement = '0x' + 'b'.repeat(64);

describe('explicit conversion replacement recovery', () => {
  beforeEach(() => {
    mocked.verify.mockReset();
    mocked.web3 = reactive({ evmAddress: '0x' + '1'.repeat(40), evmProviderNetwork: 1, evmProvider: { uuid: 'one' } });
  });
  it('never reads or submits anything until the user supplies a distinct valid hash and checks it', async () => {
    const w = mount(GetTsConversionRecovery, { props: { reference: original, purpose: 'xor' } });
    expect(w.get('button').attributes('disabled')).toBeDefined();
    await w.get('input').setValue(original);
    expect(w.get('button').attributes('disabled')).toBeDefined();
    expect(mocked.verify).not.toHaveBeenCalled();
    mocked.verify.mockResolvedValue({ state: 'received', reference: replacement, amount: '8' });
    await w.get('input').setValue(replacement);
    await w.get('button').trigger('click');
    await flushPromises();
    expect(mocked.verify).toHaveBeenCalledWith(
      mocked.provider,
      original,
      replacement,
      mocked.web3.evmAddress,
      'xor',
      expect.any(Function)
    );
    expect(w.emitted('verified')).toEqual([[{ state: 'received', reference: replacement, amount: '8' }]]);
    w.unmount();
  });
  it.each(['pending', 'unavailable'])('keeps the original reference for unverified %s evidence', async (state) => {
    const w = mount(GetTsConversionRecovery, { props: { reference: original } });
    mocked.verify.mockResolvedValue({ state, reference: replacement });
    await w.get('input').setValue(replacement);
    await w.get('button').trigger('click');
    await flushPromises();
    expect(w.emitted('verified')).toBeUndefined();
    expect(w.text()).toContain(`getTs.conversionProgress.${state}`);
    w.unmount();
  });
  it('discards evidence if the selected wallet changes during verification', async () => {
    let resolve!: (value: unknown) => void;
    mocked.verify.mockImplementation(
      () =>
        new Promise((finish) => {
          resolve = finish;
        })
    );
    const w = mount(GetTsConversionRecovery, { props: { reference: original } });
    await w.get('input').setValue(replacement);
    await w.get('button').trigger('click');
    mocked.web3.evmAddress = '0x' + '2'.repeat(40);
    resolve({ state: 'received', reference: replacement, amount: '8' });
    await flushPromises();
    expect(w.emitted('verified')).toBeUndefined();
    expect(mocked.verify.mock.calls[0][5]()).toBe(false);
    w.unmount();
  });
  it('keeps provider failures retryable and refuses a receipt for another reference', async () => {
    const w = mount(GetTsConversionRecovery, { props: { reference: original } });
    mocked.verify
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce({ state: 'received', reference: original, amount: '8' });
    await w.get('input').setValue(replacement);
    await w.get('button').trigger('click');
    await flushPromises();
    expect(w.text()).toContain('getTs.conversionProgress.unavailable');
    expect(w.get('button').attributes('disabled')).toBeUndefined();
    await w.get('button').trigger('click');
    await flushPromises();
    expect(w.emitted('verified')).toBeUndefined();
    w.unmount();
  });
});
