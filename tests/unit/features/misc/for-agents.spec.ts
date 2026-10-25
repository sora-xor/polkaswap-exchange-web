// @vitest-environment node
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import footerSource from '@/components/App/Footer/AppFooter.vue?raw';
import { PageNames } from '@/consts';
import { invokePolkaswapMcpTool } from '@/features/agent-trading/mcp/catalogue.mjs';
import { miscRoutes } from '@/features/misc/routes';
import forAgentsPageSource from '@/features/misc/pages/ForAgentsPage.vue?raw';

interface AgentManifest {
  docs: string;
  types: string;
  schema: string;
  examples: string;
  errorCatalog: string;
  client: string;
  mcpTools: string;
  developerTools: {
    playground: string;
  };
}

const publicPath = (path: string): string => resolve(process.cwd(), 'public', path);
const sourcePath = (path: string): string => resolve(process.cwd(), 'src', path);

const readPublicJson = async <T>(path: string): Promise<T> => JSON.parse(await readFile(publicPath(path), 'utf8')) as T;

const readSourceJson = async <T>(path: string): Promise<T> => JSON.parse(await readFile(sourcePath(path), 'utf8')) as T;

const getLinkedStaticPaths = (): string[] => {
  const configuredLinks = Array.from(forAgentsPageSource.matchAll(/href: '\.\/([^']+)'/g), ([, path]) => path);
  const templateLinks = Array.from(forAgentsPageSource.matchAll(/href="\.\/([^"]+)"/g), ([, path]) => path);

  return [...new Set([...configuredLinks, ...templateLinks])];
};

const normalizeManifestLink = (path: string): string => {
  if (path.startsWith('../')) {
    return path.slice('../'.length);
  }

  return `.well-known/${path.replace(/^\.\//, '')}`;
};

