import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { cryptoWaitReady, mnemonicGenerate, signatureVerify } from '@polkadot/util-crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createLocalSignerAccount, LOCAL_SIGNER_SOURCE } from '../../../e2e/ui/support/local-signer';

describe('local e2e signer support', () => {
  let tempDir = '';
  let mnemonicFile = '';

  beforeEach(async () => {
    await cryptoWaitReady();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'polkaswap-local-signer-'));
    mnemonicFile = path.join(tempDir, 'mnemonic.txt');
    await fs.writeFile(mnemonicFile, mnemonicGenerate(), 'utf8');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('derives a SORA account and signs raw payloads without persisting the secret', async () => {
    const account = await createLocalSignerAccount({ mnemonicFile });
    const payload = { data: u8aToHex(new TextEncoder().encode('polkaswap-local-signer-test')) };
    const result = account.signRaw(payload);

    expect(account.address.startsWith('cn')).toBe(true);
    expect(account.recipientAddress.startsWith('cn')).toBe(true);
    expect(account.recipientAddress).not.toBe(account.address);
    expect(account.source).toBe(LOCAL_SIGNER_SOURCE);
    expect(result.signature.startsWith('0x01')).toBe(true);
    expect(signatureVerify(hexToU8a(payload.data), result.signature, account.address).isValid).toBe(true);
  });

  it('rejects an unexpected derived address before a live signer can be installed', async () => {
    await expect(
      createLocalSignerAccount({
        mnemonicFile,
        expectedAddress: 'cnRuw2R6EVgQW3e4h8XeiFym2iU17fNsms15zRGcg9YEJndAs',
      })
    ).rejects.toThrow(/address mismatch/i);
  });
});
