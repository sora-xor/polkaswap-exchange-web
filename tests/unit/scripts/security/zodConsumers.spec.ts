import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { beforeAll, describe, expect, it } from 'vitest';

type ParseResult =
  | { success: true; data: unknown }
  | { success: false; error: { issues: Array<{ code: string; path: PropertyKey[] }> } };
type Schema = {
  _zod?: unknown;
  parse: (value: unknown) => unknown;
  safeParse: (value: unknown) => ParseResult;
  safeParseAsync: (value: unknown) => Promise<ParseResult>;
};
type SchemaExports = Record<string, Schema>;
const require = createRequire(import.meta.url);

/** Locates the actual resolved consumer package without loading its browser or network entrypoints. */
function packageDirectory(name: string): string {
  let directory = dirname(require.resolve(name));
  while (directory !== dirname(directory)) {
    const manifest = join(directory, 'package.json');
    if (existsSync(manifest)) {
      const metadata = JSON.parse(readFileSync(manifest, 'utf8')) as { name?: string; main?: string };
      if (metadata.name === name && metadata.main && existsSync(join(directory, metadata.main))) return directory;
    }
    directory = dirname(directory);
  }
  throw new Error(`Package directory unavailable: ${name}`);
}

let appkit: SchemaExports;
let evm: SchemaExports;
let solana: SchemaExports;
let policies: SchemaExports;
let appkitDirectory: string;
let cdpDirectory: string;

beforeAll(async () => {
  appkitDirectory = packageDirectory('@reown/appkit-wallet');
  cdpDirectory = packageDirectory('@coinbase/cdp-sdk');
  appkit = (await import(
    /* @vite-ignore */ pathToFileURL(join(appkitDirectory, 'dist/esm/src/W3mFrameSchema.js')).href
  )) as SchemaExports;
  evm = (await import(
    /* @vite-ignore */ pathToFileURL(join(cdpDirectory, '_esm/policies/evmSchema.js')).href
  )) as SchemaExports;
  solana = (await import(
    /* @vite-ignore */ pathToFileURL(join(cdpDirectory, '_esm/policies/solanaSchema.js')).href
  )) as SchemaExports;
  policies = (await import(
    /* @vite-ignore */ pathToFileURL(join(cdpDirectory, '_esm/policies/types.js')).href
  )) as SchemaExports;
});

