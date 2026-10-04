// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../..');

const LIGHT_SCOPE = ':root:not([data-theme=dark])';

type Declaration = { prop: string; value: string; important: boolean };
type RuleInfo = { selectors: string[]; atRule: string | null; declarations: Declaration[] };
type CompiledStyles = {
  /** Last declaration of every custom property in the light theme block of soramitsu-variables.scss. */
  light: Record<string, string>;
  /** The same for the Noir block. */
  dark: Record<string, string>;
  /** Every rule that light-lighting.scss produces. */
  lighting: RuleInfo[];
};

/**
 * Compiles the real stylesheets with Sass and parses the result with PostCSS in a child process, like the other
 * style specs: the Vite test config aliases Node built-ins to browser shims, which `sass` cannot load.
 */
function compileStyles(): CompiledStyles {
  const { spawnSync } = eval('require')('node:child_process') as typeof import('node:child_process');
  const script = `const { readFileSync } = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const postcss = require('postcss')
const sass = require('sass')

const { repoRoot } = JSON.parse(readFileSync(0, 'utf8'))
const themeRoot = path.join(repoRoot, 'src/lib/soramitsu-ui/theme')
const options = {
  importers: [
    {
      findFileUrl(url) {
        if (url.startsWith('@/')) return pathToFileURL(path.join(repoRoot, 'src', url.slice(2)))
        if (url === '@soramitsu-ui/theme/sass') return pathToFileURL(path.join(themeRoot, 'sass/lib.scss'))
        if (url === '@soramitsu-ui/theme/fonts/Sora') return pathToFileURL(path.join(themeRoot, 'fonts/Sora/index.css'))
        if (url === '@soramitsu-ui/theme') return pathToFileURL(path.join(themeRoot, '_index.scss'))
        return null
      },
    },
  ],
  loadPaths: [path.join(repoRoot, 'src/styles'), path.join(repoRoot, 'node_modules'), themeRoot],
  logger: sass.Logger.silent,
  quietDeps: true,
}
const normalise = (selector) => selector.replace(/\\s+/g, ' ').trim()

try {
  const variables = postcss.parse(sass.compile(path.join(repoRoot, 'src/styles/soramitsu-variables.scss'), options).css)
  const blockOf = (selector) => {
    const found = {}
    variables.walkRules((rule) => {
      if (normalise(rule.selector) !== selector) return
      rule.walkDecls((decl) => {
        found[decl.prop] = decl.value
      })
    })
    return found
  }

  const lightingPath = path.join(repoRoot, 'src/styles/light-lighting.scss')
  const globalImports = path.join(repoRoot, 'src/lib/soraneo-wallet/src/styles/global-imports.scss')
  const lightingSource = '@use "' + globalImports.replace(/\\\\/g, '/') + '" as *;\\n' + readFileSync(lightingPath, 'utf8')
  const lighting = postcss.parse(
    sass.compileString(lightingSource, { ...options, url: pathToFileURL(lightingPath) }).css
  )
  const rules = []
  lighting.walkRules((rule) => {
    const parent = rule.parent
    rules.push({
      selectors: rule.selectors,
      atRule: parent && parent.type === 'atrule' ? '@' + parent.name + ' ' + parent.params : null,
      declarations: rule.nodes
        .filter((node) => node.type === 'decl')
        .map((node) => ({ prop: node.prop, value: node.value, important: Boolean(node.important) })),
    })
  })

  process.stdout.write(
    JSON.stringify({
      light: blockOf(':root, .sora-theme-provider'),
      dark: blockOf(':root[data-theme=dark], .sora-theme-provider[data-theme=dark]'),
      lighting: rules,
    })
  )
} catch (error) {
  process.stderr.write(error instanceof Error ? error.stack || error.message : String(error))
  process.exit(1)
}
`;

  const child = spawnSync(process.execPath, ['-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    input: JSON.stringify({ repoRoot }),
    maxBuffer: 64 * 1024 * 1024,
  });

  if (child.status !== 0) {
    throw new Error(child.stderr || `Sass compilation failed with exit code ${child.status}`);
  }

  return JSON.parse(child.stdout) as CompiledStyles;
}

/** Splits at commas that are not inside parentheses or brackets. */
function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') depth--;
    else if (char === ',' && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}

type Specificity = [number, number, number];

const identEnd = (text: string, from: number): number => {
  let end = from;
  while (end < text.length && /[\w-]/.test(text[end])) end++;
  return end;
};

const closingParen = (text: string, open: number): number => {
  let depth = 0;
  for (let index = open; index < text.length; index++) {
    if (text[index] === '(') depth++;
    if (text[index] === ')' && --depth === 0) return index;
  }
  return text.length - 1;
};

