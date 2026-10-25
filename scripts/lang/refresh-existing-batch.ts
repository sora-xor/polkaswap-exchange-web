import fs from 'node:fs';
import path from 'node:path';

import { maskPlaceholders, restorePlaceholders, shouldSkipTranslation } from './mt-utils';

type Provider = 'gtx';

type Args = {
  languages: string[];
  batchSize: number;
  dryRun: boolean;
  provider: Provider;
};

type Segment = {
  path: string[];
  english: string;
  masked: string;
  table: Record<string, string>;
};

const DEFAULT_LANGS = ['am', 'ba', 'dv', 'dz', 'kk', 'mn', 'my', 'tt', 'zh_TW'];
const SEGMENT_SEPARATOR = '\n|||§§§|||\n';
const SEGMENT_SEPARATOR_PATTERN = /\n\|{3}\s*§{3}\s*\|{3}\n/g;

function parseArgs(argv: string[]): Args {
  const args: Args = {
    languages: DEFAULT_LANGS,
    batchSize: 40,
    dryRun: false,
    provider: 'gtx',
  };

  for (const value of argv.slice(2)) {
    if (value.startsWith('--languages=')) {
      args.languages = value
        .replace('--languages=', '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    } else if (value.startsWith('--batch-size=')) {
      const parsed = Number(value.replace('--batch-size=', ''));
      if (Number.isFinite(parsed) && parsed > 0) {
        args.batchSize = parsed;
      }
    } else if (value === '--dry-run') {
      args.dryRun = true;
    }
  }

  return args;
}

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

function readJson(file: string): any {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file: string, data: any) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 4)}\n`);
}

function getAtPath(source: Record<string, any>, segments: string[]): unknown {
  return segments.reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && !Array.isArray(acc)) {
      return (acc as Record<string, unknown>)[key];
    }

    return undefined;
  }, source);
}

function setAtPath(target: Record<string, any>, segments: string[], value: string): void {
  let cursor: Record<string, any> = target;

  segments.slice(0, -1).forEach((segment) => {
    if (!cursor[segment] || typeof cursor[segment] !== 'object' || Array.isArray(cursor[segment])) {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  });

  cursor[segments.at(-1) as string] = value;
}

function collectSegments(
  english: Record<string, any>,
  current: Record<string, any>,
  prefix: string[] = [],
  out: Segment[] = []
): Segment[] {
  Object.entries(english).forEach(([key, value]) => {
    const pathSegments = [...prefix, key];

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      collectSegments(value, current, pathSegments, out);
      return;
    }

    if (typeof value !== 'string') return;

    const currentValue = getAtPath(current, pathSegments);
    const needsRefresh = typeof currentValue !== 'string' || currentValue === value;

    if (!needsRefresh || shouldSkipTranslation(value)) return;

    const { masked, table } = maskPlaceholders(value);
    out.push({
      path: pathSegments,
      english: value,
      masked,
      table,
    });
  });

  return out;
}

async function translateBatch(batch: Segment[], lang: string): Promise<string[]> {
  const payload = batch.map((item) => item.masked).join(SEGMENT_SEPARATOR);
  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'en',
    tl: providerLang(lang),
    dt: 't',
    q: payload,
  });

  const res = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`, {
    headers: { 'User-Agent': 'polkaswap-i18n/1.0' } as HeadersInit,
  });

  if (!res.ok) {
    throw new Error(`GTX error for ${lang}: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const joined = (data?.[0] ?? []).map((chunk: Array<unknown>) => String(chunk?.[0] ?? '')).join('');

  return joined.split(SEGMENT_SEPARATOR_PATTERN);
}

async function refreshLocale(lang: string, batchSize: number, dryRun: boolean): Promise<void> {
  const localeFile = path.join('src', 'lang', `${lang}.json`);
  const english = readJson(path.join('src', 'lang', 'en.json'));
  const current = fs.existsSync(localeFile) ? readJson(localeFile) : {};
  const updated = structuredClone(current);
  const segments = collectSegments(english, current);

  for (let index = 0; index < segments.length; index += batchSize) {
    const batch = segments.slice(index, index + batchSize);
    const translated = await translateBatch(batch, lang);

    if (translated.length !== batch.length) {
      throw new Error(
        `Unexpected translation segment count for ${lang}: expected ${batch.length}, got ${translated.length}`
      );
    }

    batch.forEach((segment, batchIndex) => {
      const restored = restorePlaceholders(translated[batchIndex] ?? segment.masked, segment.table);
      setAtPath(updated, segment.path, restored || segment.english);
    });
  }

  if (!dryRun) {
    writeJson(localeFile, updated);
  }

  console.info(`[lang-refresh] ${lang}: refreshed ${segments.length} values${dryRun ? ' (dry-run)' : ''}`);
}

(async function main() {
  const args = parseArgs(process.argv);

  for (const lang of args.languages) {
    await refreshLocale(lang, args.batchSize, args.dryRun);
  }
})();
