import { AppWallet } from '../consts';
import type { KeyringPair$Json, PolkadotJsAccount } from '../types/common';
import type { Unsubcall } from '@polkadot/extension-inject/types';
import type { WithKeyring } from '@sora-substrate/sdk';
export { isAppStorageSource } from '../services/wallet';
/** Locks the currently selected keyring pair. */
export declare const lockAccountPair: (api: WithKeyring) => void;
/** Unlocks the active keyring pair using the provided password. */
export declare const unlockAccountPair: (api: WithKeyring, password: string) => void;
/**
 * Logs into the SDK with the selected account, updating the signer when using
 * external wallet sources and ensuring stale sessions are cleared.
 */
export declare const loginApi: (
  api: WithKeyring,
  accountData: PolkadotJsAccount,
  currentAccountStoredInApp?: boolean
) => Promise<void>;
/** Clears the current session and optionally forgets the account from storage. */
export declare const logoutApi: (api: WithKeyring, forget?: boolean) => void;
/** Injects the signer from the selected wallet into the SDK. */
export declare const updateApiSigner: (api: WithKeyring, source: AppWallet) => Promise<void>;
/** Validates that the selected external account still exists in the extension. */
export declare const checkExternalAccount: (account: PolkadotJsAccount) => Promise<void>;
/**
 * Subscribes to account updates for a given wallet source and keeps the SDK
 * cache in sync with extension changes.
 */
export declare const subscribeToWalletAccounts: (
  api: WithKeyring,
  wallet: AppWallet,
  callback: (accounts: PolkadotJsAccount[]) => void
) => Promise<Nullable<Unsubcall>>;
/** Reads a downloaded account JSON file into a keyring-compatible object. */
export declare const parseAccountJson: (file: File) => Promise<KeyringPair$Json>;
/** Downloads a keyring JSON blob to disk. */
export declare const exportAccountJson: (pairJson: KeyringPair$Json) => void;
/** Validates the password for an account JSON by attempting to re-export it. */
export declare const verifyAccountJson: (
  api: WithKeyring,
  pairJson: KeyringPair$Json,
  password: string
) => KeyringPair$Json;
export type CreateAccountArgs = {
  seed: string;
  name: string;
  password: string;
  passwordConfirm?: string;
  saveAccount?: boolean;
  exportAccount?: boolean;
};
/**
 * Creates a new keyring pair from the provided seed/mnemonic and optionally
 * persists or exports it depending on the supplied flags.
 */
export declare const createAccount: (
  api: WithKeyring,
  { seed, name, password, passwordConfirm, saveAccount, exportAccount }: CreateAccountArgs
) => KeyringPair$Json;
/** Retrieves the keyring pair by address and downloads its JSON representation. */
export declare const exportAccount: (
  api: WithKeyring,
  {
    address,
    password,
  }: {
    address: string;
    password: string;
  }
) => void;
/** Restores an account JSON into the keyring using the provided password. */
export declare const restoreAccount: (
  api: WithKeyring,
  {
    json,
    password,
  }: {
    json: KeyringPair$Json;
    password: string;
  }
) => void;
/** Removes an account from the keyring storage. */
export declare const deleteAccount: (api: WithKeyring, address?: string) => void;
