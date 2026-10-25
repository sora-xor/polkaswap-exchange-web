/** Minimum advertised by the existing new-wallet password guidance. */
export const NEW_ACCOUNT_PASSWORD_MIN_LENGTH = 8;

/**
 * Checks new-wallet passwords without trimming or changing their contents.
 * Count Unicode code points so surrogate pairs cannot bypass the minimum.
 * Existing-wallet import and unlock paths must not apply this policy.
 */
export const isValidNewAccountPassword = (password: string): boolean =>
  Array.from(password).length >= NEW_ACCOUNT_PASSWORD_MIN_LENGTH;
