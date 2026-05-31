import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  buildFundingHint,
  buildPackageCommandSpecs,
  buildPermissionHint,
  buildAuthorityConvertArgs,
  createCidGatewayPath,
  createCidGatewayUrl,
  buildStorageUploadHint,
  isAlreadyRegisteredSubmitError,
  buildProposalCommandSpec,
  buildPublishCommandSpecs,
  createIrohaClientConfig,
  derivePublicKeyFromCanonicalAccountHex,
  derivePublicKeyFromPrivateKeyHex,
  createSiteBindingDocument,
  createArtifactDirectory,
  createArtifactPaths,
  deriveHostnameFromToriiUrl,
  encodeBase32Lower,
  resolveContentCidFromManifestValue,
  resolveSubmittedEpochFromStatusValue,
  resolveBuildToolCommand,
  resolvePublishCredentials,
  shouldSignManifest,
  upsertSiteBindingsFile,
  validateRuntimeEnvConfig,
} from '../../../../scripts/sorafs/deploy';

describe('deriveHostnameFromToriiUrl', () => {
  it('uses the hostname from the Torii URL', () => {
    expect(deriveHostnameFromToriiUrl('https://taira.sora.org/v1/sorafs/aliases')).toBe('taira.sora.org');
  });
});

describe('createArtifactDirectory', () => {
  it('places artefacts under artifacts/sorafs/<host>/<timestamp>', () => {
    expect(createArtifactDirectory('/repo', 'taira.sora.org', '20260328T120000Z')).toBe(
      '/repo/artifacts/sorafs/taira.sora.org/20260328T120000Z'
    );
  });
});

describe('CID helpers', () => {
  it('encodes lowercase base32 without padding', () => {
    expect(encodeBase32Lower([0x01, 0x71, 0x1f, 0x20])).toBe('afyr6ia');
  });

  it('derives the canonical content CID from manifest JSON', () => {
    expect(
      resolveContentCidFromManifestValue({
        root_cid: [0x01, 0x71, 0x1f, 0x20, 0xf3, 0x09, 0x6a, 0xe2],
      })
    ).toBe('bafyr6ihtbfvoe');
  });

  it('builds the canonical Torii gateway URL for a content CID', () => {
    const cid = 'bafyr6ihtbfvoecidokqedu2nttwsb7rwnq5fekpdeqhkt2qxru27wivxy4';
    expect(createCidGatewayPath(cid)).toBe(`/sorafs/cid/${cid}/`);
    expect(createCidGatewayUrl('https://taira.sora.org/v1/sorafs/pin', cid)).toBe(
      `https://taira.sora.org/sorafs/cid/${cid}/`
    );
  });
});

describe('resolvePublishCredentials', () => {
  it('prefers explicit options over environment defaults', () => {
    expect(
      resolvePublishCredentials(
        {
          authority: 'alice@test',
          privateKeyFile: '/keys/alice.key',
        },
        {
          SORAFS_AUTHORITY: 'bob@test',
          SORAFS_PRIVATE_KEY: 'inline',
        }
      )
    ).toEqual({
      authority: 'alice@test',
      privateKey: undefined,
      privateKeyFile: '/keys/alice.key',
    });
  });

  it('normalizes half-width authority literals before publish', () => {
    expect(
      resolvePublishCredentials(
        {},
        {
          SORAFS_AUTHORITY: 'testuﾛ1NrpｽﾓaMﾒﾌNhziﾙZfvWn9ﾙﾘvFqxｾmUﾓﾏ2ﾊｷﾍhqzｾ71P2D3',
          SORAFS_PRIVATE_KEY: 'inline',
        }
      )
    ).toEqual({
      authority: 'testuロ1NrpスモaMメフNhziルZfvWn9ルリvFqxセmUモマ2ハキヘhqzセ71P2D3',
      privateKey: 'inline',
      privateKeyFile: undefined,
    });
  });

  it('rejects ambiguous private-key sources', () => {
    expect(() =>
      resolvePublishCredentials(
        {
          authority: 'alice@test',
          privateKey: 'inline',
          privateKeyFile: '/keys/alice.key',
        },
        {}
      )
    ).toThrow('Use exactly one of `SORAFS_PRIVATE_KEY` or `SORAFS_PRIVATE_KEY_FILE`.');
  });
});

