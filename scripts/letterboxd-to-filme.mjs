/**
 * Converts Letterboxd account export (ZIP or diary.csv / ratings.csv)
 * into site/public/filme.csv (title, yearOfRelease, rating on 0–10 scale).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const defaultOut = resolve(repoRoot, "site/public/filme.csv");

function usage() {
  console.error(`Usage:
  npm run import:letterboxd -- <export.zip|diary.csv> [ratings.csv]
  node scripts/letterboxd-to-filme.mjs <export.zip|diary.csv> [ratings.csv]

Options:
  -o, --out <path>     Output CSV (default: site/public/filme.csv). A second
                       copy is always written alongside it with a UTC timestamp
                       in the filename (same stem, e.g. filme-2026-05-13-…-utc.csv).
  --include-unrated    Include diary rows with no star rating as rating 0

Letterboxd exports use a 0.5–5 star scale. This script maps to 0–10 by multiplying by 2.
`);
}

function parseArgs(argv) {
  const args = { out: defaultOut, includeUnrated: false, positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-o" || a === "--out") {
      args.out = resolve(argv[++i] || "");
      continue;
    }
    if (a === "--include-unrated") {
      args.includeUnrated = true;
      continue;
    }
    if (a === "-h" || a === "--help") {
      args.help = true;
      continue;
    }
    args.positional.push(a);
  }
  return args;
}

function stripBom(text) {
  return text.replace(/^\uFEFF/, "");
}

function parseCsv(text) {
  const clean = stripBom(text);
  return parse(clean, {
    columns: (header) => header.map((h) => String(h).trim().replace(/^\uFEFF/, "")),
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });
}

function parseLoggedDate(row) {
  const raw = row.Date ?? row["Date logged"] ?? "";
  const t = Date.parse(raw);
  return Number.isNaN(t) ? 0 : t;
}

function normalizeTitle(title) {
  return String(title ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function filmKey(row) {
  const uri = (row["Letterboxd URI"] ?? row.LetterboxdURI ?? "").trim();
  if (uri) return `uri:${uri}`;
  const name = normalizeTitle(row.Name ?? row.Title ?? "");
  const year = String(row.Year ?? "").trim();
  if (!name || !year) return "";
  return `ny:${year}|||${name}`;
}

function parseRating5(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function pickRepresentativeRow(rows) {
  const rated = rows.filter((r) => parseRating5(r.Rating) != null);
  const pool = rated.length ? rated : rows;
  return pool.reduce((best, r) => (parseLoggedDate(r) >= parseLoggedDate(best) ? r : best));
}

function mergeRows(allRows) {
  const groups = new Map();
  for (const row of allRows) {
    const key = filmKey(row);
    if (!key || key === "ny:|||") continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const merged = [];
  for (const rows of groups.values()) {
    merged.push(pickRepresentativeRow(rows));
  }
  return merged;
}

function rowUri(row) {
  return (row["Letterboxd URI"] ?? row.LetterboxdURI ?? "").trim();
}

/**
 * Diary rows usually have Letterboxd URIs; ratings-only rows may not, which
 * used to create a second group for the same film. Prefer URI-backed rows;
 * merge in higher ratings from name+year rows that match the same title+year.
 */
function dedupeFilms(rows) {
  const nameYearKey = (r) => `${normalizeTitle(r.title)}|||${r.yearOfRelease}`;

  const byUri = new Map();
  for (const r of rows) {
    if (!r.uri) continue;
    const prev = byUri.get(r.uri);
    if (!prev || r.rating > prev.rating) byUri.set(r.uri, { ...r });
  }

  const uriBacked = [...byUri.values()];
  const uriByNy = new Map(uriBacked.map((r) => [nameYearKey(r), r]));

  const byNy = new Map();
  for (const r of rows) {
    if (r.uri) continue;
    const k = nameYearKey(r);
    const uriMatch = uriByNy.get(k);
    if (uriMatch) {
      if (r.rating > uriMatch.rating) uriMatch.rating = r.rating;
      continue;
    }
    const prev = byNy.get(k);
    if (!prev || r.rating > prev.rating) byNy.set(k, { ...r });
  }

  const merged = [...uriBacked, ...byNy.values()].map(({ title, yearOfRelease, rating }) => ({
    title,
    yearOfRelease,
    rating,
  }));

  merged.sort(
    (a, b) => a.yearOfRelease - b.yearOfRelease || a.title.localeCompare(b.title),
  );
  return merged;
}

