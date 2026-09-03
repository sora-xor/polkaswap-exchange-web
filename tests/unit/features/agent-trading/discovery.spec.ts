// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { POLKASWAP_MCP_TOOLS } from '@/features/agent-trading/mcp/catalogue.mjs';
import { AGENT_CAPABILITIES, AGENT_METHODS, POLKASWAP_AGENT_API_VERSION } from '@/features/agent-trading/types';

const readText = (path: string): Promise<string> => readFile(resolve(process.cwd(), path), 'utf8');
const readJson = async <T>(path: string): Promise<T> => JSON.parse(await readText(path)) as T;

interface SchemaMethodMetadata {
  effect?: 'read' | 'wallet-session' | 'local-state' | 'subscription' | 'chain-write';
  privacy?: 'public' | 'conditional-account' | 'account';
  readOnly?: boolean;
  stateChanging?: boolean;
  requiresWallet?: boolean;
  requiresUserApproval?: boolean;
  requiresIntentId?: boolean;
  requiresClientOrderId?: boolean;
  request?: { $ref?: string };
}

interface ManifestMethodMetadata {
  effects: Record<string, string[]>;
  privacy: Record<string, string[]>;
  readOnly: string[];
  stateChanging: string[];
  chainWriting: string[];
  requiresWallet: string[];
  requiresUserApproval: string[];
  requiresIntentId: string[];
  requiresClientOrderId: string[];
  quoteOnly: string[];
  prepareBeforeExecute: Record<string, string>;
  subscriptions: string[];
}

