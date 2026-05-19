// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { AGENT_CAPABILITIES, AGENT_METHODS, POLKASWAP_AGENT_API_VERSION } from '@/features/agent-trading/types';

const readText = (path: string): Promise<string> => readFile(resolve(process.cwd(), path), 'utf8');
const readJson = async <T>(path: string): Promise<T> => JSON.parse(await readText(path)) as T;

interface SchemaMethodMetadata {
  stateChanging?: boolean;
  requiresWallet?: boolean;
  requiresUserApproval?: boolean;
  acceptsIntentId?: boolean;
  acceptsClientOrderId?: boolean;
}

interface ManifestMethodMetadata {
  stateChanging: string[];
  requiresWallet: string[];
  requiresUserApproval: string[];
  acceptsIntentId: string[];
  acceptsClientOrderId: string[];
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
    const schema = await readJson<{ version: string; methods: Record<string, SchemaMethodMetadata> }>(
      'public/.well-known/polkaswap-agent.schema.json'
    );
    const examples = await readJson<{ version: string }>('public/.well-known/polkaswap-agent.examples.json');
    const errorCatalog = await readJson<{
      version: string;
      errors: Record<string, { retry: string; safeToRetrySameRequest: boolean; action: string }>;
    }>('public/.well-known/polkaswap-agent.errors.json');
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
    expect(manifest.methodMetadata.stateChanging).toEqual(methodsByFlag('stateChanging'));
    expect(manifest.methodMetadata.requiresWallet).toEqual(methodsByFlag('requiresWallet'));
    expect(manifest.methodMetadata.requiresUserApproval).toEqual(methodsByFlag('requiresUserApproval'));
    expect(manifest.methodMetadata.acceptsIntentId).toEqual(methodsByFlag('acceptsIntentId'));
    expect(manifest.methodMetadata.acceptsClientOrderId).toEqual(methodsByFlag('acceptsClientOrderId'));
    expect(Object.keys(manifest.methodMetadata.prepareBeforeExecute)).toEqual(manifest.methodMetadata.stateChanging);
    expect(Object.keys(errorCatalog.errors)).toEqual(manifest.errors);
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
    }

    expect(runner).toContain('window.PolkaswapAgent');
    expect(runner).toContain('polkaswap-agent.json');
    expect(runnerReadme).toContain('POLKASWAP_AGENT_EXECUTE_SWAP');
    expect(packageJson.scripts['agent:runner']).toBe('node ./examples/agent-runner/agent-runner.mjs');
  });

  it('publishes generic agent discovery breadcrumbs', async () => {
    const [index, llms, agents, agentInstructions, robots, playground, manifest] = await Promise.all([
      readText('index.html'),
      readText('public/llms.txt'),
      readText('public/agents.txt'),
      readText('public/AGENTS.md'),
      readText('public/robots.txt'),
      readText('public/agent-playground.html'),
      readJson<{ breadcrumbs: Record<string, unknown>; developerTools: Record<string, string> }>(
        'public/.well-known/polkaswap-agent.json'
      ),
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
        exampleRunner: 'examples/agent-runner/',
        exampleRunnerCommand: 'yarn agent:runner',
      })
    );
    expect(playground).toContain('window.PolkaswapAgent');
    expect(playground).toContain('agent.prepareSwap');
    expect(playground).not.toContain('agent.executeSwap');
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