describe('patched Zod consumer compatibility', () => {
  it.each(['src/W3mFrameSchema.js', 'exports/index.js'])(
    'initializes and parses %s without attempting dynamic Function construction',
    (entrypoint) => {
      const result = spawnSync(
        process.execPath,
        [resolve('tests/fixtures/security/zod-csp.mjs'), join(appkitDirectory, 'dist/esm', entrypoint)],
        { encoding: 'utf8', timeout: 15_000 }
      );
      expect(result.error).toBeUndefined();
      expect(result.stderr).toBe('');
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({
        functionCalls: 0,
        valid: true,
        validAsync: true,
        invalid: false,
        invalidAsync: false,
        frame: true,
      });
    }
  );

  it('checks the generated declarations and public consumer types with strict TypeScript', () => {
    const cdpRequire = createRequire(join(cdpDirectory, 'package.json'));
    const targets = [
      resolve('tests/fixtures/security/zod-consumers.typecheck.ts'),
      join(appkitDirectory, 'dist/types/src/W3mFrameSchema.d.ts'),
      ...['types', 'evmSchema', 'solanaSchema'].map((file) => join(cdpDirectory, `_types/policies/${file}.d.ts`)),
      join(dirname(cdpRequire.resolve('abitype/package.json')), 'dist/types/zod.d.ts'),
    ];
    const program = ts.createProgram(targets, {
      noEmit: true,
      strict: true,
      skipLibCheck: false,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      types: ['node'],
    });
    // Validate our generated declarations themselves; unrelated vendor declarations are outside this migration.
    const diagnostics = targets.flatMap((target) => {
      const source = program.getSourceFile(target);
      expect(source).toBeDefined();
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    });
    expect(
      ts.formatDiagnostics(diagnostics, {
        getCurrentDirectory: () => process.cwd(),
        getCanonicalFileName: (file) => file,
        getNewLine: () => '\n',
      })
    ).toBe('');
  }, 30_000);

  it('uses the genuine patched Zod 4 runtime in both consumers and the ABI schemas', () => {
    for (const name of ['@reown/appkit-wallet', '@coinbase/cdp-sdk']) {
      const consumer = createRequire(join(packageDirectory(name), 'package.json'));
      expect(consumer('zod/package.json').version).toBe('4.6.7');
      expect(consumer.resolve('zod')).not.toMatch(/[/\\](?:v3|lib)[/\\]/);
    }
    for (const schema of [evm.EvmAddressCriterionSchema, solana.IdlSchema]) {
      expect(schema._zod).toBeDefined();
    }
    expect(appkit.FrameGetUserResponse._zod).toBeDefined();
    const cdpRequire = createRequire(join(cdpDirectory, 'package.json'));
    expect(cdpRequire('abitype/package.json').version).toBe('1.3.0');
    const abi = cdpRequire('abitype/zod') as SchemaExports;
    expect(abi.Abi._zod).toBeDefined();
    expect(
      abi.Abi.safeParse([
        {
          type: 'function',
          name: 'balanceOf',
          stateMutability: 'view',
          inputs: [{ name: 'owner', type: 'address' }],
          outputs: [{ type: 'uint256' }],
        },
      ]).success
    ).toBe(true);
    expect(abi.Address.safeParse('not-an-address').success).toBe(false);
  });

  it('preserves normal wallet requests, optional RPC fields and theme records', () => {
    const schemas = appkit.W3mFrameSchema as unknown as { appEvent: Schema; frameEvent: Schema };
    const request = {
      type: '@w3m-app/RPC_REQUEST',
      payload: { method: 'eth_sendTransaction', params: [{ to: `0x${'1'.repeat(40)}`, data: '0x', value: '0x0' }] },
    };
    expect(schemas.appEvent.parse(request)).toEqual(request);
    for (const method of ['wallet_revokePermissions', 'wallet_getAssets']) {
      expect(schemas.appEvent.safeParse({ type: '@w3m-app/RPC_REQUEST', payload: { method } }).success).toBe(true);
    }
    expect(schemas.frameEvent.safeParse({ type: '@w3m-frame/RPC_REQUEST_SUCCESS' }).success).toBe(true);
    expect(schemas.frameEvent.safeParse({ type: '@w3m-frame/RPC_REQUEST_SUCCESS', payload: undefined }).success).toBe(
      true
    );
    expect(
      appkit.AppSyncThemeRequest.parse({
        themeVariables: { '--w3m-z-index': 9999 },
        w3mThemeVariables: { color: '#fff' },
      })
    ).toEqual({ themeVariables: { '--w3m-z-index': 9999 }, w3mThemeVariables: { color: '#fff' } });
    expect(
      schemas.appEvent.safeParse({ type: '@w3m-app/RPC_REQUEST', payload: { method: 'not-a-wallet-method' } }).success
    ).toBe(false);
  });

  it('fast-fails oversized real wallet arrays without creating an issue for each element', () => {
    const result = appkit.FrameGetUserResponse.safeParse({
      address: '0x123',
      chainId: 1,
      accounts: Array(2_049).fill(null),
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues).toEqual([expect.objectContaining({ code: 'too_big', path: ['accounts'] })]);
    const calls = appkit.WalletSendCallsRequest.safeParse({
      method: 'wallet_sendCalls',
      params: [{ calls: Array(2_049) }],
    });
    expect(calls.success).toBe(false);
    if (!calls.success) expect(calls.error.issues).toHaveLength(1);
  });

  it('rejects oversized wallet collections before reading elements in sync and async parses', async () => {
    let reads = 0;
    const params = Array(2_049);
    Object.defineProperty(params, '0', {
      enumerable: true,
      get() {
        reads++;
        return {};
      },
    });
    const input = { method: 'wallet_sendCalls', params };
    const results = [
      appkit.WalletSendCallsRequest.safeParse(input),
      await appkit.WalletSendCallsRequest.safeParseAsync(input),
    ];
    expect(reads).toBe(0);
    for (const result of results) {
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues).toHaveLength(1);
    }
  });

  it('accepts valid EVM and Solana policies and preserves the existing 100-rule ceiling', () => {
    const rules = [
      {
        action: 'accept',
        operation: 'signEvmTransaction',
        criteria: [{ type: 'ethValue', operator: '<=', ethValue: '1000000' }],
      },
      { action: 'reject', operation: 'signSolMessage', criteria: [{ type: 'solMessage', match: '^unsafe' }] },
    ];
    const input = { scope: 'account', rules };
    expect(policies.CreatePolicyBodySchema.parse(input)).toEqual(input);
    const result = policies.CreatePolicyBodySchema.safeParse({ scope: 'account', rules: Array(101).fill(null) });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues).toHaveLength(1);
    expect(
      evm.EvmAddressCriterionSchema.safeParse({ type: 'evmAddress', operator: 'in', addresses: ['not-an-address'] })
        .success
    ).toBe(false);
  });

  it('migrates the EIP-712 record schema with actual value validation', () => {
    const criterion = {
      type: 'evmTypedDataField',
      types: { primaryType: 'Order', types: { Order: [{ name: 'buyer', type: 'address' }] } },
      conditions: [{ path: 'buyer', operator: 'in', addresses: [`0x${'1'.repeat(40)}`] }],
    };
    expect(evm.SignEvmTypedDataFieldCriterionSchema.parse(criterion)).toEqual(criterion);
    expect(
      evm.SignEvmTypedDataFieldCriterionSchema.safeParse({
        ...criterion,
        types: { primaryType: 'Order', types: { Order: [{ name: 123, type: 'address' }] } },
      }).success
    ).toBe(false);
    const result = evm.SignEvmTypedDataFieldCriterionSchema.safeParse({
      ...criterion,
      types: { primaryType: 'Order', types: { Order: Array(2_049).fill(null) } },
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues).toHaveLength(1);
  });

  it('bounds Solana IDL instructions while preserving extension metadata', () => {
    const input = {
      address: '11111111111111111111111111111111',
      instructions: [{ name: 'transfer' }],
      metadata: { name: 'test' },
    };
    expect(solana.IdlSchema.parse(input)).toEqual(input);
    const result = solana.IdlSchema.safeParse({ ...input, instructions: Array(2_049).fill(null) });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues).toHaveLength(1);
  });

  it('applies the same migration and bounds through the published CommonJS consumer', () => {
    const cjs = require(resolve(cdpDirectory, '_cjs/policies/evmSchema.js')) as SchemaExports;
    expect(cjs.SignEvmTypedDataFieldCriterionSchema._zod).toBeDefined();
    const result = cjs.EvmAddressCriterionSchema.safeParse({
      type: 'evmAddress',
      operator: 'in',
      addresses: Array(301).fill(null),
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues).toHaveLength(1);
  });

  it('preserves parsed ABI policies, including nested tuples and deprecated mutability defaults', () => {
    const input = {
      type: 'evmData',
      abi: [
        {
          type: 'function',
          name: 'execute',
          constant: true,
          inputs: [{ name: 'order', type: 'tuple', components: [{ name: 'buyer', type: 'address' }] }],
          outputs: [{ type: 'bool' }],
        },
      ],
      conditions: [{ function: 'execute' }],
    };
    expect(evm.EvmDataCriterionSchema.parse(input)).toEqual({
      ...input,
      abi: [{ ...input.abi[0], stateMutability: 'view' }],
    });
  });

  it('bounds imported ABI root and nested arrays before element access in both module formats', async () => {
    const cjs = require(resolve(cdpDirectory, '_cjs/policies/evmSchema.js')) as SchemaExports;
    const abiFunction = { type: 'function', name: 'execute', stateMutability: 'view', inputs: [], outputs: [] };
    const shapes = [
      (oversized: unknown[]) => oversized,
      (oversized: unknown[]) => [{ ...abiFunction, inputs: oversized }],
      (oversized: unknown[]) => [{ ...abiFunction, outputs: oversized }],
      (oversized: unknown[]) => [{ ...abiFunction, inputs: [{ name: 'order', type: 'tuple', components: oversized }] }],
    ];
    for (const schemas of [evm, cjs]) {
      for (const shape of shapes) {
        let reads = 0;
        const oversized = Array(2_049);
        Object.defineProperty(oversized, '0', {
          enumerable: true,
          get() {
            reads++;
            throw new Error('Oversized ABI collection must be rejected before element access');
          },
        });
        const input = { type: 'evmData', abi: shape(oversized), conditions: [{ function: 'execute' }] };
        expect(schemas.EvmDataCriterionSchema.safeParse(input).success).toBe(false);
        expect((await schemas.EvmDataCriterionSchema.safeParseAsync(input)).success).toBe(false);
        expect(reads).toBe(0);
      }
    }
  });
});
