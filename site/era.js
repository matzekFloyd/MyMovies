/**
 * Release-year “eras” for colour, legend, and decade forces.
 * Indices: 0 = ≤1950, 1–6 = 1950s…2000s, 7+ = 2010s, 2020s, …
 */
export class Era {
  static #BG = [
    "#910080",
    "#FF0002",
    "#FF7C00",
    "#FFF600",
    "#C5E000",
    "#5EC418",
    "#00A0F3",
    "#222183",
    "#5b21b6",
    "#7c3aed",
    "#a855f7",
    "#db2777",
    "#0891b2",
    "#059669",
    "#ca8a04",
  ];

  static #FG = [
    "#fff",
    "#fff",
    "#111",
    "#111",
    "#111",
    "#111",
    "#fff",
    "#fff",
    "#fff",
    "#fff",
    "#111",
    "#fff",
    "#fff",
    "#fff",
    "#111",
  ];

  /** Highest calendar year represented (drives how many legend swatches / era slots exist). */
  #maxYear;

  constructor(chartMaxYear) {
    this.#maxYear = chartMaxYear;
  }

  /** Number of legend rows / era bands up to and including {@link #maxYear}. */
  get count() {
    return Era.index(this.#maxYear) + 1;
  }

  /** Era index for a release year (0-based). */
  static index(year) {
    if (year <= 1950) return 0;
    if (year < 1960) return 1;
    if (year < 1970) return 2;
    if (year < 1980) return 3;
    if (year < 1990) return 4;
    if (year < 2000) return 5;
    if (year < 2010) return 6;
    return 7 + Math.floor((year - 2010) / 10);
  }

  /** Fill colour for a bubble from its release year. */
  fillForYear(year) {
    return Era.#pick(Era.#BG, Era.index(year));
  }

  /** Legend swatch background for era index `i`. */
  static swatchBackground(i) {
    return Era.#pick(Era.#BG, i);
  }

  /** Legend swatch text colour for era index `i`. */
  static swatchForeground(i) {
    return Era.#pick(Era.#FG, i);
  }

  /** Legend label for era index `i`. */
  static legendLabel(i) {
    if (i === 0) return "1900 – 1950";
    if (i <= 6) {
      const start = 1940 + i * 10;
      return `${start} – ${start + 9}`;
    }
    const start = 2010 + (i - 7) * 10;
    return `${start} – ${start + 9}`;
  }

  static #pick(palette, i) {
    return palette[Math.min(i, palette.length - 1)];
  }
}
