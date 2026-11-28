import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { productionCspHtml, productionCspPlugin } from '@/../scripts/build/productionCspPlugin.mjs';

const root = new URL('../../../../', import.meta.url);
const productionConnect = "connect-src 'self' https: wss: http://127.0.0.1:39847";

/** Build a minimal valid HTML entry with a deliberately explicit policy. */
const documentWith = (policy: string) =>
  `<html><head><meta http-equiv="Content-Security-Policy" content="${policy}"></head></html>`;

/** Extract the complete policy so unrelated directives can be compared verbatim. */
const policyOf = (html: string): string => html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)![1];

describe('production CSP boundary', () => {
  it.each(['index.html', 'src/renderer/index.html'])(
    'narrows the actual %s entry and preserves other directives',
    (entry) => {
      const html = readFileSync(fileURLToPath(new URL(entry, root)), 'utf8');
      const result = productionCspHtml(html);
      const before = policyOf(html).split(';');
      const after = policyOf(result).split(';');

      expect(before.find((directive) => directive.trim().startsWith('connect-src '))).toContain('http://localhost:*');
      expect(after.find((directive) => directive.trim().startsWith('connect-src '))?.trim()).toBe(productionConnect);
      expect(after.filter((directive) => !directive.trim().startsWith('connect-src '))).toEqual(
        before.filter((directive) => !directive.trim().startsWith('connect-src '))
      );
      expect(result.replace(policyOf(result), '')).toBe(html.replace(policyOf(html), ''));
      expect(productionCspHtml(result)).toBe(result);
    }
  );

  it('registers only for build, leaving serve HTML and its local development sources unchanged', () => {
    const plugin = productionCspPlugin();
    expect(plugin.apply).toBe('build');
    expect(plugin.transformIndexHtml).toEqual({ order: 'post', handler: productionCspHtml });
    const config = readFileSync(fileURLToPath(new URL('vite.config.mjs', root)), 'utf8');
    expect(config).toContain('productionCspPlugin(),');
  });

  it.each(["connect-src 'self' https: wss:", "connect-src 'none'", productionConnect])(
    'preserves a stricter or already-approved renderer policy: %s',
    (directive) => {
      const html = documentWith(`default-src 'self'; ${directive}; object-src 'none'`);
      expect(productionCspHtml(html)).toBe(html);
    }
  );

  it('never adds HTTP companion access to a document that allowed only local WebSockets', () => {
    const html = documentWith(
      "default-src 'self'; connect-src 'self' ws://localhost:* ws://127.0.0.1:* ws://0.0.0.0:*"
    );
    expect(policyOf(productionCspHtml(html))).toBe("default-src 'self'; connect-src 'self'");
  });

  it('ignores commented policies and handles case-insensitive metadata and reordered attributes', () => {
    const html =
      '<!-- <meta http-equiv="Content-Security-Policy" content="connect-src *"> -->' +
      '<meta content="default-src \'self\'; CONNECT-SRC \'self\' https: wss: http://127.0.0.1:*" HTTP-EQUIV="Content-Security-Policy">';
    const result = productionCspHtml(html);
    expect(result).toContain('<!-- <meta http-equiv="Content-Security-Policy" content="connect-src *"> -->');
    expect(result).toContain(productionConnect);
  });

  it.each([
    '<html><head></head></html>',
    '<!-- <meta http-equiv="Content-Security-Policy" content="connect-src \'self\'"> -->',
    documentWith("connect-src 'self'") + documentWith("connect-src 'none'"),
    documentWith("default-src 'self'"),
    documentWith("connect-src 'self'; connect-src https:"),
    documentWith("connect-src 'self'; CONNECT-SRC https:"),
    documentWith('connect-src'),
    documentWith("connect-src 'none' https:"),
    documentWith("connect-src 'self' http://127.0.0.1:8080"),
    documentWith("connect-src 'self' http: ws: *"),
    '<meta http-equiv="Content-Security-Policy" http-equiv="refresh" content="connect-src \'self\'">',
    '<meta http-equiv="Content-Security-Policy" content="connect-src \'self\'" content="connect-src *">',
  ])('fails closed for missing, ambiguous or unreviewed policy %s', (html) => {
    expect(() => productionCspHtml(html)).toThrow(/Production/);
  });
});
