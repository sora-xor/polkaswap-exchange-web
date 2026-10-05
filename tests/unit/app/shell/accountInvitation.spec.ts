import { describe, expect, it, vi } from 'vitest';

import { createAccountInvitation } from '@/app/shell/accountInvitation';

/** Builds a mutable wallet fixture to exercise account changes during a referrer lookup. */
function createFixture() {
  const state = { account: 'alice', loggedIn: true, referrer: '', storedReferrer: 'bob' };
  const setVisible = vi.fn();
  const getReferrer = vi.fn(async () => undefined);
  const resetStorageReferrer = vi.fn();
  const invitation = createAccountInvitation({
    getAccountIdentity: () => state.account,
    getAccountAddress: () => state.account,
    isLoggedIn: () => state.loggedIn,
    getReferrer,
    getReferrerAddress: () => state.referrer,
    getStorageReferrer: () => state.storedReferrer,
    resetStorageReferrer,
    setVisible,
  });
  return { state, setVisible, getReferrer, resetStorageReferrer, ...invitation };
}

describe('account invitations', () => {
  it('shows an invitation for the current account and discards self-referrals', async () => {
    const fixture = createFixture();
    await fixture.confirmInvitation();
    expect(fixture.setVisible).toHaveBeenCalledWith(true);
    fixture.state.storedReferrer = 'alice';
    await fixture.confirmInvitation();
    expect(fixture.resetStorageReferrer).toHaveBeenCalledOnce();
  });

  it('cannot show a dialog or clear a referral after the initiating account changes', async () => {
    const fixture = createFixture();
    let resolveLookup!: () => void;
    fixture.getReferrer.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLookup = resolve;
        })
    );
    const request = fixture.confirmInvitation();
    fixture.state.account = 'bob';
    fixture.invalidateInvitation();
    resolveLookup();
    await request;
    expect(fixture.setVisible).toHaveBeenCalledExactlyOnceWith(false);
    expect(fixture.resetStorageReferrer).not.toHaveBeenCalled();
  });

  it('invalidates a pending dialog on logout even if the address is retained', async () => {
    const fixture = createFixture();
    let resolveLookup!: () => void;
    fixture.getReferrer.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLookup = resolve;
        })
    );
    const request = fixture.confirmInvitation();
    fixture.state.loggedIn = false;
    resolveLookup();
    await request;
    expect(fixture.setVisible).not.toHaveBeenCalled();
  });
});
