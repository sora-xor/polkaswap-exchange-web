import { describe, expect, it } from 'vitest';

const FORBIDDEN_PATTERNS: ReadonlyArray<RegExp> = [
  /\blazyView\s*\(/g,
  /\bpoolLazyView\s*\(/g,
  /\bvaultLazyView\s*\(/g,
  /\bdashboardLazyView\s*\(/g,
  /\bstakingLazyView\s*\(/g,
  /\bdemeterStakingLazyView\s*\(/g,
  /\bsoraStakingLazyView\s*\(/g,
];

function findForbiddenPatterns(content: string): string[] {
  const matches = new Set<string>();

  for (const pattern of FORBIDDEN_PATTERNS) {
    const regex = new RegExp(pattern);
    if (regex.test(content)) {
      matches.add(pattern.source);
    }
  }

  return [...matches];
}

describe('lazy view usage safety', () => {
  it('does not use route-only lazy helpers inside Vue SFC files', () => {
    const vueFiles = import.meta.glob('/src/**/*.vue', {
      eager: true,
      query: '?raw',
      import: 'default',
    }) as Record<string, string>;

    const offenders: string[] = [];

    for (const [file, content] of Object.entries(vueFiles)) {
      const matches = findForbiddenPatterns(content);

      if (matches.length) {
        offenders.push(`${file} -> ${matches.join(', ')}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
