import fs from 'fs';
import path from 'path';

import { maskPlaceholders, restorePlaceholders, shouldSkipTranslation, walkAndTranslate } from './mt-utils';

type Provider = 'libre' | 'mymemory' | 'gtx';

type Args = {
  languages: string[]; // target language codes
  refreshExisting: boolean; // translate values identical to English
  provider: Provider;
  dryRun: boolean;
};

const DEFAULT_LANGS = ['zh_TW', 'he', 'ar', 'ur', 'km', 'th', 'pis', 'my'];

function parseArgs(argv: string[]): Args {
  const args: Args = {
    languages: DEFAULT_LANGS,
    refreshExisting: false,
    provider: 'libre',
    dryRun: false,
  };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--languages=')) {
      args.languages = a
        .replace('--languages=', '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (a === '--refresh-existing') {
      args.refreshExisting = true;
    } else if (a.startsWith('--provider=')) {
      args.provider = a.replace('--provider=', '') as Provider;
    } else if (a === '--dry-run') {
      args.dryRun = true;
    }
  }
  return args;
}

// Map our file codes to provider target codes when they differ
function providerLang(code: string): string {
  switch (code) {
    case 'zh_TW':
      return 'zh-TW';
    case 'zh_CN':
      return 'zh-CN';
    default:
      return code;
  }
}

async function translateLibre(text: string, target: string): Promise<string> {
  const url = process.env.LIBRE_TRANSLATE_URL;
  if (!url) throw new Error('LIBRE_TRANSLATE_URL env is required for machine translation.');
  const key = process.env.LIBRE_TRANSLATE_API_KEY;
  const body: any = { q: text, source: 'en', target: target, format: 'text' };
  if (key) body.api_key = key;
  const res = await fetch(`${url.replace(/\/$/, '')}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`LibreTranslate error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return data.translatedText ?? text;
}

async function translateMyMemory(text: string, target: string): Promise<string> {
  // MyMemory free API, no key required. Best effort only.
  // Docs: https://mymemory.translated.net/doc/spec.php
  // Note: URL length limits apply; text comes masked and is relatively short per entry.
  const email = process.env.MYMEMORY_EMAIL || 'opensource@polkaswap.local';
  const params = new URLSearchParams({ q: text, langpair: `en|${target}`, de: email });
  const url = `https://api.mymemory.translated.net/get?${params.toString()}`;

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  let attempt = 0;
  let delay = 800; // base backoff in ms
  const maxAttempts = 6;
  // add small jitter to avoid synchronized bursts
  const jitter = () => Math.floor(Math.random() * 250);

  while (true) {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'polkaswap-i18n/1.0 (+https://github.com/sora-xor/polkaswap-exchange-web)' } as any,
    });
    if (res.ok) {
      const data = await res.json();
      const out = data?.responseData?.translatedText;
      return typeof out === 'string' && out.length ? out : text;
    }
    if ((res.status === 429 || res.status >= 500) && attempt < maxAttempts) {
      await sleep(delay + jitter());
      delay = Math.min(delay * 2, 8000);
      attempt++;
      continue;
    }
    throw new Error(`MyMemory error: ${res.status} ${res.statusText}`);
  }
}

async function translateGtx(text: string, target: string): Promise<string> {
  // Unofficial Google endpoint. Subject to change/quotas.
  const params = new URLSearchParams({ client: 'gtx', sl: 'en', tl: target, dt: 't', q: text });
  const url = `https://translate.googleapis.com/translate_a/single?${params.toString()}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'polkaswap-i18n/1.0' } as any });
  if (!res.ok) throw new Error(`GTX error: ${res.status} ${res.statusText}`);
  const data: any = await res.json();
  try {
    const chunks = data?.[0] || [];
    const out = chunks.map((c: any) => c?.[0]).join('');
    return typeof out === 'string' && out.length ? out : text;
  } catch {
    return text;
  }
}

// Simple JSON cache at scripts/lang/.cache/mt-cache.json
type Cache = Record<string, Record<string, string>>; // { lang: { maskedText: translatedMaskedText } }

function readCache(): Cache {
  const cachePath = path.join(__dirname, '.cache', 'mt-cache.json');
  try {
    const raw = fs.readFileSync(cachePath, 'utf8');
    return JSON.parse(raw) as Cache;
  } catch {
    return {} as Cache;
  }
}

function writeCache(cache: Cache) {
  const cacheDir = path.join(__dirname, '.cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  const cachePath = path.join(cacheDir, 'mt-cache.json');
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

async function translateValue(provider: Provider, value: string, lang: string, cache: Cache): Promise<string> {
  if (shouldSkipTranslation(value)) return value;
  const { masked, table } = maskPlaceholders(value);
  const langKey = providerLang(lang);
  cache[lang] = cache[lang] || {};
  let translatedMasked = cache[lang][masked];
  if (!translatedMasked) {
    // Throttle free providers to avoid rate limits
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    switch (provider) {
      case 'libre':
        translatedMasked = await translateLibre(masked, langKey);
        break;
      case 'mymemory':
        await sleep(500);
        translatedMasked = await translateMyMemory(masked, langKey);
        break;
      case 'gtx':
        await sleep(500);
        translatedMasked = await translateGtx(masked, langKey);
        break;
    }
    cache[lang][masked] = translatedMasked;
  }
  const restored = restorePlaceholders(translatedMasked, table);
  return restored;
}

function readJson(file: string): any {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file: string, data: any) {
  fs.writeFileSync(file, JSON.stringify(data, null, 4));
}

async function processDir(dir: string, args: Args) {
  const base = readJson(path.join(dir, 'en.json'));
  const cache = readCache();

  for (const lang of args.languages) {
    const file = path.join(dir, `${lang}.json`);
    if (!fs.existsSync(file)) {
      // initialize if missing
      writeJson(file, base);
    }
    const current = readJson(file);

    const translated = await walkAndTranslate(base, async (p, enVal) => {
      const curVal = p.reduce((a: any, k: string) => (a && typeof a === 'object' ? a[k] : undefined), current);
      const needs = args.refreshExisting ? typeof curVal !== 'string' || curVal === enVal : typeof curVal !== 'string';
      if (!needs) return curVal;
      return await translateValue(args.provider, enVal, lang, cache);
    });

    if (!args.dryRun) {
      writeJson(file, translated);
    }

    writeCache(cache);

    console.info(`[mt] ${dir} -> ${lang}.json ${args.dryRun ? '(dry-run)' : ''}`);
  }
}

(async function main() {
  const args = parseArgs(process.argv);
  // Process main and card catalogs
  await processDir(path.join('src', 'lang'), args);
  await processDir(path.join('src', 'lang', 'card'), args);
})();
