// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc';
import { describe, expect, it } from 'vitest';

const tokensViewPath = path.resolve(process.cwd(), 'src/views/Explore/Tokens.vue');

const compileTokensTemplate = async (): Promise<string> => {
  const source = await readFile(tokensViewPath, 'utf8');
  const { descriptor } = parse(source, { filename: tokensViewPath });
  const script = compileScript(descriptor, { id: 'tokens-template-test' });
  const template = compileTemplate({
    source: descriptor.template?.content ?? '',
    filename: tokensViewPath,
    id: 'tokens-template-test',
    compilerOptions: {
      bindingMetadata: script.bindings,
    },
  });

  return template.code;
};

describe('Explore Tokens template bindings', () => {
  it('resolves the assets-filter tag as a component instead of the local filter state computed', async () => {
    const compiledTemplate = await compileTokensTemplate();

    expect(compiledTemplate).toContain('_resolveComponent("assets-filter")');
    expect(compiledTemplate).not.toContain('$setup["assetsFilter"]');
  });
});
