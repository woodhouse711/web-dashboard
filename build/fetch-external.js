#!/usr/bin/env node
/**
 * fetch-external.js
 * Clones repos listed in repos.json, reads VIBE.md from each,
 * generates a projects/{slug}/ folder with meta.json + files.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPOS_FILE  = path.join(__dirname, '..', 'repos.json');
const PROJECTS_DIR = path.join(__dirname, '..', 'projects');
const TMP_DIR     = path.join(require('os').tmpdir(), 'vibe-fetch');

// --- VIBE.md frontmatter parser ---
// Expects YAML flow-style arrays: tags: [a, b, c]
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { meta: null, body: content };

  const raw  = match[1];
  const body = content.slice(match[0].length).trim();
  const meta = {};

  for (const line of raw.split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key   = line.slice(0, colon).trim();
    let   value = line.slice(colon + 1).trim();

    if (!key) continue;

    // Flow array: [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      meta[key] = value
        .slice(1, -1)
        .split(',')
        .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    }
    // Quoted string
    else if (/^['"].*['"]$/.test(value)) {
      meta[key] = value.slice(1, -1);
    }
    // Everything else
    else {
      meta[key] = value;
    }
  }

  return { meta, body };
}

function slugFromRepo(repo) {
  // "woodhouse711/my-cool-app" → "my-cool-app"
  return repo.split('/').pop().toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    // Skip git internals and common noise
    if (['.git', 'node_modules', '.DS_Store'].includes(entry.name)) continue;
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function detectFormat(dir) {
  if (fs.existsSync(path.join(dir, 'index.html')))  return 'html';
  if (fs.existsSync(path.join(dir, 'index.jsx')))   return 'react';
  if (fs.existsSync(path.join(dir, 'content.md')))  return 'markdown';
  if (fs.existsSync(path.join(dir, 'data.json')))   return 'json';
  return 'html';
}

function processRepo(repo) {
  const slug    = slugFromRepo(repo);
  const cloneDir = path.join(TMP_DIR, slug);
  const destDir  = path.join(PROJECTS_DIR, slug);

  console.log(`\nFetching: ${repo} → projects/${slug}/`);

  // Clone
  try {
    if (fs.existsSync(cloneDir)) {
      fs.rmSync(cloneDir, { recursive: true, force: true });
    }
    execSync(
      `git clone --depth 1 https://github.com/${repo}.git "${cloneDir}"`,
      { stdio: 'pipe' }
    );
  } catch (e) {
    console.warn(`  [SKIP] Could not clone ${repo}: ${e.message.split('\n')[0]}`);
    return;
  }

  // Read VIBE.md
  const vibePath = path.join(cloneDir, 'VIBE.md');
  let meta = null;
  let vibeBody = null;

  if (fs.existsSync(vibePath)) {
    const { meta: parsed, body } = parseFrontmatter(fs.readFileSync(vibePath, 'utf8'));
    meta     = parsed;
    vibeBody = body;
    console.log(`  Found VIBE.md`);
  } else {
    console.warn(`  [WARN] No VIBE.md found — using defaults`);
  }

  // Copy project files
  copyDir(cloneDir, destDir);

  // Build meta.json (VIBE.md frontmatter wins; fall back to sensible defaults)
  const format = (meta && meta.format) || detectFormat(destDir);
  const today  = new Date().toISOString().split('T')[0];

  const metaJson = {
    title:       (meta && meta.title)       || slug,
    description: (meta && meta.description) || '',
    date:        (meta && meta.date)        || today,
    tags:        (meta && meta.tags)        || [],
    status:      (meta && meta.status)      || 'draft',
    render:      (meta && meta.render)      || 'iframe',
    format,
    aspect:      (meta && meta.aspect)      || '16:9',
    author:      (meta && meta.author)      || '',
    links:       (meta && meta.links)       || [],
    version:     (meta && meta.version)     || '1.0.0',
    source:      `https://github.com/${repo}`,
  };

  fs.writeFileSync(
    path.join(destDir, 'meta.json'),
    JSON.stringify(metaJson, null, 2)
  );

  // Write VIBE.md body as README.md if no README exists
  if (vibeBody && !fs.existsSync(path.join(destDir, 'README.md'))) {
    fs.writeFileSync(path.join(destDir, 'README.md'), vibeBody);
  }

  console.log(`  Done → projects/${slug}/`);
}

function main() {
  console.log('Vibe-rary — External Repo Fetcher');
  console.log('===================================');

  if (!fs.existsSync(REPOS_FILE)) {
    console.log('No repos.json found. Skipping external fetch.');
    return;
  }

  const { repos } = JSON.parse(fs.readFileSync(REPOS_FILE, 'utf8'));

  if (!repos || repos.length === 0) {
    console.log('repos.json is empty. Add repos to start aggregating.');
    return;
  }

  fs.mkdirSync(TMP_DIR, { recursive: true });

  let fetched = 0;
  let skipped = 0;

  for (const repo of repos) {
    try {
      processRepo(repo);
      fetched++;
    } catch (e) {
      console.error(`  [ERROR] ${repo}: ${e.message}`);
      skipped++;
    }
  }

  // Cleanup temp
  try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch {}

  console.log('\n===================================');
  console.log(`Fetched: ${fetched}  Skipped: ${skipped}`);
}

main();