describe('validateRuntimeEnvConfig', () => {
  it('rejects the legacy dev websocket config for env.taira.json', () => {
    expect(() =>
      validateRuntimeEnvConfig('env.taira.json', {
        NETWORK_TYPE: 'Dev',
        CHAIN_GENESIS_HASH: '',
        DEFAULT_NETWORKS: [
          {
            address: 'wss://ws.framenode-1.r0.dev.sora2.soramitsu.co.jp',
          },
        ],
      })
    ).toThrow('`public/env.taira.json` still points at legacy SORA dev websocket nodes.');
  });

  it('accepts live websocket endpoints for env.taira.json', () => {
    expect(() =>
      validateRuntimeEnvConfig('env.taira.json', {
        NETWORK_TYPE: 'Prod',
        CHAIN_GENESIS_HASH: '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5',
        DEFAULT_NETWORKS: [
          {
            address: 'wss://ws.mof.sora.org',
          },
        ],
      })
    ).not.toThrow();
  });
});

describe('env.taira.json', () => {
  it('keeps node selection aligned with the main Polkaswap runtime config', () => {
    const prodConfig = JSON.parse(readFileSync(join(process.cwd(), 'public/env.json'), 'utf8')) as {
      DEFAULT_NETWORKS: unknown;
      NETWORK_TYPE: unknown;
      CHAIN_GENESIS_HASH: unknown;
    };
    const tairaConfig = JSON.parse(readFileSync(join(process.cwd(), 'public/env.taira.json'), 'utf8')) as {
      DEFAULT_NETWORKS: unknown;
      NETWORK_TYPE: unknown;
      CHAIN_GENESIS_HASH: unknown;
    };

    expect(tairaConfig.DEFAULT_NETWORKS).toEqual(prodConfig.DEFAULT_NETWORKS);
    expect(tairaConfig.NETWORK_TYPE).toBe(prodConfig.NETWORK_TYPE);
    expect(tairaConfig.CHAIN_GENESIS_HASH).toBe(prodConfig.CHAIN_GENESIS_HASH);
  });
});

describe('shouldSignManifest', () => {
  it('enables signing when the token env var is present', () => {
    expect(shouldSignManifest({ SIGSTORE_ID_TOKEN: 'jwt' })).toBe(true);
  });

  it('stays disabled when no token is present', () => {
    expect(shouldSignManifest({})).toBe(false);
  });
});

describe('buildPackageCommandSpecs', () => {
  it('builds the expected CAR, manifest, proof, and sign commands', () => {
    const paths = createArtifactPaths('/repo/artifacts/sorafs/taira/20260328T120000Z');
    const specs = buildPackageCommandSpecs(
      {
        sorafsCli: { command: 'cargo', args: ['run', '--'], cwd: '/iroha' },
        paths,
      },
      true,
      'SIGSTORE_ID_TOKEN'
    );

    expect(specs).toHaveLength(4);
    expect(specs[0]?.args).toContain(`--input=${paths.stageDir}`);
    expect(specs[1]?.args).toContain(`--manifest-json-out=${paths.manifestJsonPath}`);
    expect(specs[2]?.args).toContain(`--chunk-plan=${paths.planPath}`);
    expect(specs[2]?.args).toContain(`--summary-out=${paths.proofSummaryPath}`);
    expect(specs[3]?.args).toContain('--identity-token-env=SIGSTORE_ID_TOKEN');
  });
});

describe('buildAuthorityConvertArgs', () => {
  it('passes the Taira network prefix when provided', () => {
    expect(buildAuthorityConvertArgs('testuExample', '369')).toEqual([
      'tools',
      'address',
      'convert',
      '--format',
      'canonical-hex',
      '--network-prefix',
      '369',
      'testuExample',
    ]);
  });

  it('omits the network prefix when none is provided', () => {
    expect(buildAuthorityConvertArgs('testuExample')).toEqual([
      'tools',
      'address',
      'convert',
      '--format',
      'canonical-hex',
      'testuExample',
    ]);
  });
});

describe('buildProposalCommandSpec', () => {
  it('builds the manifest proposal command with the resolved epoch', () => {
    const paths = createArtifactPaths('/repo/artifacts/sorafs/taira/20260328T120000Z');
    const spec = buildProposalCommandSpec(
      {
        sorafsCli: { command: 'cargo', args: ['run', '--'], cwd: '/iroha' },
        paths,
      },
      '7'
    );

    expect(spec.args).toContain('proposal');
    expect(spec.args).toContain(`--submitted-epoch=7`);
    expect(spec.args).toContain(`--proposal-out=${paths.proposalPath}`);
  });
});

