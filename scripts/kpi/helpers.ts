export type HistoryRowInput = {
  timestamp: string;
  status: 'green' | 'yellow' | 'red';
  metrics: {
    classComponents: number | null;
    piniaParity: number | null;
    compatBuildStreak: number | null;
    translationStreak: number | null;
    bundleDelta: number | null;
  };
};

export const SUCCESS_VALUES = new Set(['success', 'passed', 'green']);

/**
 * Formats a numeric value with a fixed number of fraction digits.
 * Returns "-" when the value is not present.
 */
export const formatNumber = (value: number | null, fractionDigits = 2): string =>
  typeof value === 'number' ? value.toFixed(fractionDigits) : '-';

/**
 * Formats a ratio as a percentage string or "-" when unavailable.
 */
export const formatPercent = (value: number | null): string =>
  typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : '-';

/**
 * Formats a bundle delta as a percentage string or "-" when unavailable.
 */
export const formatDelta = (value: number | null): string =>
  typeof value === 'number' ? `${(value * 100).toFixed(2)}%` : '-';

/**
 * Counts consecutive successful statuses from the start of the list.
 */
export const calculateStreak = (statuses: Array<string | { status: string }>): number => {
  let streak = 0;
  for (const entry of statuses) {
    const raw = typeof entry === 'string' ? entry : entry?.status;
    if (!raw) break;
    const normalized = raw.toLowerCase();
    if (!SUCCESS_VALUES.has(normalized)) break;
    streak++;
  }
  return streak;
};

/**
 * Parses the Pinia parity table markdown and returns completion stats.
 */
export const parsePiniaParityTable = (markdown: string): { completed: number; total: number; ratio: number | null } => {
  const lines = markdown.split('\n').filter((line) => line.trim().startsWith('|'));
  let completed = 0;
  let total = 0;

  for (const line of lines) {
    if (line.includes('---')) continue;
    const cells = line
      .split('|')
      .map((cell) => cell.trim())
      .filter(Boolean);
    if (cells.length < 2) continue;
    const status = cells.at(-1);
    if (!status || status === 'Status' || status === 'Status |') continue;
    total++;
    if (status.includes('✅')) {
      completed++;
    }
  }

  return {
    completed,
    total,
    ratio: total > 0 ? completed / total : null,
  };
};

/**
 * Renders a KPI history row for the markdown log.
 */
export const renderMarkdownRow = (report: HistoryRowInput): string => {
  const date = report.timestamp.slice(0, 10);
  return `| ${date} | ${report.status} | ${formatNumber(report.metrics.classComponents, 0)} | ${formatPercent(
    report.metrics.piniaParity
  )} | ${report.metrics.compatBuildStreak ?? '-'} | ${report.metrics.translationStreak ?? '-'} | ${formatDelta(
    report.metrics.bundleDelta
  )} |`;
};
