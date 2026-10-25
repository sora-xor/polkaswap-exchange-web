import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('Electron renderer content security policy', () => {
  it('constrains executable content before loading the application entrypoints', () => {
    const renderer = readFileSync(
      fileURLToPath(new URL('../../../../src/renderer/index.html', import.meta.url)),
      'utf8'
    );
    const match = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/>/.exec(renderer);
    expect(match).not.toBeNull();
    const policy = new Map(
      match![1].split(';').map((directive) => {
        const [name, ...values] = directive.trim().split(/\s+/);
        return [name, values];
      })
    );
    expect(match!.index).toBeLessThan(renderer.indexOf('<script'));
    expect(policy.get('script-src')).toContain("'self'");
    expect(policy.get('script-src')).toContain("'wasm-unsafe-eval'");
    expect(policy.get('script-src')).not.toContain("'unsafe-inline'");
    expect(policy.get('script-src')).not.toContain("'unsafe-eval'");
    expect(policy.get('script-src')).not.toContain('*');
    expect(policy.get('object-src')).toEqual(["'none'"]);
    expect(policy.get('base-uri')).toEqual(["'self'"]);
    expect(policy.get('form-action')).toEqual(["'self'"]);
  });
});
