type AccountInvitationOptions = {
  getAccountIdentity: () => string;
  getAccountAddress: () => string;
  isLoggedIn: () => boolean;
  getReferrer: () => Promise<void>;
  getReferrerAddress: () => string;
  getStorageReferrer: () => string;
  resetStorageReferrer: () => void;
  setVisible: (visible: boolean) => void;
};

/** Keeps referral invitation dialogs bound to the wallet account that requested them. */
export function createAccountInvitation(options: AccountInvitationOptions) {
  let generation = 0;

  /** Hides the prior account's dialog and invalidates its pending referrer lookup. */
  const invalidateInvitation = (): void => {
    generation += 1;
    options.setVisible(false);
  };

  /** Applies a referrer lookup only if neither the account nor the invitation changed. */
  const confirmInvitation = async (): Promise<void> => {
    const requestedGeneration = ++generation;
    const identity = options.getAccountIdentity();
    if (!options.isLoggedIn() || !options.getAccountAddress()) return;

    await options.getReferrer();
    if (requestedGeneration !== generation || !options.isLoggedIn() || identity !== options.getAccountIdentity())
      return;

    const storedReferrer = options.getStorageReferrer();
    if (!storedReferrer) return;
    if (storedReferrer === options.getAccountAddress()) {
      options.resetStorageReferrer();
    } else if (!options.getReferrerAddress()) {
      options.setVisible(true);
    }
  };

  return { confirmInvitation, invalidateInvitation };
}
