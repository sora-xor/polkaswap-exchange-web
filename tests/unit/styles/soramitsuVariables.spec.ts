// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const variablesPath = path.resolve(__dirname, '../../../src/styles/soramitsu-variables.scss');
const urduFontPath = path.resolve(__dirname, '../../../src/assets/fonts/NotoNastaliqUrdu-wght.ttf');

describe('soramitsu variables', () => {
  it('overrides legacy control durations and suppresses motion when requested', async () => {
    const source = await readFile(path.resolve(__dirname, '../../../src/styles/common.scss'), 'utf8');
    expect(source).toContain('transition-duration: 125ms !important;');
    const reducedMotion = source.split('@media (prefers-reduced-motion: reduce)')[1];
    expect(reducedMotion).toContain('transition-duration: 0.01ms !important;');
    expect(reducedMotion).toContain('animation-iteration-count: 1 !important;');
    expect(reducedMotion).toContain('scroll-behavior: auto !important;');
  });

  it('keeps noir primary button text aligned with production palette', async () => {
    const variablesSource = await readFile(variablesPath, 'utf8');

    expect(variablesSource).toContain('$polkaswap-dark-token-overrides');
    expect(variablesSource).toContain('content-on-background-inverted: #391057');
    expect(variablesSource).toContain('primary-hover: #f754a3');
  });

  it('uses a Nastaliq-first font stack for Urdu', async () => {
    const variablesSource = await readFile(variablesPath, 'utf8');
    const fontAsset = await readFile(urduFontPath);

    expect(fontAsset.length).toBeGreaterThan(0);
    expect(variablesSource).toContain('@font-face');
    expect(variablesSource).toContain("url('@/assets/fonts/NotoNastaliqUrdu-wght.ttf')");
    expect(variablesSource).toContain("html[lang='ur']");
    expect(variablesSource).toContain("'Noto Nastaliq Urdu'");
    expect(variablesSource).toContain("'Jameel Noori Nastaleeq'");
    expect(variablesSource).toContain('--s-font-family-mono: var(--s-font-family-default);');
  });
});

/** Relative luminance of a six-digit sRGB color, for theme contrast assertions. */
function luminance(hex: string): number {
  const rgb = hex
    .replace('#', '')
    .match(/../g)!
    .map((part) => parseInt(part, 16) / 255);
  const linear = rgb.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

/** Computes contrast without depending on a particular token's current value. */
function contrast(a: string, b: string): number {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

it.each(['light', 'dark'])('keeps %s theme secondary text readable on every main surface', async (mode) => {
  const source = await readFile(variablesPath, 'utf8');
  const theme = source.split(`$polkaswap-${mode}-token-overrides: (`)[1].split('\n);')[0];
  const readColor = (key: string) => {
    const value = theme.match(new RegExp(`\\b${key}: (#[0-9a-f]{6})`, 'i'))?.[1];
    expect(value, `missing ${key}`).toBeTruthy();
    return value!;
  };
  for (const text of ['content-primary', 'content-secondary', 'content-tertiary']) {
    for (const surface of ['background', 'body', 'surface']) {
      expect(contrast(readColor(text), readColor(surface)), `${mode}: ${text} on ${surface}`).toBeGreaterThanOrEqual(
        4.5
      );
    }
  }
});

/** Reads the source map so contrast checks fail when the shipped token changes. */
function colorMap(source: string, name: string): string {
  const map = source.split(`$${name}: (`)[1]?.split('\n);')[0];
  expect(map, `missing ${name}`).toBeTruthy();
  return map!;
}

/** Reads a literal theme color, rejecting unresolved or missing values. */
function mapColor(map: string, name: string): string {
  const value = map.match(new RegExp(`(?:^|\\s)'?${name}'?: (#[0-9a-f]{6})`, 'im'))?.[1];
  expect(value, `missing color ${name}`).toBeTruthy();
  return value!;
}

describe.each(['light', 'dark'])('%s control contrast', (mode) => {
  const readTheme = async () => {
    const source = await readFile(variablesPath, 'utf8');
    return {
      surfaces: colorMap(source, `polkaswap-${mode}-token-overrides`),
      controls: colorMap(source, mode === 'dark' ? 'legacy-dark-overrides' : 'legacy-static-vars'),
    };
  };

  it('keeps small primary labels readable in default, hover and pressed states', async () => {
    const { controls } = await readTheme();
    const foreground = mapColor(controls, '--s-color-on-action');
    for (const token of ['--s-color-action-fill', '--s-color-action-fill-hover']) {
      expect(contrast(foreground, mapColor(controls, token)), token).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps enabled links, slippage and fiat amounts readable on every main surface', async () => {
    const { controls, surfaces } = await readTheme();
    for (const token of [
      '--s-color-action-text',
      '--s-color-fiat-value',
      '--s-color-status-success-text',
      '--s-color-status-warning-text',
      '--s-color-status-error-text',
    ]) {
      for (const surface of ['background', 'body', 'surface']) {
        expect(
          contrast(mapColor(controls, token), mapColor(surfaces, surface)),
          `${token} on ${surface}`
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('keeps price-impact badge text readable over each status fill', async () => {
    const { controls } = await readTheme();
    const foreground = mapColor(controls, '--s-color-on-status-fill');
    for (const status of ['success', 'warning', 'error']) {
      expect(contrast(foreground, mapColor(controls, `--s-color-status-${status}`)), status).toBeGreaterThanOrEqual(
        4.5
      );
    }
  });

  it('keeps input boundaries and keyboard focus distinct from adjacent surfaces', async () => {
    const { controls, surfaces } = await readTheme();
    for (const token of ['--s-color-control-border', '--s-color-focus-ring']) {
      for (const surface of ['background', 'body', 'surface']) {
        expect(
          contrast(mapColor(controls, token), mapColor(surfaces, surface)),
          `${token} on ${surface}`
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('gives disabled primary actions a separate muted treatment', async () => {
    const { controls } = await readTheme();
    expect(mapColor(controls, '--s-color-action-disabled-fill')).not.toBe(mapColor(controls, '--s-color-action-fill'));
    const commonStyles = await readFile(path.resolve(__dirname, '../../../src/styles/common.scss'), 'utf8');
    const disabledRule = commonStyles
      .split('s-primary:is(:disabled, .is-disabled, .s-button_disabled) {')[1]
      ?.split('}')[0];
    expect(disabledRule).toContain('background-color: var(--s-color-action-disabled-fill) !important;');
    expect(disabledRule).toContain('color: var(--s-color-on-action-disabled) !important;');
    expect(disabledRule).toContain('box-shadow: none !important;');
  });
});
