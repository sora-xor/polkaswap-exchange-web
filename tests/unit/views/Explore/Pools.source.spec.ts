// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc';
import { describe, expect, it } from 'vitest';

const viewPath = path.resolve(__dirname, '../../../../src/features/explore/pages/ExplorePoolsPage.vue');

describe('Explore pools source', () => {
  it('renders TVL values directly instead of hiding them behind wallet fiat-price state', async () => {
    const source = await readFile(viewPath, 'utf8');

    expect(source).toContain(':value="row.tvlFormatted.amount"');
    expect(source).not.toContain('<data-row-skeleton');
    expect(source).not.toContain('pricesAvailable');
  });

  it('resolves the unavailable marker for both pool price and TVL cells', async () => {
    const source = await readFile(viewPath, 'utf8');
    const { descriptor } = parse(source, { filename: viewPath });
    const { bindings } = compileScript(descriptor, { id: 'pool-quote-test' });
    const template = compileTemplate({
      id: 'pool-quote-test',
      filename: viewPath,
      source: descriptor.template!.content,
      compilerOptions: { bindingMetadata: bindings },
    });

    expect(template.errors).toEqual([]);
    expect(template.code.match(/\$setup\["MarketUnavailable"\]/g)).toHaveLength(2);
  });
});
