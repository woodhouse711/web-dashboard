# Claude Code Instructions — Vibe-rary

This is a static portfolio site hosted on GitHub Pages. Projects live in `/projects/{slug}/`.
See `PROJECT-SPEC.md` for the full format contract.

## Adding a New Project

1. Create folder: `/projects/{slug}/`
   - Slug must be lowercase letters, numbers, and hyphens only (e.g. `my-cool-app`)
2. Add `meta.json` with all required fields (see PROJECT-SPEC.md)
3. Add `index.html` (or the appropriate entry point for the declared format)
4. Add `thumb.png` or `thumb.svg` — 1200×630px recommended (16:9)
5. Optionally add `README.md` for documentation shown in the viewer
6. Set `"status": "draft"` until ready, then change to `"published"`
7. Run the build script to validate: `node build/generate-manifest.js`
8. Commit and push — GitHub Actions handles deployment automatically

## Quick Reference

```bash
# Validate all projects and generate site-data.json
node build/generate-manifest.js

# Preview locally (requires npx / serve)
npx serve . -l 3000
# Then open http://localhost:3000/site/
```

## Available Templates

Copy from `/templates/` for a quick start:

| Template | Format | Use for |
|---|---|---|
| `html-canvas` | html | Canvas-based animations, generative art |
| `html-dom` | html | DOM-based interactive experiments |
| `react-app` | react | React component studies |
| `data-viz` | json | Data-driven visualizations |

## Build Rules

**Will FAIL the build:**
- Missing `meta.json`
- Missing required fields: `title`, `description`, `date`, `tags`, `status`, `render`
- Invalid `status` (must be `published`, `draft`, or `archived`)
- Invalid date format (must be `YYYY-MM-DD`)
- Missing entry point file for declared format

**Will WARN (build still passes):**
- Missing thumbnail
- Missing README
- More than 5 tags

## Design Tokens

When building projects, these CSS custom properties harmonize with the container site:

```css
--bg:     #0c0c0c   /* page background */
--fg:     #e8e6e1   /* primary text */
--accent: #4a9eff   /* blue accent */
```

Font: `system-ui` stack. Spacing: 8px grid (4, 8, 12, 16, 24, 32, 48, 64, 96).

## Asset Rules

- All asset paths in projects **must be relative** — no absolute URLs to local files
- Thumbnails: `thumb.png` or `thumb.svg` at the project root
- Keep projects self-contained — all dependencies either inline, relative, or CDN

## Repo Structure

```
web-dashboard/
├── .github/workflows/deploy.yml  ← CI/CD — do not edit unless changing build
├── build/generate-manifest.js    ← Build script — run to validate projects
├── projects/{slug}/              ← Add new projects here
├── site/                         ← Container site — edit with care
├── templates/                    ← Copy-paste starters
├── PROJECT-SPEC.md               ← Full format contract
└── CLAUDE.md                     ← This file
```