describe('For Agents route', () => {
  it('registers the public route before the catch-all redirect', () => {
    const route = miscRoutes.find((item) => item.name === PageNames.ForAgents);
    const catchAllIndex = miscRoutes.findIndex((item) => item.path === '/:catchAll(.*)');

    expect(route).toMatchObject({
      path: '/for-agents',
      name: PageNames.ForAgents,
    });
    expect(catchAllIndex).toBeGreaterThan(-1);
    expect(miscRoutes.indexOf(route!)).toBeLessThan(catchAllIndex);
  });

  it('links the footer to the routed agent documentation page', () => {
    expect(footerSource).toContain('PageNames.ForAgents');
    expect(footerSource).toContain("t('footer.forAgents')");
  });

  it('points agents at the static same-origin API documentation bundle', () => {
    [
      './.well-known/polkaswap-agent.json',
      './.well-known/polkaswap-agent.md',
      './.well-known/polkaswap-agent.d.ts',
      './.well-known/polkaswap-agent.schema.json',
      './.well-known/polkaswap-agent.examples.json',
      './.well-known/polkaswap-agent.errors.json',
      './.well-known/polkaswap-agent-client.js',
      './.well-known/polkaswap-mcp-tools.json',
      './agent-playground.html',
    ].forEach((href) => {
      expect(forAgentsPageSource).toContain(href);
    });
  });

  it('shows a directly callable plan before the optional playground entrypoint', () => {
    const planningIndex = forAgentsPageSource.indexOf('data-agent-call="polkaswap_plan_swap"');
    const playgroundIndex = forAgentsPageSource.indexOf('href="./agent-playground.html"');
    const manifestIndex = forAgentsPageSource.indexOf("href: './.well-known/polkaswap-agent.json'");

    expect(forAgentsPageSource).toContain('class="for-agents-page__playground"');
    expect(forAgentsPageSource).toContain('class="for-agents-page__playground-link"');
    expect(forAgentsPageSource).toContain('data-agent-entrypoint="playground"');
    expect(planningIndex).toBeGreaterThan(-1);
    expect(planningIndex).toBeLessThan(playgroundIndex);
    expect(playgroundIndex).toBeGreaterThan(-1);
    expect(playgroundIndex).toBeLessThan(manifestIndex);
  });

  it('surfaces machine-readable discovery entrypoints and public constraints', () => {
    expect(forAgentsPageSource).toContain('data-agent-entrypoint');
    expect(forAgentsPageSource).toContain("t('forAgents.entrypointsLabel')");
    expect(forAgentsPageSource).not.toContain('aria-label="Agent API entrypoints"');
    expect(forAgentsPageSource).toContain("t('forAgents.mcp.title')");
    expect(forAgentsPageSource).toContain("t('forAgents.mcp.boundary')");
    expect(forAgentsPageSource).toContain(
      'yarn agent:mcp --profile-dir /absolute/path/to/a/dedicated/polkaswap-mcp-profile'
    );

    ['manifest', 'reference'].forEach((entrypoint) => {
      expect(forAgentsPageSource).toContain(`entrypoint: '${entrypoint}'`);
    });

    ['top-level', 'no-wallet', 'unsigned', 'no-approval'].forEach((contract) => {
      expect(forAgentsPageSource).toContain(`code: '${contract}'`);
    });
  });

  it('publishes a valid autonomous planning request accepted by the shared MCP catalogue', async () => {
    const requestSource = forAgentsPageSource.match(/const planningRequest = `([^`]+)`;/)?.[1];

    expect(requestSource).toBeDefined();
    const request = JSON.parse(requestSource!);
    const planSwap = vi.fn().mockResolvedValue({
      mode: 'unsigned',
      canExecute: false,
      requiresWallet: false,
    });

    expect(request).toEqual({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'polkaswap_plan_swap',
        arguments: {
          assetIn: { symbol: 'XOR' },
          assetOut: { symbol: 'VAL' },
          amount: '1',
          side: 'input',
          slippageTolerance: '0.5',
          dexId: 'best',
        },
      },
    });

    await invokePolkaswapMcpTool({ planSwap }, request.params.name, request.params.arguments);
    expect(planSwap).toHaveBeenCalledExactlyOnceWith(request.params.arguments);
  });

  it('does not publish wallet-aware preparation, execution, or signing examples', () => {
    [
      'window.PolkaswapAgent',
      'requireWallet',
      'prepareSwap',
      'executeSwap',
      'clientOrderId',
      'refreshWallets',
      'recoverTransaction',
    ].forEach((unsafeExample) => {
      expect(forAgentsPageSource).not.toContain(unsafeExample);
    });
  });

  it('distinguishes autonomous planning from unavailable unattended signing', async () => {
    const translations = await readSourceJson<{
      forAgents: {
        apiContext: string;
        lead: string;
        contract: { idempotent: string; prepareFirst: string };
        mcp: {
          boundary: string;
          text: string;
          title: string;
        };
        primary: { playground: { description: string } };
        signingTextBefore: string;
        signingTitle: string;
      };
    }>('lang/en.json');

    expect(translations.forAgents.mcp.title).toContain('read-only');
    expect(translations.forAgents.mcp.text).toContain('cannot request wallet access');
    expect(translations.forAgents.mcp.boundary).toContain('Signing is never registered with public WebMCP');
    expect(translations.forAgents.mcp.boundary).toContain('not shipped here');
    expect(translations.forAgents.signingTitle).toContain('same planning tools');
    expect(translations.forAgents.signingTextBefore).toContain('does not include a signer');
    expect(translations.forAgents.apiContext).toContain('Wallet identities');
    expect(translations.forAgents.primary.playground.description).toContain('without connecting a wallet');
    expect(translations.forAgents.primary.playground.description).toContain('optional playground');
    expect(translations.forAgents.lead).toContain('No page clicks');
    expect(translations.forAgents.contract.idempotent).toContain('without a page approval step');
    expect(translations.forAgents.contract.prepareFirst).toContain('not an executable intent');
  });

  it('keeps linked static agent resources present in the public bundle', async () => {
    const linkedPaths = getLinkedStaticPaths();

    expect(linkedPaths).toContain('.well-known/polkaswap-agent-client.js');
    await Promise.all(linkedPaths.map((path) => access(publicPath(path))));
  });

  it('keeps the visible agent page aligned with the manifest discovery links', async () => {
    const manifest = await readPublicJson<AgentManifest>('.well-known/polkaswap-agent.json');
    const expectedPublicPaths = [
      manifest.docs,
      manifest.types,
      manifest.schema,
      manifest.examples,
      manifest.errorCatalog,
      manifest.client,
      manifest.mcpTools,
      manifest.developerTools.playground,
    ].map(normalizeManifestLink);

    expect(getLinkedStaticPaths()).toEqual(expect.arrayContaining(expectedPublicPaths));
  });
});
