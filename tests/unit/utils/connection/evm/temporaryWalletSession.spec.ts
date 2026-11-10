import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  approveTemporaryWalletRequest,
  rejectTemporaryWalletRequest,
  requestTemporaryWalletApproval,
  setTemporaryWalletAddress,
  setTemporaryWalletAutoApproval,
  setTemporaryWalletPersisted,
  temporaryWalletSession,
  type TemporaryWalletApproval,
} from '@/utils/connection/evm/temporaryWalletSession';

const figures = { gasLimit: '125000', maxFeePerGas: '21', estimatedFee: '1100', maxFee: '2625000' };
const request = { from: '0xabc', to: '0xdef', value: '5', data: '0x', ...figures };

afterEach(() => {
  const pending = temporaryWalletSession.request;
  if (pending && !pending.busy) rejectTemporaryWalletRequest(pending.id);
  setTemporaryWalletAutoApproval(null);
  setTemporaryWalletAddress('');
});

describe('temporary wallet session', () => {
  it('shows one request, signs it only on approval and clears it with the hash', async () => {
    const approve = vi.fn(async (): Promise<TemporaryWalletApproval> => ({ hash: '0xhash' }));
    const result = requestTemporaryWalletApproval(request, approve);
    const shown = temporaryWalletSession.request!;
    expect(shown).toMatchObject({ ...request, feeIncreased: false, busy: false });
    expect(approve).not.toHaveBeenCalled();

    await approveTemporaryWalletRequest(shown.id + 1);
    expect(approve).not.toHaveBeenCalled();
    await approveTemporaryWalletRequest(shown.id);
    await expect(result).resolves.toBe('0xhash');
    expect(approve).toHaveBeenCalledOnce();
    expect(temporaryWalletSession.request).toBeNull();
  });

  it('shows raised figures for a second approval instead of signing them', async () => {
    const approve = vi
      .fn<() => Promise<TemporaryWalletApproval>>()
      .mockResolvedValueOnce({ retry: { ...figures, maxFee: '9999999' } })
      .mockResolvedValueOnce({ hash: '0xsecond' });
    const result = requestTemporaryWalletApproval(request, approve);
    const id = temporaryWalletSession.request!.id;
    await approveTemporaryWalletRequest(id);
    expect(temporaryWalletSession.request).toMatchObject({ id, maxFee: '9999999', feeIncreased: true, busy: false });
    await approveTemporaryWalletRequest(id);
    await expect(result).resolves.toBe('0xsecond');
  });

  it('rejects with code 4001, but not while the transaction is being signed', async () => {
    let finish!: (value: TemporaryWalletApproval) => void;
    const approve = vi.fn(() => new Promise<TemporaryWalletApproval>((resolve) => (finish = resolve)));
    const result = requestTemporaryWalletApproval(request, approve);
    const id = temporaryWalletSession.request!.id;
    const approving = approveTemporaryWalletRequest(id);
    expect(temporaryWalletSession.request!.busy).toBe(true);
    rejectTemporaryWalletRequest(id);
    finish({ hash: '0xsigned' });
    await approving;
    await expect(result).resolves.toBe('0xsigned');

    const rejected = requestTemporaryWalletApproval(request, approve);
    rejectTemporaryWalletRequest(temporaryWalletSession.request!.id);
    await expect(rejected).rejects.toMatchObject({ code: 4001, message: 'User rejected the request.' });
    expect(temporaryWalletSession.request).toBeNull();
  });

  it('refuses a second request while one waits, and passes signing errors to the caller', async () => {
    const first = requestTemporaryWalletApproval(request, async () => {
      throw Object.assign(new Error('insufficient funds'), { code: -32000 });
    });
    await expect(requestTemporaryWalletApproval(request, vi.fn())).rejects.toMatchObject({ code: -32002 });
    await approveTemporaryWalletRequest(temporaryWalletSession.request!.id);
    await expect(first).rejects.toMatchObject({ code: -32000 });
    expect(temporaryWalletSession.request).toBeNull();
  });

  it('asks before the tab closes only while the wallet lives in page memory alone', async () => {
    const unloadBlocked = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    setTemporaryWalletAddress('0xABCDEF');
    expect(temporaryWalletSession).toMatchObject({ address: '0xabcdef', persisted: false });
    expect(unloadBlocked()).toBe(true);
    setTemporaryWalletPersisted(true);
    expect(temporaryWalletSession.persisted).toBe(true);
    expect(unloadBlocked()).toBe(false);
    setTemporaryWalletPersisted(false);
    expect(unloadBlocked()).toBe(true);
    setTemporaryWalletAddress('0xabcdef', true);
    expect(unloadBlocked()).toBe(false);

    const result = requestTemporaryWalletApproval(request, vi.fn());
    setTemporaryWalletAddress('');
    await expect(result).rejects.toMatchObject({ code: 4900 });
    expect(temporaryWalletSession).toMatchObject({ address: '', persisted: false });
    expect(unloadBlocked()).toBe(false);
    setTemporaryWalletPersisted(true);
    expect(temporaryWalletSession.persisted).toBe(false);
  });

  it('signs purchase steps the policy accepts without showing them, and still asks for everything else', async () => {
    setTemporaryWalletAddress('0xabc');
    const policy = vi.fn((item: { to: string }) => item.to === '0xpurchase');
    setTemporaryWalletAutoApproval(policy);
    const automatic = vi.fn(async (): Promise<TemporaryWalletApproval> => ({ hash: '0xauto' }));
    await expect(requestTemporaryWalletApproval({ ...request, to: '0xpurchase' }, automatic)).resolves.toBe('0xauto');
    expect(automatic).toHaveBeenCalledOnce();
    expect(temporaryWalletSession.request).toBeNull();

    const other = requestTemporaryWalletApproval(request, vi.fn());
    other.catch(() => undefined);
    expect(temporaryWalletSession.request).toMatchObject({ to: '0xdef' });
    rejectTemporaryWalletRequest(temporaryWalletSession.request!.id);
    await expect(other).rejects.toMatchObject({ code: 4001 });
  });

  it('retries an automatic step while fees move, then gives up with a clear error', async () => {
    setTemporaryWalletAddress('0xabc');
    setTemporaryWalletAutoApproval(() => true);
    const raised = { retry: { ...figures, maxFee: '1' } };
    const settles = vi
      .fn<() => Promise<TemporaryWalletApproval>>()
      .mockResolvedValueOnce(raised)
      .mockResolvedValueOnce({ hash: '0xsecond' });
    await expect(requestTemporaryWalletApproval(request, settles)).resolves.toBe('0xsecond');
    const keepsRising = vi.fn(async (): Promise<TemporaryWalletApproval> => raised);
    await expect(requestTemporaryWalletApproval(request, keepsRising)).rejects.toMatchObject({ code: -32603 });
    expect(keepsRising).toHaveBeenCalledTimes(3);
  });

  it('treats a failing policy as "ask", and ends automatic signing when the wallet closes', async () => {
    setTemporaryWalletAddress('0xabc');
    setTemporaryWalletAutoApproval(() => {
      throw new Error('broken policy');
    });
    const asked = requestTemporaryWalletApproval(request, vi.fn());
    asked.catch(() => undefined);
    expect(temporaryWalletSession.request).not.toBeNull();
    rejectTemporaryWalletRequest(temporaryWalletSession.request!.id);

    setTemporaryWalletAutoApproval(() => true);
    setTemporaryWalletAddress('');
    setTemporaryWalletAddress('0xabc');
    const afterClose = requestTemporaryWalletApproval(request, vi.fn());
    afterClose.catch(() => undefined);
    expect(temporaryWalletSession.request).not.toBeNull();
  });
});
