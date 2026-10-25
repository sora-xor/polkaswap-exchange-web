import { promises as fs } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

type AssetReport = {
  file: string;
  type: string;
  size: number;
  gzipSize: number;
};

const DIST_DIR = process.env.BUNDLE_REPORT_DIST ?? path.resolve(process.cwd(), 'dist');
const OUTPUT_BASENAME = process.env.BUNDLE_REPORT_BASENAME ?? 'bundle-report';
const MAX_ASSETS = Number.parseInt(process.env.BUNDLE_REPORT_LIMIT ?? '20', 10);

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

const readableSize = (size: number): string => {
  if (size === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 2)} ${units[exponent]}`;
};

async function buildReport(): Promise<void> {
  const distExists = await fs
    .access(DIST_DIR)
    .then(() => true)
    .catch(() => false);

  if (!distExists) {
    throw new Error(`Unable to locate Vite build output directory at ${DIST_DIR}`);
  }

  const assetRoot = path.join(DIST_DIR, 'assets');
  const assetExists = await fs
    .access(assetRoot)
    .then(() => true)
    .catch(() => false);

  const candidates = assetExists ? await walk(assetRoot) : [];
  const assets: AssetReport[] = [];

  for (const filePath of candidates) {
    const ext = path.extname(filePath);
    if (!ext || (!ext.endsWith('js') && !ext.endsWith('css'))) {
      continue;
    }

    const relPath = path.relative(DIST_DIR, filePath);
    const raw = await fs.readFile(filePath);
    const gzip = gzipSync(raw);

    assets.push({
      file: relPath.replace(/\\/g, '/'),
      type: ext.slice(1),
      size: raw.byteLength,
      gzipSize: gzip.byteLength,
    });
  }

  assets.sort((a, b) => b.gzipSize - a.gzipSize);

  const totalSize = assets.reduce((acc, cur) => acc + cur.size, 0);
  const totalGzip = assets.reduce((acc, cur) => acc + cur.gzipSize, 0);
  const topAssets = assets.slice(0, Math.max(1, MAX_ASSETS));
  const generatedAt = new Date().toISOString();

  const jsonReport = {
    generatedAt,
    dist: DIST_DIR,
    totalAssets: assets.length,
    totalSize,
    totalGzip,
    topAssets,
  };

  const jsonPath = path.join(DIST_DIR, `${OUTPUT_BASENAME}.json`);
  const markdownPath = path.join(DIST_DIR, `${OUTPUT_BASENAME}.md`);

  await fs.writeFile(jsonPath, JSON.stringify(jsonReport, null, 2), 'utf8');

  const markdownLines = [
    `# Bundle Report`,
    ``,
    `- Generated: ${generatedAt}`,
    `- Total assets: ${assets.length}`,
    `- Total size: ${readableSize(totalSize)} (${totalSize} bytes)`,
    `- Total gzip: ${readableSize(totalGzip)} (${totalGzip} bytes)`,
    ``,
    `## Top ${topAssets.length} assets (ordered by gzip size)`,
    ``,
    `| File | Type | Size | Size (bytes) | Gzip | Gzip (bytes) |`,
    `| --- | --- | ---: | ---: | ---: | ---: |`,
    ...topAssets.map((asset) =>
      [asset.file, asset.type, readableSize(asset.size), asset.size, readableSize(asset.gzipSize), asset.gzipSize].join(
        ' | '
      )
    ),
    ``,
  ];

  await fs.writeFile(markdownPath, `${markdownLines.join('\n')}\n`, 'utf8');

  console.info(`Bundle report generated:\n  - ${jsonPath}\n  - ${markdownPath}`);
}

void buildReport();
