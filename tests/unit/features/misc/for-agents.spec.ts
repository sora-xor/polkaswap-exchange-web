// @vitest-environment node
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import footerSource from '@/components/App/Footer/AppFooter.vue?raw';
import { PageNames } from '@/consts';
import { miscRoutes } from '@/features/misc/routes';
import forAgentsPageSource from '@/features/misc/pages/ForAgentsPage.vue?raw';

interface AgentManifest {
  docs: string;
  types: string;
  schema: string;
  examples: string;
  errorCatalog: string;
  client: string;
  developerTools: {
    playground: string;
  };
}

const publicPath = (path: string): string => resolve(process.cwd(), 'public', path);

const readPublicJson = async <T>(path: string): Promise<T> =>
  JSON.parse(await readFile(publicPath(path), 'utf8')) as T;

const getLinkedStaticPaths = (): string[] => [
  ...new Set(Array.from(forAgentsPageSource.matchAll(/href: '\.\/([^']+)'/g), ([, path]) => path)),
];

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
      './agent-playground.html',
    ].forEach((href) => {
      expect(forAgentsPageSource).toContain(href);
    });
  });

  it('surfaces machine-readable first-hop entrypoints and runner constraints', () => {
    expect(forAgentsPageSource).toContain('data-agent-entrypoint');
    expect(forAgentsPageSource).toContain("t('forAgents.entrypointsLabel')");
    expect(forAgentsPageSource).not.toContain('aria-label="Agent API entrypoints"');

    ['manifest', 'playground', 'reference'].forEach((entrypoint) => {
      expect(forAgentsPageSource).toContain(`entrypoint: '${entrypoint}'`);
    });

    ['same-page', 'no-custody', 'prepare-first', 'idempotent'].forEach((contract) => {
      expect(forAgentsPageSource).toContain(`code: '${contract}'`);
    });
  });

  it('documents the route-driven Polkamarkt workflow for agents', () => {
    expect(forAgentsPageSource).toContain("id=\"for-agents-polkamarkt\"");
    expect(forAgentsPageSource).toContain("t('forAgents.polkamarkt.title')");
    expect(forAgentsPageSource).toContain("window.location.hash = '#/polkamarkt'");

    ['route', 'markets', 'trade', 'create', 'positions'].forEach((step) => {
      expect(forAgentsPageSource).toContain(`key: '${step}'`);
    });
    expect(forAgentsPageSource).toContain('forAgents.polkamarkt.items.${item.key}.title');
    expect(forAgentsPageSource).toContain('forAgents.polkamarkt.items.${item.key}.description');

    [
      '#/polkamarkt',
      'markets + marketSnapshots',
      'Buy / Sell / Flip / LP / Claim',
      'batchAll(createCondition, createMarket)',
    ].forEach((code) => {
      expect(forAgentsPageSource).toContain(`code: '${code}'`);
    });
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
      manifest.developerTools.playground,
    ].map(normalizeManifestLink);

    expect(getLinkedStaticPaths()).toEqual(expect.arrayContaining(expectedPublicPaths));
  });
});
