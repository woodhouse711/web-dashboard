# Vibe-rary

A personal library of apps, tools, and interactive studies — all under one domain.

Projects live in `/projects/`. The build script auto-discovers them and generates the dashboard.

## Structure

```
projects/{slug}/       ← Add projects here
site/                  ← Container site (dashboard, viewer, upload UI)
build/                 ← Build tooling
templates/             ← Copy-paste starters for new projects
```

## Adding a Project

See `CLAUDE.md` for step-by-step instructions and `PROJECT-SPEC.md` for the full format contract.

Quick version:
1. Create `projects/{your-slug}/`
2. Add `meta.json`, `index.html`, optionally `thumb.png` and `README.md`
3. Run `node build/generate-manifest.js` to validate
4. Push to `main` — GitHub Actions deploys automatically

## Local Development

```bash
npm install
node build/generate-manifest.js
npx serve . -l 3000
# Open http://localhost:3000/site/
```

## Deployment

Hosted on GitHub Pages via GitHub Actions. Every push to `main` triggers a rebuild and deploy.

Enable in: **Repo Settings → Pages → Source → GitHub Actions**
