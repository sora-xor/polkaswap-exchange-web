/**
 * Sizing long Burn page amounts to their line.
 *
 * A figure such as "≈ 2,061,228.0554" must never break mid-number or push its unit onto a line of its own, but at
 * phone widths a seven- or eight-digit value is wider than its line at the normal size. The components pass the
 * figure's width in em as the `--fit-em` custom property, and their CSS divides the room left beside the unit by it
 * (`calc((100cqi - <unit room>) / var(--fit-em))`, clamped between a legible minimum and the usual size).
 *
 * Widths are advance widths of the app's Sora font with tabular figures, measured on 25 November 2026 in Chromium
 * and WebKit at weights 500, 600 and 700 (the heaviest value of each is used): every figure is 0.676em, a grouping
 * or decimal mark at most 0.273em, a space 0.222em, "≈" 0.549em, the Arabic grouping and decimal marks 0.526em.
 * Anything else counts as 0.75em, wider than any figure.
 */

/** Advance width in em of each character a formatted amount may contain. */
const FIGURE_EM: Readonly<Record<string, number>> = {
  ',': 0.273,
  '.': 0.273,
  "'": 0.273,
  ' ': 0.222,
  '\u00a0': 0.222,
  '\u202f': 0.222,
  '≈': 0.549,
  '+': 0.676,
  '-': 0.676,
  '\u2212': 0.676,
  '٫': 0.526,
  '٬': 0.526,
};

/** Every decimal digit, in any script, is counted at the width of a Sora tabular figure. */
const DIGIT = /\p{Nd}/u;
const DIGIT_EM = 0.676;
const OTHER_EM = 0.75;
/** Headroom for rounding and rendering differences, so the computed size never lets a line overflow. */
const MARGIN = 1.03;

/**
 * Width of `text` in em when set in Sora with tabular figures, including a 3% margin.
 *
 * @param text - the amount exactly as displayed, e.g. `≈ 1.234.567,8912` or `+48,217,317.5`.
 * @returns the width in em, rounded up to 3 decimals and never below 1, so the CSS division always has a positive
 *   divisor (a figure that short simply takes its usual size).
 */
export function figureEm(text: string): number {
  let em = 0;
  for (const char of text) em += FIGURE_EM[char] ?? (DIGIT.test(char) ? DIGIT_EM : OTHER_EM);
  return Math.max(1, Math.ceil(em * MARGIN * 1000) / 1000);
}