describe('PolkaswapAgent discovery surface', () => {
  it('keeps the manifest and schema aligned with the live v1 API', async () => {
    const manifest = await readJson<{
      version: string;
      methods: string[];
      capabilities: string[];
      methodMetadata: ManifestMethodMetadata;
      errors: string[];
    }>('public/.well-known/polkaswap-agent.json');
    const schema = await readJson<{
      version: string;
      methods: Record<string, SchemaMethodMetadata>;
      $defs: Record<string, Record<string, unknown>>;
    }>('public/.well-known/polkaswap-agent.schema.json');
    const examples = await readJson<{ version: string }>('public/.well-known/polkaswap-agent.examples.json');
    const errorCatalog = await readJson<{
      version: string;
      errors: Record<string, { retry: string; safeToRetrySameRequest: boolean; action: string }>;
    }>('public/.well-known/polkaswap-agent.errors.json');
    const [sourceTypes, publicTypes] = await Promise.all([
      readText('src/features/agent-trading/types.ts'),
      readText('public/.well-known/polkaswap-agent.d.ts'),
    ]);
    const methodsByFlag = (flag: keyof SchemaMethodMetadata): string[] =>
      Object.entries(schema.methods)
        .filter(([, metadata]) => Boolean(metadata[flag]))
        .map(([method]) => method);

    expect(manifest.version).toBe(POLKASWAP_AGENT_API_VERSION);
    expect(schema.version).toBe(POLKASWAP_AGENT_API_VERSION);
    expect(examples.version).toBe(POLKASWAP_AGENT_API_VERSION);
    expect(errorCatalog.version).toBe(POLKASWAP_AGENT_API_VERSION);
    expect(manifest.methods).toEqual([...AGENT_METHODS]);
    expect(Object.keys(schema.methods)).toEqual([...AGENT_METHODS]);
    expect(manifest.capabilities).toEqual([...AGENT_CAPABILITIES]);
    expect(manifest.methodMetadata.readOnly).toEqual(methodsByFlag('readOnly'));
    expect(manifest.methodMetadata.stateChanging).toEqual(methodsByFlag('stateChanging'));
    expect(manifest.methodMetadata.requiresWallet).toEqual(methodsByFlag('requiresWallet'));
    expect(manifest.methodMetadata.requiresUserApproval).toEqual(methodsByFlag('requiresUserApproval'));
    expect(manifest.methodMetadata.requiresIntentId).toEqual(methodsByFlag('requiresIntentId'));
    expect(manifest.methodMetadata.requiresClientOrderId).toEqual(methodsByFlag('requiresClientOrderId'));
    expect(Object.keys(manifest.methodMetadata.prepareBeforeExecute)).toEqual(manifest.methodMetadata.chainWriting);
    expect(
      Object.fromEntries(
        Object.entries(manifest.methodMetadata.effects).flatMap(([effect, methods]) =>
          methods.map((method) => [method, effect])
        )
      )
    ).toEqual(
      Object.fromEntries(Object.entries(schema.methods).map(([method, metadata]) => [method, metadata.effect]))
    );
    expect(
      Object.fromEntries(
        Object.entries(manifest.methodMetadata.privacy).flatMap(([privacy, methods]) =>
          methods.map((method) => [method, privacy])
        )
      )
    ).toEqual(
      Object.fromEntries(Object.entries(schema.methods).map(([method, metadata]) => [method, metadata.privacy]))
    );
    expect(new Set(Object.values(manifest.methodMetadata.effects).flat())).toEqual(new Set(AGENT_METHODS));
    expect(new Set(Object.values(manifest.methodMetadata.privacy).flat())).toEqual(new Set(AGENT_METHODS));

    const executeMethods = ['executeSwap', 'executeTransfer', 'executeAddLiquidity', 'executeRemoveLiquidity'];
    expect(manifest.methodMetadata.chainWriting).toEqual(executeMethods);
    for (const method of executeMethods) {
      expect(schema.methods[method]).toMatchObject({
        effect: 'chain-write',
        privacy: 'account',
        readOnly: false,
        stateChanging: true,
        requiresIntentId: true,
        requiresClientOrderId: true,
        request: { $ref: '#/$defs/executePreparedRequest' },
      });
    }
    expect(schema.$defs.executePreparedRequest).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['intentId', 'clientOrderId'],
      properties: {
        intentId: { $ref: '#/$defs/intentId' },
        clientOrderId: { type: 'string', pattern: '^[a-zA-Z0-9._:-]{1,128}$' },
      },
    });
    expect(schema.$defs.decimal).toEqual({
      type: 'string',
      pattern: '^(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?$',
    });
    expect(schema.$defs.preparedCall).toMatchObject({
      required: ['operation', 'sdkCall', 'encoding', 'encodedCall', 'args'],
      properties: {
        encoding: { const: 'polkaswap-sdk-call-v1' },
        encodedCall: { type: 'string', pattern: '^0x[0-9a-f]+$' },
      },
    });
    expect(schema.methods.planSwap).toMatchObject({
      effect: 'read',
      privacy: 'public',
      readOnly: true,
      stateChanging: false,
      requiresWallet: false,
    });
    expect(schema.$defs.swapPlan).toMatchObject({
      additionalProperties: false,
      properties: {
        mode: { const: 'unsigned' },
        canExecute: { const: false },
        requiresWallet: { const: false },
        preview: {
          additionalProperties: false,
          required: ['operation', 'sdkCall', 'stateChanging', 'args', 'summary'],
        },
      },
    });
    const planProperties = schema.$defs.swapPlan.properties as Record<string, unknown>;
    expect(planProperties).not.toHaveProperty('intentId');
    expect(planProperties).not.toHaveProperty('envelope');
    expect(planProperties).not.toHaveProperty('requiredBalances');
    expect(Object.keys(errorCatalog.errors)).toEqual(manifest.errors);
    const sourceErrorUnion =
      sourceTypes.match(/export type AgentErrorCode =([\s\S]*?);\n\nexport interface AgentErrorShape/)?.[1] ?? '';
    const publicErrorUnion = publicTypes.match(/export interface PolkaswapAgentErrorShape \{([\s\S]*?)\n\}/)?.[1] ?? '';
    const extractCodes = (source: string): string[] =>
      [...source.matchAll(/\| '([A-Z][A-Z0-9_]+)'/g)].map((match) => match[1]);
    expect(extractCodes(sourceErrorUnion)).toEqual(manifest.errors);
    expect(extractCodes(publicErrorUnion)).toEqual(manifest.errors);

    for (const quoteName of ['swapQuote', 'addLiquidityQuote', 'removeLiquidityQuote']) {
      const quote = schema.$defs[quoteName] as { required?: string[]; properties?: Record<string, unknown> };
      expect(quote.required).toContain('quoteDigest');
      expect(quote.required).not.toContain('intentId');
      expect(quote.properties).toHaveProperty('quoteDigest');
      expect(quote.properties).not.toHaveProperty('intentId');
    }
    for (const preparedName of [
      'preparedSwap',
      'preparedTransfer',
      'preparedAddLiquidity',
      'preparedRemoveLiquidity',
    ]) {
      const prepared = schema.$defs[preparedName] as { required?: string[]; properties?: Record<string, unknown> };
      expect(prepared.required).toEqual(expect.arrayContaining(['intentId', 'envelope', 'revalidation']));
      expect(prepared.properties?.envelope).toEqual({ $ref: '#/$defs/preparedEnvelope' });
      expect(prepared.properties?.revalidation).toEqual({ $ref: '#/$defs/intentRevalidation' });
    }
    for (const entry of Object.values(errorCatalog.errors)) {
      expect(entry.retry).toBeTruthy();
      expect(typeof entry.safeToRetrySameRequest).toBe('boolean');
      expect(entry.action).toBeTruthy();
    }
  });

  it('keeps public docs, types, and examples on the v1 method set', async () => {
    const [types, wellKnownDocs, repoDocs, client] = await Promise.all([
      readText('public/.well-known/polkaswap-agent.d.ts'),
      readText('public/.well-known/polkaswap-agent.md'),
      readText('docs/agent-trading.md'),
      readText('public/.well-known/polkaswap-agent-client.js'),
    ]);

    for (const method of AGENT_METHODS) {
      expect(types).toContain(`${method}(`);
      expect(wellKnownDocs).toContain(`\`${method}(`);
      expect(repoDocs).toContain(`\`${method}(`);
    }

    expect(client).toContain('prepareAndExecuteSwap');
    expect(client).toContain('prepareAndExecuteTransfer');
    expect(client).toContain('prepareAndExecuteAddLiquidity');
    expect(client).toContain('prepareAndExecuteRemoveLiquidity');
    expect(types).toContain('executeSwap(request: PolkaswapAgentExecuteSwapRequest)');
    expect(types).toContain('executeTransfer(request: PolkaswapAgentExecuteTransferRequest)');
    expect(types).toContain('executeAddLiquidity(request: PolkaswapAgentExecuteAddLiquidityRequest)');
    expect(types).toMatch(/executeRemoveLiquidity\(\s*request: PolkaswapAgentExecuteRemoveLiquidityRequest\s*\)/u);
    expect(types).toContain('interface PolkaswapAgentPreparedEnvelope');
    expect(types).toContain('encodedCall: string');
    expect(types).toContain('quoteDigest: string');
    expect(types).not.toContain('interface PolkaswapAgentIntentRequest');
    expect(wellKnownDocs).toContain('`executeSwap({ intentId, clientOrderId })`');
    expect(repoDocs).toContain('`executeSwap({ intentId, clientOrderId })`');
    expect(client).not.toContain('...request');
  });

  it('keeps public example snippets parseable for copy/paste runners', async () => {
    const examples = await readJson<{ examples: Array<{ name: string; code: string }> }>(
      'public/.well-known/polkaswap-agent.examples.json'
    );
    const runner = await readText('examples/agent-runner/agent-runner.mjs');
    const runnerReadme = await readText('examples/agent-runner/README.md');
    const packageJson = await readJson<{ scripts: Record<string, string> }>('package.json');

    for (const example of examples.examples) {
      expect(() => new Function(`return (async () => {\n${example.code}\n});`)).not.toThrow();
      for (const call of example.code.matchAll(
        /execute(?:Swap|Transfer|AddLiquidity|RemoveLiquidity)\(\{([\s\S]*?)\}\)/g
      )) {
        const keys = [...call[1].matchAll(/\b([A-Za-z][A-Za-z0-9]*)\s*:/g)].map((match) => match[1]);
        expect(keys).toEqual(['intentId', 'clientOrderId']);
      }
    }

    expect(runner).toContain('window.PolkaswapAgent');
    expect(runner).toContain('polkaswap-agent.json');
    expect(runner).toContain('polkaswap-agent');
    expect(runner).not.toContain('disclaimerApprove');
    expect(runnerReadme).toContain('POLKASWAP_AGENT_EXECUTE_SWAP');
    expect(runnerReadme).toContain('?polkaswap-agent=1#/swap');
    expect(packageJson.scripts['agent:runner']).toBe('node ./examples/agent-runner/agent-runner.mjs');
    expect(packageJson.scripts['agent:mcp']).toBe('node ./examples/agent-mcp/index.mjs');
  });

  it('publishes generic agent discovery breadcrumbs', async () => {
    const [
      index,
      llms,
      agents,
      agentInstructions,
      robots,
      playground,
      playgroundScript,
      playgroundWebMcp,
      manifest,
      mcpTools,
    ] = await Promise.all([
      readText('index.html'),
      readText('public/llms.txt'),
      readText('public/agents.txt'),
      readText('public/AGENTS.md'),
      readText('public/robots.txt'),
      readText('public/agent-playground.html'),
      readText('public/agent-playground.js'),
      readText('public/agent-playground-webmcp.js'),
      readJson<{
        mcpTools: string;
        repositoryDocs: string;
        breadcrumbs: Record<string, unknown>;
        developerTools: Record<string, string>;
        mcp: {
          profile: string;
          tools: string[];
          accountDataExposed: boolean;
          preparationToolsEnabled: boolean;
          executionToolsEnabled: boolean;
          privateKeysAccepted: boolean;
        };
      }>('public/.well-known/polkaswap-agent.json'),
      readJson<
        Array<{
          name: string;
          inputSchema: { properties?: Record<string, unknown> };
          annotations: { readOnlyHint: boolean };
        }>
      >('public/.well-known/polkaswap-mcp-tools.json'),
    ]);

    expect(index).toContain('rel="help"');
    expect(index).toContain('href=".well-known/polkaswap-agent.json"');
    expect(index).toContain('name="polkaswap-agent-api"');
    expect(index).toContain('name="ai-agent-api"');
    expect(index).not.toContain('href="/.well-known/polkaswap-agent.json"');

    for (const breadcrumb of [llms, agents, agentInstructions, robots]) {
      expect(breadcrumb).toContain('.well-known/polkaswap-agent.json');
      expect(breadcrumb).toContain('window.PolkaswapAgent');
    }

    expect(llms).toContain('?polkaswap-agent=1');
    expect(agents).toContain('?polkaswap-agent=1');
    expect(agentInstructions).toContain('?polkaswap-agent=1');

    expect(manifest.breadcrumbs).toEqual(
      expect.objectContaining({
        llms: '../llms.txt',
        agents: '../agents.txt',
        agentInstructions: '../AGENTS.md',
        robots: '../robots.txt',
      })
    );
    expect(manifest.developerTools).toEqual(
      expect.objectContaining({
        playground: '../agent-playground.html',
        exampleRunner: 'https://github.com/sora-xor/polkaswap-exchange-web/tree/develop/examples/agent-runner',
        exampleRunnerCommand: 'yarn agent:runner',
        localMcp: 'https://github.com/sora-xor/polkaswap-exchange-web/tree/develop/examples/agent-mcp',
        localMcpCommand: 'yarn agent:mcp --profile-dir /absolute/path/to/a/dedicated/profile',
      })
    );
    expect(manifest.mcpTools).toBe('./polkaswap-mcp-tools.json');
    expect(manifest.mcp).toMatchObject({
      profile: 'public-swap-readonly',
      accountDataExposed: false,
      preparationToolsEnabled: false,
      executionToolsEnabled: false,
      privateKeysAccepted: false,
      planningToolsEnabled: true,
    });
    expect(mcpTools).toHaveLength(9);
    expect(mcpTools).toEqual(POLKASWAP_MCP_TOOLS);
    expect(mcpTools.map(({ name }) => name)).toEqual(manifest.mcp.tools);
    expect(mcpTools.every(({ annotations }) => annotations.readOnlyHint)).toBe(true);
    expect(mcpTools.map(({ name }) => name).join(' ')).not.toMatch(/prepare|execute|sign|transaction|position/u);
    expect(JSON.stringify(mcpTools.map(({ inputSchema }) => inputSchema))).not.toMatch(/includeBalance/u);
    expect(manifest.repositoryDocs).toBe(
      'https://github.com/sora-xor/polkaswap-exchange-web/blob/develop/docs/agent-trading.md'
    );
    expect(playground).toContain('src="./agent-playground.js"');
    expect(playground).toContain('src="./agent-playground-webmcp.js"');
    expect(playground).not.toContain('<script>');
    expect(playgroundScript).toContain('PolkaswapAgent');
    expect(playgroundScript).toContain('polkaswap-agent');
    expect(playgroundScript).toContain('agent.prepareSwap');
    expect(playgroundScript.indexOf("frame.addEventListener('load'")).toBeLessThan(
      playgroundScript.indexOf('frame.src = getAppUrl()')
    );
    expect(playground).not.toContain('agent.executeSwap');
    expect(playgroundScript).not.toContain('agent.executeSwap');
    expect(playgroundWebMcp).toContain('modelContext.registerTool');
    expect(playgroundWebMcp).toContain('polkaswap_quote_swap');
    expect(playgroundWebMcp).not.toContain('executeSwap');
  });

  it('does not publish old numbered agent API versions', async () => {
    const surface = (
      await Promise.all(
        [
          'src/features/agent-trading/types.ts',
          'src/features/agent-trading/service.ts',
          'public/.well-known/polkaswap-agent.json',
          'public/.well-known/polkaswap-agent.schema.json',
          'public/.well-known/polkaswap-agent.examples.json',
          'public/.well-known/polkaswap-agent.errors.json',
          'public/.well-known/polkaswap-agent.d.ts',
          'public/.well-known/polkaswap-agent.md',
          'docs/agent-trading.md',
          'docs/agent-trading-cookbook.md',
        ].map(readText)
      )
    ).join('\n');

    expect(surface).not.toMatch(/\b1\.[34]\.0\b/);
  });
});
