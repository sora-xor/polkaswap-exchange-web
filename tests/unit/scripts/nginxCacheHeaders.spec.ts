import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('nginx static cache headers', () => {
  const nginxConfig = readFileSync(join(process.cwd(), 'nginx.conf'), 'utf8');
  const dockerfile = readFileSync(join(process.cwd(), 'Dockerfile'), 'utf8');

  it('ships the custom nginx config in the runtime image', () => {
    expect(dockerfile).toContain('COPY    ./nginx.conf /etc/nginx/conf.d/default.conf');
  });

  it('keeps the HTML shell uncacheable while immutable assets stay cacheable', () => {
    expect(nginxConfig).toContain('location = /index.html');
    expect(nginxConfig).toContain('Cache-Control "no-store"');
    expect(nginxConfig).toContain('location ^~ /assets/');
    expect(nginxConfig).toContain('Cache-Control "public, max-age=31536000, immutable"');
  });

  it('revalidates mutable public JSON files that keep stable names', () => {
    expect(nginxConfig).toContain('env(?:\\.[^.]+)?|marketing|whitelist|blacklist');
    expect(nginxConfig).toContain('Cache-Control "no-cache, must-revalidate"');
  });
});
