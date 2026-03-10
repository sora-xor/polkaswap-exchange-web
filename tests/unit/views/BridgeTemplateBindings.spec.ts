// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { parse } from '@vue/compiler-sfc';
import { describe, expect, it } from 'vitest';

const bridgeViewPath = path.resolve(process.cwd(), 'src/views/Bridge.vue');

const readBridgeTemplate = async (): Promise<string> => {
  const source = await readFile(bridgeViewPath, 'utf8');
  const { descriptor } = parse(source);
  return descriptor.template?.content ?? '';
};

describe('Bridge.vue template bindings', () => {
  it('keeps sub-account dialog visibility decoupled from token selector visibility', async () => {
    const template = await readBridgeTemplate();
    const subAccountTag = template.match(/<bridge-select-sub-account[^>]*>/i)?.[0];

    expect(subAccountTag).toBeDefined();
    expect(subAccountTag).not.toContain('v-model');
    expect(subAccountTag).not.toContain(':visible');
  });

  it('keeps token selector bound to showSelectTokenDialog', async () => {
    const template = await readBridgeTemplate();
    const assetTag = template.match(/<bridge-select-asset[^>]*>/i)?.[0];

    expect(assetTag).toBeDefined();
    expect(assetTag).toContain('v-model:visible="showSelectTokenDialog"');
  });

  it('keeps the disconnected bridge hint inside the footer callout container', async () => {
    const template = await readBridgeTemplate();

    expect(template).toContain('class="bridge-footer__callout"');
    expect(template).toContain("t('bridge.connectWallets')");
  });
});