function compareSpecificity(a: Specificity, b: Specificity): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/** Specificity of one complex selector, covering the grammar the app's stylesheets use. */
function specificity(selector: string): Specificity {
  const total: Specificity = [0, 0, 0];
  const add = (value: Specificity) => {
    total[0] += value[0];
    total[1] += value[1];
    total[2] += value[2];
  };
  let index = 0;
  while (index < selector.length) {
    const char = selector[index];
    if (char === '#') {
      total[0]++;
      index = identEnd(selector, index + 1);
    } else if (char === '.') {
      total[1]++;
      index = identEnd(selector, index + 1);
    } else if (char === '[') {
      total[1]++;
      index = selector.indexOf(']', index) + 1;
    } else if (char === ':' && selector[index + 1] === ':') {
      total[2]++;
      index = identEnd(selector, index + 2);
    } else if (char === ':') {
      const nameEnd = identEnd(selector, index + 1);
      const name = selector.slice(index + 1, nameEnd);
      index = nameEnd;
      if (selector[index] === '(') {
        const close = closingParen(selector, index);
        const inner = selector.slice(index + 1, close);
        index = close + 1;
        if (name === 'not' || name === 'is') {
          const strongest = splitTopLevel(inner)
            .map(specificity)
            .sort((a, b) => compareSpecificity(b, a))[0];
          add(strongest ?? [0, 0, 0]);
        } else if (name !== 'where') {
          total[1]++;
        }
      } else {
        total[1]++;
      }
    } else if (/[a-zA-Z]/.test(char)) {
      total[2]++;
      index = identEnd(selector, index);
    } else {
      index++;
    }
  }
  return total;
}

/** Relative luminance of an sRGB colour given as 0-255 channels. */
function luminance(channels: number[]): number {
  const [r, g, b] = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: number[], b: number[]): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

const hexToRgb = (hex: string): number[] =>
  hex
    .replace('#', '')
    .match(/../g)!
    .map((part) => parseInt(part, 16));

/** Paints `top` over `base` at the given alpha, as a gradient stop would. */
const blend = (base: number[], top: number[], alpha: number): number[] =>
  base.map((channel, index) => channel * (1 - alpha) + top[index] * alpha);

type Layer = { inset: boolean; x: number; y: number; light: 'key' | 'ink' | 'other' };

/** Parses the layers of a box-shadow token written with `--lm-key` and `--lm-ink` colours. */
function layersOf(value: string): Layer[] {
  return splitTopLevel(value).map((layer) => {
    const inset = /^inset\s/.test(layer);
    const [x, y] = layer
      .replace(/^inset\s+/, '')
      .split(/\s+/)
      .map((part) => parseFloat(part));
    const light = layer.includes('--lm-key') ? 'key' : layer.includes('--lm-ink') ? 'ink' : 'other';
    return { inset, x, y, light };
  });
}