describe('buildPublishCommandSpecs', () => {
  it('includes proposal, submit, storage pin, and route-plan commands when a site hostname is requested', () => {
    const paths = createArtifactPaths('/repo/artifacts/sorafs/taira/20260328T120000Z');
    const specs = buildPublishCommandSpecs({
      sorafsCli: { command: 'cargo', args: ['run', '--'], cwd: '/iroha' },
      routePlanCli: { command: 'cargo', args: ['run', '--'], cwd: '/iroha' },
      clientConfigPath: '/tmp/taira-client.toml',
      paths,
      toriiUrl: 'https://taira.sora.org',
      hostname: 'taira.sora.org',
      siteHostname: 'polkaswap.sora.org',
      authority: 'alice@test',
      submittedEpoch: '7',
      networkPrefix: '369',
      privateKeyFile: '/keys/alice.key',
    });

    expect(specs).toHaveLength(4);
    expect(specs[0]?.args).toContain('proposal');
    expect(specs[0]?.args).toContain(`--proposal-out=${paths.proposalPath}`);
    expect(specs[1]?.args).toContain('--submitted-epoch=7');
    expect(specs[1]?.args).toContain('--private-key-file=/keys/alice.key');
    expect(specs[1]?.args).toContain('--network-prefix=369');
    expect(specs[2]?.args).toEqual(
      expect.arrayContaining([
        '--machine',
        '--config=/tmp/taira-client.toml',
        'app',
        'sorafs',
        'storage',
        'pin',
        `--payload=${paths.stageDir}`,
      ])
    );
    expect(specs[3]?.args).toContain('--machine');
    expect(specs[3]?.args).toContain(`--hostname=polkaswap.sora.org`);
    expect(specs[3]?.args).toContain(`--out=${paths.routePlanPath}`);
  });

  it('skips route-plan generation when no site hostname is configured', () => {
    const paths = createArtifactPaths('/repo/artifacts/sorafs/taira/20260328T120000Z');
    const specs = buildPublishCommandSpecs({
      sorafsCli: { command: 'cargo', args: ['run', '--'], cwd: '/iroha' },
      routePlanCli: { command: 'cargo', args: ['run', '--'], cwd: '/iroha' },
      clientConfigPath: '/tmp/taira-client.toml',
      paths,
      toriiUrl: 'https://taira.sora.org',
      hostname: 'taira.sora.org',
      authority: 'alice@test',
      submittedEpoch: '7',
      networkPrefix: '369',
      privateKeyFile: '/keys/alice.key',
    });

    expect(specs).toHaveLength(3);
    expect(specs.some((spec) => spec.args.includes('route-plan'))).toBe(false);
  });
});

describe('createIrohaClientConfig', () => {
  it('renders a minimal client.toml for the storage pin helper', () => {
    expect(
      createIrohaClientConfig(
        'https://taira.sora.org',
        'ED0120ABCDEF',
        '802620ABCDEF',
        '809574f5-fee7-5e69-bfcf-52451e42d50f'
      )
    ).toBe(
      [
        'chain = "809574f5-fee7-5e69-bfcf-52451e42d50f"',
        'torii_url = "https://taira.sora.org/"',
        '',
        '[basic_auth]',
        'web_login = "mad_hatter"',
        'password = "ilovetea"',
        '',
        '[account]',
        'domain = "wonderland.universal"',
        'public_key = "ED0120ABCDEF"',
        'private_key = "802620ABCDEF"',
        '',
      ].join('\n')
    );
  });
});

describe('derivePublicKeyFromCanonicalAccountHex', () => {
  it('rebuilds the Ed25519 multihash from canonical account-address hex', () => {
    expect(
      derivePublicKeyFromCanonicalAccountHex(
        '0x02000120ce7fa46c9dce7ea4b125e2e36bdb63ea33073e7590ac92816ae1e861b7048b03'
      )
    ).toBe('ed0120CE7FA46C9DCE7EA4B125E2E36BDB63EA33073E7590AC92816AE1E861B7048B03');
  });
});

describe('derivePublicKeyFromPrivateKeyHex', () => {
  it('derives the Ed25519 public key from an Iroha multihash private key', () => {
    expect(
      derivePublicKeyFromPrivateKeyHex('8026207E82135F0CF3DA3F85DDF07E2FB797E0FBB62BCE789034DCE3A7D76C78106938')
    ).toBe('ed0120132E3209C4EC8C8E4FCE7D35F2CEF62534A55AC19788AA4EFB99A5986E52F12F');
  });

  it('rejects unsupported key formats', () => {
    expect(() => derivePublicKeyFromPrivateKeyHex('deadbeef')).toThrow(
      'Unsupported Iroha private key format `deadbeef`.'
    );
  });
});

