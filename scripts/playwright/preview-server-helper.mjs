import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const previewServerScript = path.resolve(__dirname, '../testing/ipfs-preview-server.mjs');
const loopbackHosts = new Set(['127.0.0.1', 'localhost', '::1']);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function canAutoStartPreviewServer(rawBaseUrl) {
  const url = new URL(rawBaseUrl);
  return url.protocol === 'http:' && loopbackHosts.has(url.hostname);
}

export function resolvePreviewServerConfig(appBaseUrl) {
  const url = new URL(appBaseUrl);

  return {
    host: url.hostname,
    port: url.port || (url.protocol === 'https:' ? '443' : '80'),
    prefix: url.pathname || '/',
    healthUrl: `${url.origin}/healthz`,
  };
}

async function waitForPreviewHealth(healthUrl, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(healthUrl, { redirect: 'manual' });
      if (response.ok) return;

      lastError = new Error(`Health check returned ${response.status} for ${healthUrl}`);
      break;
    } catch (error) {
      lastError = error;
    }

    await sleep(200);
  }

  throw lastError ?? new Error(`Timed out waiting for preview server at ${healthUrl}`);
}

export async function ensurePreviewServer(rawBaseUrl, appBaseUrl) {
  const { host, port, prefix, healthUrl } = resolvePreviewServerConfig(appBaseUrl);

  try {
    await waitForPreviewHealth(healthUrl, 1_500);
    return async () => {};
  } catch (error) {
    if (!canAutoStartPreviewServer(rawBaseUrl)) {
      throw error;
    }

    const child = spawn(process.execPath, [previewServerScript, '--host', host, '--port', port, '--prefix', prefix], {
      cwd: process.cwd(),
      stdio: 'ignore',
    });

    try {
      await waitForPreviewHealth(healthUrl);
    } catch (startError) {
      child.kill('SIGTERM');
      throw startError;
    }

    return async () => {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    };
  }
}
