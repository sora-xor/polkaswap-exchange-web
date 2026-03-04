#!/usr/bin/env node
/**
 * Minimal static file server that exposes the Vite build output under an IPFS-style prefix.
 * The handler mirrors the layout used by public gateways so Playwright can verify rendering
 * of the production bundle without relying on an actual IPFS daemon.
 */
import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizePrefix, parseArgs, shouldServeHealth, toBooleanFlag } from './ipfs-preview-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');
const distDir = path.join(projectRoot, 'dist');

const args = parseArgs(process.argv.slice(2));

const host = args.host ?? process.env.PS_IPFS_TEST_HOST ?? '127.0.0.1';
const port = Number(args.port ?? process.env.PS_IPFS_TEST_PORT ?? '4173');
const prefix = normalizePrefix(args.prefix ?? process.env.PS_IPFS_TEST_PREFIX);
const logRequests = toBooleanFlag(args['log-requests'] ?? process.env.PS_IPFS_TEST_LOG_REQUESTS, false);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function enforceDistPath(target) {
  const absolute = path.resolve(distDir, target);
  if (!absolute.startsWith(distDir)) {
    throw new Error(`Refusing to serve path outside dist directory: ${target}`);
  }
  return absolute;
}

async function fileExists(candidate) {
  try {
    await access(candidate);
    const stats = await stat(candidate);
    return stats.isFile();
  } catch {
    return false;
  }
}

const indexPath = enforceDistPath('index.html');
const hasIndex = await fileExists(indexPath);

if (!hasIndex) {
  console.error('[ipfs-preview] dist/index.html not found. Run `yarn build` before starting the server.');
  process.exit(1);
}

async function resolveAsset(pathname) {
  let relative = decodeURIComponent(pathname.slice(prefix.length));

  if (relative.startsWith('/')) {
    relative = relative.slice(1);
  }

  if (!relative) {
    return { filePath: indexPath, contentType: mimeTypes['.html'] };
  }

  if (relative.endsWith('/')) {
    relative = `${relative}index.html`;
  }

  const hasExtension = path.extname(relative) !== '';

  if (!hasExtension) {
    return { filePath: indexPath, contentType: mimeTypes['.html'] };
  }

  const candidate = enforceDistPath(relative);
  const exists = await fileExists(candidate);

  if (!exists) {
    console.warn(`[ipfs-preview] missing asset lookup: ${relative}`);
    if (path.extname(relative) === '.html') {
      return { filePath: indexPath, contentType: mimeTypes['.html'] };
    }
    return null;
  }

  const extension = path.extname(candidate).toLowerCase();
  const contentType = mimeTypes[extension] ?? 'application/octet-stream';

  return { filePath: candidate, contentType };
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`);
    const start = Date.now();
    const logRequest = (message) => {
      if (logRequests) {
        console.log(message);
      }
    };
    const respond = (status, message) => {
      const duration = Date.now() - start;
      logRequest(`[ipfs-preview] ${req.method ?? 'GET'} ${url.pathname} -> ${status} (${duration}ms)`);
      if (!res.headersSent) {
        res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
      }
      if (message) {
        res.end(message);
      } else {
        res.end();
      }
    };
    if (shouldServeHealth(url.pathname, prefix)) {
      respond(200, 'ipfs-preview-ok');
      return;
    }
    if (!url.pathname.startsWith(prefix)) {
      respond(404, 'Not Found');
      return;
    }

    const asset = await resolveAsset(url.pathname);

    if (!asset) {
      respond(404, 'Not Found');
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', asset.contentType);

    if ((req.method ?? 'GET').toUpperCase() === 'HEAD') {
      respond(200);
      return;
    }

    const stream = createReadStream(asset.filePath);

    stream
      .on('error', (error) => {
        console.error('[ipfs-preview] stream error', error);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        }
        res.end('Internal Server Error');
      })
      .on('close', () => {
        const duration = Date.now() - start;
        logRequest(
          `[ipfs-preview] ${req.method ?? 'GET'} ${url.pathname} -> 200 (${duration}ms) [${asset.contentType}]`
        );
      });

    stream.pipe(res);
  } catch (error) {
    console.error('[ipfs-preview] request error', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end('Internal Server Error');
  }
});

server.listen(port, host, () => {
  console.log(`[ipfs-preview] Serving dist from ${distDir}`);
  console.log(`[ipfs-preview] Available at http://${host}:${port}${prefix}`);
});

const shutdown = () =>
  server.close(() => {
    process.exit(0);
  });

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
