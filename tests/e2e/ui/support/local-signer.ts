import fs from 'node:fs/promises';
import path from 'node:path';
import { Keyring } from '@polkadot/keyring';
import { TypeRegistry } from '@polkadot/types';
import { hexToU8a, isHex, u8aToHex } from '@polkadot/util';
import { cryptoWaitReady, encodeAddress, mnemonicValidate } from '@polkadot/util-crypto';

import type { Page } from '@playwright/test';
import type { KeyringPair } from '@polkadot/keyring/types';
import type { SignerPayloadJSON, SignerResult } from '@polkadot/types/types';

export const LOCAL_SIGNER_SOURCE = 'polkaswap-e2e-signer';
export const LOCAL_SIGNER_NAME = 'Polkaswap E2E Signer';
export const LOCAL_SIGNER_RECIPIENT_DERIVATION = '//polkaswap-e2e-recipient';
export const SORA_SS58_FORMAT = 69;

export type LocalSignerOptions = {
  mnemonicFile?: string;
  expectedAddress?: string;
  source?: string;
  name?: string;
};

export type LocalSignerAccount = {
  address: string;
  recipientAddress: string;
  source: string;
  name: string;
  signPayload: (payload: SignerPayloadJSON) => SignerResult;
  signRaw: (payload: { data: string }) => SignerResult;
};

let signerRequestId = 0;

const nextSignerRequestId = (): number => {
  signerRequestId += 1;
  return signerRequestId;
};

const readMnemonic = async (mnemonicFile = '../sora-key.txt'): Promise<string> => {
  const mnemonicPath = path.resolve(process.cwd(), mnemonicFile);
  const mnemonic = (await fs.readFile(mnemonicPath, 'utf8')).trim().replace(/\s+/g, ' ');

  if (!mnemonicValidate(mnemonic)) {
    throw new Error(`Invalid mnemonic in ${mnemonicPath}`);
  }

  return mnemonic;
};

const createSignerResult = (signature: string): SignerResult => ({
  id: nextSignerRequestId(),
  signature,
});

const signPayloadWithPair = (pair: KeyringPair, payload: SignerPayloadJSON): SignerResult => {
  const registry = new TypeRegistry();
  const extrinsicPayload = registry.createType('ExtrinsicPayload', payload, { version: payload.version });
  const signature = u8aToHex(pair.sign(extrinsicPayload.toU8a({ method: true }), { withType: true }));

  return createSignerResult(signature);
};

const signRawWithPair = (pair: KeyringPair, payload: { data: string }): SignerResult => {
  if (!isHex(payload.data)) {
    throw new Error('signRaw payload data must be hex encoded.');
  }

  const signature = u8aToHex(pair.sign(hexToU8a(payload.data), { withType: true }));

  return createSignerResult(signature);
};

/** Creates a memory-only signer account from a mnemonic file without logging or persisting the secret. */
export async function createLocalSignerAccount(options: LocalSignerOptions = {}): Promise<LocalSignerAccount> {
  await cryptoWaitReady();

  const mnemonic = await readMnemonic(options.mnemonicFile);
  const keyring = new Keyring({ type: 'sr25519', ss58Format: SORA_SS58_FORMAT });
  const pair = keyring.addFromUri(mnemonic);
  const recipientPair = keyring.addFromUri(`${mnemonic}${LOCAL_SIGNER_RECIPIENT_DERIVATION}`);
  const address = encodeAddress(pair.publicKey, SORA_SS58_FORMAT);
  const recipientAddress = encodeAddress(recipientPair.publicKey, SORA_SS58_FORMAT);
  const expectedAddress = options.expectedAddress?.trim();

  if (expectedAddress && expectedAddress !== address) {
    throw new Error(`Local signer address mismatch. Expected ${expectedAddress}, derived ${address}.`);
  }

  return {
    address,
    recipientAddress,
    source: options.source ?? LOCAL_SIGNER_SOURCE,
    name: options.name ?? LOCAL_SIGNER_NAME,
    signPayload: (payload) => signPayloadWithPair(pair, payload),
    signRaw: (payload) => signRawWithPair(pair, payload),
  };
}

/** Installs a Polkadot extension-compatible provider before the app initializes. */
export async function installLocalSignerProvider(page: Page, account: LocalSignerAccount): Promise<void> {
  await page.exposeFunction('__psE2eSignRaw', (payload: { data: string }) => account.signRaw(payload));

  await page.addInitScript(({ address, name, source }) => {
    const injectedWindow = window as typeof window & {
      __psE2eSignRaw?: (payload: { data: string }) => Promise<SignerResult>;
      injectedWeb3?: Record<string, unknown>;
    };
    const injectedAccount = {
      address,
      name,
      source,
      type: 'sr25519',
      genesisHash: null,
    };
    const subscribers = new Set<(accounts: (typeof injectedAccount)[]) => void>();
    const accounts = {
      get: async () => [injectedAccount],
      subscribe: async (callback: (accounts: (typeof injectedAccount)[]) => void) => {
        subscribers.add(callback);
        callback([injectedAccount]);

        return () => {
          subscribers.delete(callback);
        };
      },
    };
    // Let the app's chain-aware registry create the raw signing bytes. Re-encoding
    // SignerPayloadJSON here can miss SORA-specific signed extension types.
    const signer = {
      signRaw: async (payload: { data: string }) => injectedWindow.__psE2eSignRaw?.(payload),
    };

    injectedWindow.injectedWeb3 = injectedWindow.injectedWeb3 || {};
    injectedWindow.injectedWeb3[source] = {
      version: 'e2e',
      enable: async () => ({
        name: source,
        version: 'e2e',
        accounts,
        metadata: undefined,
        provider: undefined,
        signer,
      }),
    };
  }, account);
}
