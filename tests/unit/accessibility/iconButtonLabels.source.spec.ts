import { describe, expect, it } from 'vitest';

type MissingIconButtonLabel = {
  file: string;
  line: number;
  openTag: string;
};

const sourceFiles = import.meta.glob('../../../src/**/*.vue', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;
const ignoredFiles = new Set(['components/shared/Button/SvgIconButton/SvgIconButton.vue']);

/** Removes icon-only markup while preserving real static or dynamic button text. */
function getVisibleButtonText(buttonSource: string): string {
  return buttonSource
    .replace(/<template\s+#icon[\s\S]*?<\/template>/g, '')
    .replace(/<s-icon\b[\s\S]*?<\/s-icon>/g, '')
    .replace(/<template[\s\S]*?<\/template>/g, 'TEXT')
    .replace(/{{[\s\S]*?}}/g, 'TEXT')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/** Finds icon-only SButton controls that do not expose an accessible name. */
function findMissingIconButtonLabels(): MissingIconButtonLabel[] {
  return Object.entries(sourceFiles).flatMap(([file, source]) => {
    const normalizedFile = file.replace(/^.*\/src\//, '');

    if (ignoredFiles.has(normalizedFile)) return [];

    const buttonExpression = /<s-button\b[\s\S]*?<\/s-button>/g;
    const matches = [...source.matchAll(buttonExpression)];

    return matches.flatMap((match) => {
      const buttonSource = match[0];
      const openTag = buttonSource.slice(0, buttonSource.indexOf('>') + 1);
      const hasIcon = /\bicon\s*=|<s-icon\b|#icon/.test(buttonSource);
      const hasAccessibleName = /\baria-label\s*=|\baria-labelledby\s*=/.test(openTag);

      if (!hasIcon || hasAccessibleName || getVisibleButtonText(buttonSource)) {
        return [];
      }

      const line = source.slice(0, match.index).split('\n').length;
      return [
        {
          file: normalizedFile,
          line,
          openTag: openTag.replace(/\s+/g, ' ').trim(),
        },
      ];
    });
  });
}

describe('icon-only button accessibility labels', () => {
  it('names icon-only SButton controls', () => {
    expect(findMissingIconButtonLabels()).toEqual([]);
  });
});
