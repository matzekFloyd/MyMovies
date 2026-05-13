# MyMovies

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Interactive **D3** bubble chart of personal movie ratings: each bubble is a film, sized by rating and colored by release era. Group films by decade, by rating, or combined in the center.

## Requirements

- [Node.js](https://nodejs.org/) 20+ (recommended; Netlify uses the version set in `netlify.toml`)

## Setup

```bash
npm install
```

## Scripts

| Command                      | Description                                      |
| ---------------------------- | ------------------------------------------------ |
| `npm run dev`                | Local dev server (Vite)                          |
| `npm run build`              | Production build to `dist/`                      |
| `npm run preview`            | Serve the production build locally               |
| `npm run import:letterboxd`  | Build `filme.csv` from a Letterboxd export (see **Data**) |

Open the URL Vite prints; start from **Documentation** (`index.html`) or go straight to **`filme.html`** for the chart.

## Data

Place your CSV at **`site/public/filme.csv`** (or replace the sample). Required columns:

| Column           | Description        |
| ---------------- | ------------------ |
| `title`          | Film title         |
| `yearOfRelease`  | Year (number)      |
| `rating`         | Rating 0–10 (number, half-steps supported in layout logic) |

The file is copied unchanged into `dist/` when you run `npm run build`.

### Letterboxd (no API key)

Letterboxd’s [member API](https://letterboxd.com/api-beta/) is **by application only**, and they currently say they **do not grant access** for personal projects, data analysis, or visualization—so this repo does **not** integrate with their API.

What works well instead is their official export: **[Settings → Import & Export → Export your data](https://letterboxd.com/settings/data/)**. You get a ZIP that includes **`diary.csv`** (and usually **`ratings.csv`** for films you rated without a diary entry).

Convert that export into `filme.csv` (Letterboxd’s **0.5–5** star scale is mapped to **0–10** by multiplying by 2):

```bash
npm run import:letterboxd -- path/to/letterboxd-export.zip
```

Or from extracted CSV files:

```bash
npm run import:letterboxd -- path/to/diary.csv path/to/ratings.csv
```

Options:

- `-o path/to/output.csv` — default is `site/public/filme.csv`
- `--include-unrated` — keep diary rows with no star rating as **0** (default is to skip them)

The importer collapses to **one row per title + release year**: it merges `diary.csv` with `ratings.csv`, strips a UTF-8 BOM if present, and when Letterboxd exposes the same film more than once (e.g. different URIs or diary vs ratings), it keeps the **higher** star rating after converting to 0–10. Each run also writes a **UTC timestamped** copy next to the main file (e.g. `site/public/filme-2026-05-13-14-22-01-042-utc.csv`) so you can keep snapshots without renaming by hand.

After importing, run `npm run dev` or `npm run build` as usual.

## Project layout

- **`site/`** — HTML, CSS, and `d3Script.js` (Vite root)
- **`site/public/`** — Static assets served as-is (including `filme.csv`)
- **`dist/`** — Build output (gitignored)

## Deploy on Netlify

The repo includes **`netlify.toml`**: build command `npm run build`, publish directory **`dist`**.

1. Push this repository to GitHub (or GitLab / Bitbucket).
2. In [Netlify](https://www.netlify.com/), **Add new site** → **Import an existing project**, pick the repo.
3. Netlify reads `netlify.toml` automatically; deploy.

No extra environment variables are required.

## License

This project is licensed under the [MIT License](LICENSE).