describe('light theme lighting', () => {
  let styles: CompiledStyles;

  const lightingRule = (selector: string): RuleInfo | undefined =>
    styles.lighting.find((rule) => rule.selectors.includes(selector));
  const declaration = (rule: RuleInfo | undefined, prop: string): Declaration | undefined =>
    rule?.declarations.find((decl) => decl.prop === prop);

  beforeAll(() => {
    styles = compileStyles();
  });

  describe('key light direction', () => {
    // One key light sits above and to the left: cast shadows fall down and right, highlights sit up and left.
    // A raised surface catches the light on its upper left rim, a sunken one on its lower right wall.
    const recipes: Record<string, 'raised' | 'sunken'> = {
      '--s-shadow-element-pressed': 'raised',
      '--s-shadow-dialog': 'raised',
      '--s-shadow-secondary': 'raised',
      '--s-shadow-surface': 'raised',
      '--s-shadow-element': 'sunken',
      '--neu-tabs-shadow': 'sunken',
    };

    it.each(Object.entries(recipes))('%s lights every layer from the upper left (%s)', (token, kind) => {
      const layers = layersOf(styles.light[token] ?? '');
      expect(layers.length, `${token} is missing`).toBeGreaterThan(1);

      for (const layer of layers) {
        const where = `${token}: ${JSON.stringify(layer)}`;
        if (layer.light === 'ink' && !layer.inset) {
          expect(layer.x >= 0 && layer.y >= 0, `${where} casts a shadow up or left`).toBe(true);
        }
        if (layer.light === 'key' && !layer.inset && kind === 'raised') {
          expect(layer.x <= 0 && layer.y <= 0, `${where} puts a highlight down or right`).toBe(true);
        }
        if (layer.inset && kind === 'raised') {
          const expectedSign = layer.light === 'key' ? 1 : -1;
          expect(Math.sign(layer.x), where).toBe(expectedSign);
          expect(Math.sign(layer.y), where).toBe(expectedSign);
        }
        if (layer.inset && kind === 'sunken' && (layer.x !== 0 || layer.y !== 0)) {
          // The inner contact edge has no offset and shades every side equally.
          const expectedSign = layer.light === 'ink' ? 1 : -1;
          expect(Math.sign(layer.x), where).toBe(expectedSign);
          expect(Math.sign(layer.y), where).toBe(expectedSign);
        }
      }
    });

    it('gives sunken surfaces both a shaded rim and a lit rim', () => {
      const layers = layersOf(styles.light['--s-shadow-element'] ?? '');
      expect(layers.some((layer) => layer.inset && layer.light === 'ink' && layer.x > 0 && layer.y > 0)).toBe(true);
      expect(layers.some((layer) => layer.inset && layer.light === 'key' && layer.x < 0 && layer.y < 0)).toBe(true);
    });
  });

  describe('Noir isolation', () => {
    it('redeclares in Noir every token that light derives from the rig', () => {
      // Every property is checked, including the `--neu-*` ones that unscoped rules in common.scss consume: a
      // token that only light defines would otherwise leak into Noir through inheritance.
      const derived = Object.entries(styles.light).filter(
        ([prop, value]) => value.includes('--lm-') && !prop.startsWith('--lm-')
      );

      // Guards against passing vacuously if the recipes move.
      expect(derived.map(([prop]) => prop)).toEqual(
        expect.arrayContaining([
          '--s-shadow-element',
          '--s-shadow-element-pressed',
          '--s-shadow-dialog',
          '--s-shadow-secondary',
          '--s-shadow-surface',
          '--s-shadow-color-dark',
          '--s-shadow-color-dark-light',
          '--s-shadow-color-light-dark',
          '--neu-tabs-shadow',
        ])
      );

      for (const [prop] of derived) {
        expect(prop in styles.dark, `Noir does not redeclare ${prop}, so it would inherit the light recipe`).toBe(true);
        expect(styles.dark[prop], `${prop} in Noir must not use the light rig`).not.toContain('--lm-');
      }
    });

    it('draws no track behind neumorphic tabs in Noir, as before', () => {
      expect(styles.dark['--neu-tabs-shadow']).toBe('none');
    });

    it('keeps the rig itself out of the Noir block', () => {
      expect(Object.keys(styles.dark).filter((prop) => prop.startsWith('--lm-'))).toEqual([]);
    });
  });

  describe('light-lighting.scss', () => {
    it('scopes every rule to the light theme', () => {
      const selectors = styles.lighting.flatMap((rule) => rule.selectors);

      expect(selectors.length).toBeGreaterThan(5);
      expect(selectors.filter((selector) => !selector.startsWith(`${LIGHT_SCOPE} `))).toEqual([]);
    });

    it('is loaded after the shared styles', async () => {
      const index = await readFile(path.join(repoRoot, 'src/styles/index.ts'), 'utf8');
      const common = index.indexOf("import './common.scss';");
      expect(common).toBeGreaterThan(-1);
      expect(index.indexOf("import './light-lighting.scss';")).toBeGreaterThan(common);
    });

    it('leaves the mobile drawer scrim alone', () => {
      const sidebarBackgrounds = styles.lighting.filter(
        (rule) =>
          rule.selectors.some((selector) => selector.includes('.app-menu')) &&
          rule.declarations.some((decl) => decl.prop.startsWith('background'))
      );

      expect(sidebarBackgrounds.length).toBeGreaterThan(0);
      for (const rule of sidebarBackgrounds) {
        expect(rule.atRule, `${rule.selectors.join(', ')} must only apply from 528px`).toBe(
          '@media (min-width: 528px)'
        );
      }
    });

    it('only ever darkens the ground beyond the key light pool', () => {
      const ground = declaration(lightingRule(`${LIGHT_SCOPE} #app`), 'background-image');
      const layers = splitTopLevel(ground?.value ?? '');
      expect(layers.length).toBe(4);

      // The first layer is the key light pool and anchors to the upper left, where the sidebar column is.
      expect(layers[0]).toContain('--lm-key');
      expect(layers[0]).toMatch(/at 0% 0%/);
      for (const layer of layers.slice(1)) {
        expect(layer, 'later layers must not use the key light').not.toContain('--lm-key');
      }
    });

    it('lets primary action glows outrank the white glows that features pin with !important', () => {
      const glow: Record<'rest' | 'hover' | 'focus', string> = { rest: '', hover: '', focus: '' };
      for (const rule of styles.lighting) {
        if (!rule.declarations.some((decl) => decl.prop === 'box-shadow' && decl.important)) continue;
        for (const selector of rule.selectors) {
          if (!selector.includes('button.el-button.neumorphic.s-primary') || selector.includes(':is(')) continue;
          if (selector.endsWith(':hover')) glow.hover = selector;
          else if (selector.endsWith(':focus')) glow.focus = selector;
          else if (selector.endsWith(':not(.s-button_disabled)')) glow.rest = selector;
        }
      }

      // Selectors that features write today; see Form.vue and AppHeader.vue.
      const swapForm = {
        rest: '.swap-form button.el-button.neumorphic.action-button.s-primary:not(:disabled):not(.is-disabled)',
        hover: '.swap-form button.el-button.neumorphic.action-button.s-primary:not(.is-disabled):not(:disabled):hover',
        focus: '.swap-form button.el-button.neumorphic.action-button.s-primary:not(.is-disabled):not(:disabled):focus',
      };
      const headerMenu = {
        rest: '.app-menu-button.el-button.neumorphic.s-action.s-primary',
        hover: '.app-menu-button.el-button.neumorphic.s-action.s-primary:not(.is-disabled):hover',
      };

      for (const state of ['rest', 'hover', 'focus'] as const) {
        expect(glow[state], `no ${state} glow rule found`).not.toBe('');
        const mine = specificity(glow[state]);
        expect(compareSpecificity(mine, specificity(swapForm[state])), `${state} vs the swap form`).toBeGreaterThan(0);
        if (state !== 'focus') {
          expect(compareSpecificity(mine, specificity(headerMenu[state])), `${state} vs the header`).toBeGreaterThan(0);
        }
      }
    });

    it('never glows on a disabled primary action', () => {
      const glowing = styles.lighting.filter((rule) =>
        rule.declarations.some((decl) => decl.prop === 'box-shadow' && decl.value.includes('--lm-glow-accent'))
      );

      expect(glowing.length).toBeGreaterThan(0);
      for (const selector of glowing.flatMap((rule) => rule.selectors)) {
        expect(selector, selector).toContain(':not(:disabled)');
        expect(selector, selector).toContain(':not(.is-disabled)');
        expect(selector, selector).toContain(':not(.s-button_disabled)');
      }
    });
  });

  describe('legibility on the lit ground', () => {
    const triplet = (prop: string): number[] => {
      const value = styles.light[prop] ?? '';
      expect(value, `${prop} is missing`).toMatch(/^\d+ \d+ \d+$/);
      return value.split(' ').map(Number);
    };
    const color = (prop: string): number[] => {
      const value = styles.light[prop] ?? '';
      expect(value, `${prop} is missing`).toMatch(/^#[0-9a-f]{6}$/i);
      return hexToRgb(value);
    };

    /** Reads the strongest alpha a rig colour is given anywhere in the ground gradient. */
    const groundAlpha = (rig: 'ink' | 'bounce' | 'fill'): number => {
      const ground = declaration(lightingRule(`${LIGHT_SCOPE} #app`), 'background-image');
      const matches = [
        ...(ground?.value ?? '').matchAll(new RegExp(`rgb\\(var\\(--lm-${rig}\\)\\s*/\\s*([\\d.]+)\\)`, 'g')),
      ];
      expect(matches.length, `the ground does not use --lm-${rig}`).toBeGreaterThan(0);
      return Math.max(...matches.map((match) => Number(match[1])));
    };

    it('keeps secondary and tertiary text at 4.5:1 on the darkest corners of the ground', () => {
      const body = color('--sora_sys_color_util_body');

      // The falloff darkens toward the far corner, where the pink bounce (lower right) or the cool fill (upper
      // right) is strongest. Stack each pair at full strength: a deliberately pessimistic bound.
      const falloff = blend(body, triplet('--lm-ink'), groundAlpha('ink'));
      const corners = {
        'lower right': blend(falloff, triplet('--lm-bounce'), groundAlpha('bounce')),
        'upper right': blend(falloff, triplet('--lm-fill'), groundAlpha('fill')),
      };

      for (const [corner, ground] of Object.entries(corners)) {
        for (const text of ['--sora_sys_color_content-secondary', '--sora_sys_color_content-tertiary']) {
          expect(contrast(color(text), ground), `${text} on the ${corner} corner`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });

    it('keeps the primary action label readable on the glossy top of the button', () => {
      const glossTop = blend(hexToRgb('#bf065f'), [255, 255, 255], 0.16);
      expect(contrast([255, 255, 255], glossTop)).toBeGreaterThanOrEqual(4.5);
    });
  });
});