describe('site binding artifacts', () => {
  it('renders a Torii site binding document for the published manifest', () => {
    expect(createSiteBindingDocument('taira.sora.org', 'ab'.repeat(32))).toEqual({
      version: 1,
      sites: [
        {
          hostname: 'taira.sora.org',
          manifest_digest_hex: 'ab'.repeat(32),
          index_document: 'index.html',
          spa_fallback: true,
        },
      ],
    });
  });

  it('upserts a hostname in the site bindings file without dropping others', () => {
    const dir = mkdtempSync(join(tmpdir(), 'polkaswap-sorafs-'));
    const path = join(dir, 'sites.json');

    upsertSiteBindingsFile(path, 'alpha.sora.org', 'aa'.repeat(32));
    upsertSiteBindingsFile(path, 'beta.sora.org', 'bb'.repeat(32));
    upsertSiteBindingsFile(path, 'alpha.sora.org', 'cc'.repeat(32));

    const document = JSON.parse(readFileSync(path, 'utf8'));
    expect(document).toEqual({
      version: 1,
      sites: [
        {
          hostname: 'beta.sora.org',
          manifest_digest_hex: 'bb'.repeat(32),
          index_document: 'index.html',
          spa_fallback: true,
        },
        {
          hostname: 'alpha.sora.org',
          manifest_digest_hex: 'cc'.repeat(32),
          index_document: 'index.html',
          spa_fallback: true,
        },
      ],
    });
  });
});

describe('package summary gateway fallback', () => {
  it('can derive a CID from manifest_json when the gateway summary is absent', () => {
    const dir = mkdtempSync(join(tmpdir(), 'polkaswap-sorafs-summary-'));
    const manifestPath = join(dir, 'site.manifest.json');
    writeFileSync(
      manifestPath,
      JSON.stringify({
        root_cid: [0x01, 0x71, 0x1f, 0x20, 0xf3, 0x09, 0x6a, 0xe2],
      })
    );

    const summary = {
      outputs: {
        manifest_json: manifestPath,
      },
    };

    expect(resolveContentCidFromManifestValue(JSON.parse(readFileSync(manifestPath, 'utf8')))).toBe('bafyr6ihtbfvoe');
    expect(
      createCidGatewayUrl(
        'https://taira.sora.org',
        resolveContentCidFromManifestValue(JSON.parse(readFileSync(manifestPath, 'utf8')))
      )
    ).toBe('https://taira.sora.org/sorafs/cid/bafyr6ihtbfvoe/');
    expect(summary.outputs.manifest_json).toBe(manifestPath);
  });
});

describe('resolveSubmittedEpochFromStatusValue', () => {
  it('prefers an explicit epoch object when present', () => {
    expect(
      resolveSubmittedEpochFromStatusValue({
        blocks: 14401,
        sumeragi: {
          epoch: {
            height: 77,
          },
          epoch_length_blocks: 3600,
        },
      })
    ).toBe(77);
  });

  it('falls back to blocks over epoch length when the explicit epoch is absent', () => {
    expect(
      resolveSubmittedEpochFromStatusValue({
        blocks: 10801,
        sumeragi: {
          epoch_length_blocks: 3600,
        },
      })
    ).toBe(3);
  });
});

describe('buildFundingHint', () => {
  it('adds a generic funding hint for insufficient-balance failures', () => {
    const error = new Error('submit failed', {
      cause: {
        stderr: 'insufficient xor balance',
      },
    });

    expect(buildFundingHint(error).message).toContain('Fund the authority account on the target network, then retry.');
  });
});

describe('buildPermissionHint', () => {
  it('adds a governance hint for direct pin registration permission failures', () => {
    const error = new Error('submit failed', {
      cause: {
        stderr: 'fallback transaction was rejected: permission CanRegisterSorafsPin required for SoraFS operation',
      },
    });

    expect(buildPermissionHint(error, '/repo/artifacts/site.pin.proposal.json').message).toContain(
      'Use the generated proposal artifact at `/repo/artifacts/site.pin.proposal.json` with the Taira governance or privileged publish flow.'
    );
  });
});

