// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../..');

/** Sass blocks only: a plain-CSS style block never reaches the Sass compiler, so its minmax() is real CSS. */
function sassBlocks(source: string): string[] {
  return [...source.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)]
    .filter(([, attrs]) => /lang="scss"/.test(attrs))
    .map(([, , css]) => css);
}

/** What the Sass compiler sees as a function call: comments and escaped `#{'…'}` strings are not calls. */
function sassCalls(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/#\{'[^']*'\}/g, '');
}

// src/styles/_breakpoints.scss defines a global minmax($breakpoint, $max) for media queries. A bare grid
// minmax(0, 1fr) compiles to the string "max-width: -1", and the browser drops the whole declaration.
describe('Sass minmax() escapes in grid templates', () => {
  it.each([
    'src/features/misc/pages/ForAgentsPage.vue',
    'src/features/rewards/pages/PointSystemV2Page.vue',
    'src/features/polkamarkt/components/CreateMarketDialog.vue',
    'src/features/polkamarkt/components/PricingCurvePositionChart.vue',
  ])('%s escapes every CSS grid minmax() so the global Sass minmax() cannot mangle it', async (file) => {
    const blocks = sassBlocks(await readFile(path.join(repoRoot, file), 'utf8'));
    expect(blocks.length).toBeGreaterThan(0);
    for (const css of blocks) {
      expect(sassCalls(css)).not.toContain('minmax(');
    }
    // The grid templates these files rely on are present and escaped.
    expect(blocks.join('\n')).toMatch(/grid-template-columns: [^;]*#\{'[^']*minmax\(/);
  });
});
