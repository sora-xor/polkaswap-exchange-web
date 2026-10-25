/**
 * Extracts the first question for compact market headings without paraphrasing it.
 * Query markers in web URLs are ignored; titles without a question remain intact.
 * This is presentation-only: retain the original title for the full market rules.
 */
export function getMarketQuestion(title: string): string {
  const trimmedTitle = title.trim();

  for (const match of trimmedTitle.matchAll(/[?？]/g)) {
    const prefix = trimmedTitle.slice(0, match.index);
    if (!prefix.trim() || /(?:https?:\/\/|www\.)\S*$/i.test(prefix)) continue;

    return trimmedTitle.slice(0, match.index + 1).trim();
  }

  return trimmedTitle;
}
