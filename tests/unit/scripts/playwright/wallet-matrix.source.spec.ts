import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const walletMatrixSource = fs.readFileSync(path.resolve(process.cwd(), 'scripts/playwright/wallet-matrix.mjs'), 'utf8');

describe('wallet matrix smoke runner source', () => {
  it('disables crashpad when launching persistent Chromium extension contexts', () => {
    expect(walletMatrixSource).toContain("'--disable-crashpad'");
    expect(walletMatrixSource).toContain('PERSISTENT_CONTEXT_ARGS.map');
  });

  it('uses isolated runtime copies of wallet extension profiles by default', () => {
    expect(walletMatrixSource).toContain(
      "const USE_RUNTIME_PROFILE_COPIES = process.env.WALLET_MATRIX_RUNTIME_COPIES !== '0';"
    );
    expect(walletMatrixSource).toContain('if (!USE_RUNTIME_PROFILE_COPIES && !FRESH_MODE)');
  });

  it('restores missing unpacked wallet extensions before launching persistent Chrome contexts', () => {
    expect(walletMatrixSource).toContain("import { ensureWalletExtensions } from './ensure-wallet-extensions.mjs';");
    expect(walletMatrixSource).toContain('await ensureWalletExtensions();');
  });

  it('prefers bundled Chromium for persistent extension automation', () => {
    expect(walletMatrixSource).toContain(
      "const PERSISTENT_CONTEXT_CHANNEL = process.env.WALLET_MATRIX_CHANNEL || 'chromium';"
    );
    expect(walletMatrixSource).toContain('channel: PERSISTENT_CONTEXT_CHANNEL');
  });

  it('refreshes extension origins after wallet selection so popup automation can attach', () => {
    expect(walletMatrixSource).toContain('resolveExtensionOrigin');
    expect(walletMatrixSource).toContain('extensionOrigin ||= await getWalletExtensionOrigin(wallet, context);');
  });

  it('uses deterministic wallet providers by default when local wallet profiles are empty', () => {
    expect(walletMatrixSource).toContain(
      "const USE_DETERMINISTIC_PROVIDER = process.env.WALLET_MATRIX_DETERMINISTIC_PROVIDER !== '0';"
    );
    expect(walletMatrixSource).toContain('await installDeterministicProvider(context, wallet);');
    expect(walletMatrixSource).toContain('deterministicProvider: USE_DETERMINISTIC_PROVIDER');
  });

  it('keeps stable wallet extension ids for deterministic origin fallback', () => {
    expect(walletMatrixSource).toContain("extensionId: 'mopnmbcafieddcagagdcbnhejhlodfdd'");
    expect(walletMatrixSource).toContain("extensionId: 'nhlnehondigmgckngjomcpcefcdplmgc'");
    expect(walletMatrixSource).toContain("extensionId: 'onhogfjeacnfoofkfgppdlbmlmnplgbn'");
    expect(walletMatrixSource).toContain("extensionId: 'fijngjgcjhjmmpcmkeiomlglpeiijkld'");
  });

  it('removes Playwright default extension-disabling flags for persistent wallet launches', () => {
    expect(walletMatrixSource).toContain(
      "const PERSISTENT_CONTEXT_IGNORE_DEFAULT_ARGS = ['--disable-extensions', '--disable-component-extensions-with-background-pages'];"
    );
    expect(walletMatrixSource).toContain('ignoreDefaultArgs: PERSISTENT_CONTEXT_IGNORE_DEFAULT_ARGS');
  });
});
