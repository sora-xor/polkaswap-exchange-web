import { compileStyle, parse } from '@vue/compiler-sfc';
import { parse as parseCss, type Root } from 'postcss';
import { compileString } from 'sass';
import { describe, expect, it } from 'vitest';
import botsSource from '@/features/bot-trading/pages/BotsPage.vue?raw';
import builderSource from '@/features/bot-trading/components/RuleBuilder.vue?raw';
import playgroundSource from '@/features/bot-trading/components/BotPlayground.vue?raw';

const SCOPE = 'data-v-native-theme-test';

/** Inspect the emitted selectors: Vue can discard descendants placed after :global(). */
function stylesheet(source: string): Root {
  const style = parse(source).descriptor.styles[0];
  const compiled = compileStyle({
    source: compileString(style.content).css,
    id: SCOPE,
    scoped: style.scoped,
  });
  expect(compiled.errors).toEqual([]);
  return parseCss(compiled.code);
}

/** Collect every declaration so a later theme override cannot silently replace a native token. */
function values(root: Root, property: string): string[] {
  const result: string[] = [];
  root.walkDecls(property, (declaration) => {
    result.push(declaration.value);
  });
  return result;
}

describe('Bots native theme contract', () => {
  const bots = stylesheet(botsSource);
  const builder = stylesheet(builderSource);
  const playground = stylesheet(playgroundSource);

  it('inherits the app surface and input background without a separate dark palette', () => {
    expect(values(bots, '--bot-surface')).toEqual(['var(--s-color-utility-surface)']);
    expect(values(bots, '--bot-recess')).toEqual(['var(--s-color-base-background)']);
    expect(values(bots, '--bot-cyan')).toEqual(['var(--s-color-status-success-text)']);
  });

  it('keeps raised and inset relief while taking every shadow color from the native theme', () => {
    const raised = values(bots, '--bot-shadow-raised');
    const inset = values(bots, '--bot-shadow-inset');
    expect(raised).toHaveLength(1);
    expect(inset).toHaveLength(1);
    expect(raised[0]).not.toContain('inset');
    expect(inset[0].match(/inset/g)).toHaveLength(2);
    const controlShadows = values(builder, 'box-shadow');
    expect(controlShadows).toHaveLength(3);
    expect(controlShadows.filter((shadow) => shadow.includes('inset'))).toHaveLength(2);
    for (const shadow of [...raised, ...inset, ...controlShadows]) {
      expect([...shadow.matchAll(/var\((--[^)]+)\)/g)].map((match) => match[1])).toEqual([
        '--s-shadow-color-dark',
        '--s-shadow-color-light-dark',
      ]);
      expect(shadow).not.toMatch(/#|rgba?\(|hsla?\(/);
    }
  });

  it('keeps custom properties scoped to their component after Sass and Vue compilation', () => {
    for (const root of [bots, builder, playground]) {
      root.walkDecls(/^--(?:bot|rule|research)-/, (declaration) => {
        const parent = declaration.parent;
        expect(parent?.type).toBe('rule');
        if (parent?.type === 'rule') expect(parent.selector).toContain(`[${SCOPE}]`);
      });
    }
  });

  it('uses native readable result colors in both modes without inheritable dark overrides', () => {
    expect(values(playground, '--research-positive')).toEqual(['var(--s-color-status-success-text)']);
    expect(values(playground, '--research-negative')).toEqual(['var(--s-color-status-error-text)']);
  });
});