describe('buildStorageUploadHint', () => {
  it('adds an ingress hint for storage pin payloads rejected with HTTP 413', () => {
    const error = new Error('storage pin failed', {
      cause: {
        stderr: 'request failed with status 413 Payload Too Large: <html>...</html>',
      },
    });

    expect(buildStorageUploadHint(error).message).toContain(
      'Increase the reverse-proxy body-size limit in front of Torii'
    );
  });

  it('adds a Torii body-budget hint when the request body hits the live handler limit', () => {
    const error = new Error('storage pin failed', {
      cause: {
        stderr:
          'request failed with status 413 Payload Too Large: Failed to buffer the request body: length limit exceeded',
      },
    });

    expect(buildStorageUploadHint(error).message).toContain('Increase `torii.max_content_len`');
  });

  it('adds a combined edge and Torii hint when the upstream closes the upload with 502', () => {
    const error = new Error('storage pin failed', {
      cause: {
        stderr: 'request failed with status 502 Bad Gateway: <html>...</html>',
      },
    });

    expect(buildStorageUploadHint(error).message).toContain(
      "Verify both the reverse-proxy upload budget and Torii's `max_content_len`"
    );
  });
});

describe('isAlreadyRegisteredSubmitError', () => {
  it('treats duplicate manifest registration as an idempotent submit result', () => {
    const error = new Error('submit failed', {
      cause: {
        stderr:
          'fallback transaction was rejected: manifest 371e4902ae6836eabfa7e347e2b920a3a03b16dd3d3ac2d2159ad26ef371bc20 already registered',
      },
    });

    expect(isAlreadyRegisteredSubmitError(error)).toBe(true);
  });
});

describe('resolveBuildToolCommand', () => {
  it('prefers a prebuilt binary from CARGO_TARGET_DIR when present', () => {
    const previous = process.env.CARGO_TARGET_DIR;
    const targetDir = mkdtempSync(join(tmpdir(), 'polkaswap-sorafs-target-'));
    const binaryDir = join(targetDir, 'debug');
    const binaryPath = join(binaryDir, 'sorafs_cli');
    mkdirSync(binaryDir, { recursive: true });
    writeFileSync(binaryPath, '');
    process.env.CARGO_TARGET_DIR = targetDir;

    try {
      expect(resolveBuildToolCommand('/repo/iroha', 'sorafs_cli')).toEqual({
        command: binaryPath,
        args: [],
        cwd: '/repo/iroha',
      });
    } finally {
      if (previous === undefined) {
        delete process.env.CARGO_TARGET_DIR;
      } else {
        process.env.CARGO_TARGET_DIR = previous;
      }
    }
  });

  it('accepts the current iroha3 binary name when resolving the route-plan helper', () => {
    const previous = process.env.CARGO_TARGET_DIR;
    const targetDir = mkdtempSync(join(tmpdir(), 'polkaswap-sorafs-iroha-target-'));
    const binaryDir = join(targetDir, 'debug');
    const binaryPath = join(binaryDir, 'iroha3');
    mkdirSync(binaryDir, { recursive: true });
    writeFileSync(binaryPath, '');
    process.env.CARGO_TARGET_DIR = targetDir;

    try {
      expect(resolveBuildToolCommand('/repo/iroha', 'iroha')).toEqual({
        command: binaryPath,
        args: [],
        cwd: '/repo/iroha',
      });
    } finally {
      if (previous === undefined) {
        delete process.env.CARGO_TARGET_DIR;
      } else {
        process.env.CARGO_TARGET_DIR = previous;
      }
    }
  });

  it('falls back to cargo when CARGO_TARGET_DIR is set but no binary exists yet', () => {
    const previous = process.env.CARGO_TARGET_DIR;
    process.env.CARGO_TARGET_DIR = mkdtempSync(join(tmpdir(), 'polkaswap-sorafs-target-empty-'));

    try {
      expect(resolveBuildToolCommand('/repo/iroha', 'sorafs_cli')).toEqual({
        command: 'cargo',
        args: ['run', '-p', 'sorafs_orchestrator', '--bin', 'sorafs_cli', '--'],
        cwd: '/repo/iroha',
      });
      expect(resolveBuildToolCommand('/repo/iroha', 'iroha')).toEqual({
        command: 'cargo',
        args: ['run', '-p', 'iroha_cli', '--bin', 'iroha3', '--'],
        cwd: '/repo/iroha',
      });
    } finally {
      if (previous === undefined) {
        delete process.env.CARGO_TARGET_DIR;
      } else {
        process.env.CARGO_TARGET_DIR = previous;
      }
    }
  });
});
