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

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Local dev server (Vite)              |
| `npm run build`   | Production build to `dist/`          |
| `npm run preview` | Serve the production build locally   |

Open the URL Vite prints; start from **Documentation** (`index.html`) or go straight to **`filme.html`** for the chart.

## Data

Place your CSV at **`site/public/filme.csv`** (or replace the sample). Required columns:

| Column           | Description        |
| ---------------- | ------------------ |
| `title`          | Film title         |
| `yearOfRelease`  | Year (number)      |
| `rating`         | Rating 0–10 (number, half-steps supported in layout logic) |

The file is copied unchanged into `dist/` when you run `npm run build`.

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