/** One row per title + year (Letterboxd can list the same film under multiple URIs). */
function collapseSameTitleYear(rows) {
  const key = (r) => `${normalizeTitle(r.title)}|||${r.yearOfRelease}`;
  const m = new Map();
  for (const r of rows) {
    const k = key(r);
    const prev = m.get(k);
    if (!prev || r.rating > prev.rating) {
      m.set(k, { title: r.title, yearOfRelease: r.yearOfRelease, rating: r.rating });
    }
  }
  return [...m.values()].sort(
    (a, b) => a.yearOfRelease - b.yearOfRelease || a.title.localeCompare(b.title),
  );
}

function toOutputRows(rows, { includeUnrated }) {
  const out = [];
  for (const row of rows) {
    const title = String(row.Name ?? row.Title ?? "").trim().replace(/\s+/g, " ");
    const year = Number.parseInt(String(row.Year ?? "").trim(), 10);
    if (!title || !Number.isFinite(year)) continue;

    const r5 = parseRating5(row.Rating);
    let rating10;
    if (r5 == null) {
      if (!includeUnrated) continue;
      rating10 = 0;
    } else {
      rating10 = r5 * 2;
    }
    const uri = rowUri(row);
    out.push({ title, yearOfRelease: year, rating: rating10, uri });
  }
  return collapseSameTitleYear(dedupeFilms(out));
}

function csvEscape(value) {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeFilmeCsv(path, rows) {
  const lines = ["title,yearOfRelease,rating"];
  for (const r of rows) {
    lines.push(`${csvEscape(r.title)},${r.yearOfRelease},${r.rating}`);
  }
  writeFileSync(path, lines.join("\n") + "\n", "utf8");
}

/** e.g. 2026-05-13-12-36-45-123-utc (safe for Windows filenames) */
function utcTimestampForFilename(date = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  const ms = String(date.getUTCMilliseconds()).padStart(3, "0");
  return `${date.getUTCFullYear()}-${p(date.getUTCMonth() + 1)}-${p(date.getUTCDate())}-${p(date.getUTCHours())}-${p(date.getUTCMinutes())}-${p(date.getUTCSeconds())}-${ms}-utc`;
}

function timestampedCopyPath(primaryOutPath) {
  const dir = dirname(primaryOutPath);
  const stem = basename(primaryOutPath, extname(primaryOutPath)) || "filme";
  return join(dir, `${stem}-${utcTimestampForFilename()}.csv`);
}

function readZipCsv(zipPath, filename) {
  const zip = new AdmZip(zipPath);
  const re = new RegExp(`(^|/)${filename}$`, "i");
  const entry = zip.getEntries().find((e) => !e.isDirectory && re.test(e.entryName.replace(/\\/g, "/")));
  if (!entry) return null;
  return entry.getData().toString("utf8");
}

function loadInputs(paths) {
  if (paths.length === 0) throw new Error("Missing input path (ZIP or diary.csv).");
  const [first, second] = paths;
  const rows = [];

  if (/\.zip$/i.test(first)) {
    const diaryText = readZipCsv(first, "diary.csv");
    if (!diaryText) throw new Error(`No diary.csv found inside ZIP: ${first}`);
    rows.push(...parseCsv(diaryText));
    const ratingsText = readZipCsv(first, "ratings.csv");
    if (ratingsText) rows.push(...parseCsv(ratingsText));
    if (second) {
      const extra = readFileSync(second, "utf8");
      rows.push(...parseCsv(extra));
    }
  } else {
    const diaryText = readFileSync(first, "utf8");
    rows.push(...parseCsv(diaryText));
    if (second) {
      const ratingsText = readFileSync(second, "utf8");
      rows.push(...parseCsv(ratingsText));
    }
  }

  return rows;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.positional.length === 0) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  const rawRows = loadInputs(args.positional);
  const merged = mergeRows(rawRows);
  const output = toOutputRows(merged, { includeUnrated: args.includeUnrated });

  writeFilmeCsv(args.out, output);
  const stamped = timestampedCopyPath(args.out);
  writeFilmeCsv(stamped, output);
  console.log(`Wrote ${output.length} rows to ${args.out}`);
  console.log(`Wrote timestamped copy to ${stamped}`);
}

main();
