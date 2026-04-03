#!/usr/bin/env node
/**
 * generate-manifest.js
 * Scans /projects/, validates each project, outputs site-data.json
 */

const fs = require('fs');
const path = require('path');

const PROJECTS_DIR = path.join(__dirname, '..', 'projects');
const OUTPUT_FILE = path.join(__dirname, '..', 'site-data.json');

const VALID_STATUSES = ['published', 'draft', 'archived'];
const VALID_FORMATS = ['html', 'react', 'json', 'markdown', 'static'];
const VALID_RENDERS = ['iframe', 'inline'];
const VALID_ASPECTS = ['16:9', '4:3', '1:1'];

const FORMAT_ENTRY_POINTS = {
  html:     'index.html',
  react:    'index.jsx',
  json:     'data.json',
  markdown: 'content.md',
  static:   'index.html',
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

let errors = 0;
let warnings = 0;

function fail(slug, msg) {
  console.error(`  [ERROR] ${slug}: ${msg}`);
  errors++;
}

function warn(slug, msg) {
  console.warn(`  [WARN]  ${slug}: ${msg}`);
  warnings++;
}

function validateMeta(slug, meta) {
  const required = ['title', 'description', 'date', 'tags', 'status', 'render'];
  for (const field of required) {
    if (meta[field] === undefined || meta[field] === null || meta[field] === '') {
      fail(slug, `Missing required field: "${field}"`);
    }
  }

  if (meta.status && !VALID_STATUSES.includes(meta.status)) {
    fail(slug, `Invalid status "${meta.status}". Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  if (meta.render && !VALID_RENDERS.includes(meta.render)) {
    fail(slug, `Invalid render "${meta.render}". Must be one of: ${VALID_RENDERS.join(', ')}`);
  }

  if (meta.format && !VALID_FORMATS.includes(meta.format)) {
    fail(slug, `Invalid format "${meta.format}". Must be one of: ${VALID_FORMATS.join(', ')}`);
  }

  if (meta.aspect && !VALID_ASPECTS.includes(meta.aspect)) {
    warn(slug, `Unknown aspect "${meta.aspect}". Expected: ${VALID_ASPECTS.join(', ')}`);
  }

  if (meta.date && !DATE_REGEX.test(meta.date)) {
    fail(slug, `Invalid date format "${meta.date}". Must be YYYY-MM-DD`);
  }

  if (meta.tags && Array.isArray(meta.tags) && meta.tags.length > 5) {
    warn(slug, `Has ${meta.tags.length} tags (max recommended: 5)`);
  }
}

function processProject(slug) {
  const projectDir = path.join(PROJECTS_DIR, slug);
  const metaPath = path.join(projectDir, 'meta.json');

  console.log(`\nProcessing: ${slug}`);

  // meta.json required
  if (!fs.existsSync(metaPath)) {
    fail(slug, 'Missing meta.json');
    return null;
  }

  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  } catch (e) {
    fail(slug, `meta.json parse error: ${e.message}`);
    return null;
  }

  validateMeta(slug, meta);

  // Check entry point
  const format = meta.format || 'html';
  const entryFile = FORMAT_ENTRY_POINTS[format] || 'index.html';
  const entryPath = path.join(projectDir, entryFile);
  if (!fs.existsSync(entryPath)) {
    fail(slug, `Missing entry point file: "${entryFile}" (required for format "${format}")`);
  }

  // Warn on missing optional files
  const thumbPath = path.join(projectDir, 'thumb.png');
  const thumbSvgPath = path.join(projectDir, 'thumb.svg');
  const hasThumb = fs.existsSync(thumbPath) || fs.existsSync(thumbSvgPath);
  if (!hasThumb) {
    warn(slug, 'No thumbnail found (thumb.png or thumb.svg). Will use default.');
  }

  const readmePath = path.join(projectDir, 'README.md');
  const hasReadme = fs.existsSync(readmePath);

  // Determine thumb path
  let thumbRelPath = null;
  if (fs.existsSync(thumbPath)) thumbRelPath = `projects/${slug}/thumb.png`;
  else if (fs.existsSync(thumbSvgPath)) thumbRelPath = `projects/${slug}/thumb.svg`;

  return {
    slug,
    title: meta.title || '',
    description: meta.description || '',
    date: meta.date || '',
    tags: meta.tags || [],
    status: meta.status || 'draft',
    render: meta.render || 'iframe',
    format: format,
    aspect: meta.aspect || '16:9',
    author: meta.author || '',
    links: meta.links || [],
    version: meta.version || '1.0.0',
    thumb: thumbRelPath,
    path: `projects/${slug}/`,
    hasReadme,
  };
}

function main() {
  console.log('Vibe-rary — Manifest Generator');
  console.log('================================');

  if (!fs.existsSync(PROJECTS_DIR)) {
    console.log('No /projects directory found. Creating empty manifest.');
    const output = { generated: new Date().toISOString(), projects: [] };
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    return;
  }

  const slugs = fs.readdirSync(PROJECTS_DIR).filter(name => {
    const stat = fs.statSync(path.join(PROJECTS_DIR, name));
    return stat.isDirectory();
  });

  if (slugs.length === 0) {
    console.log('No projects found. Creating empty manifest.');
    const output = { generated: new Date().toISOString(), projects: [] };
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    return;
  }

  const projects = [];
  for (const slug of slugs) {
    const project = processProject(slug);
    if (project) projects.push(project);
  }

  // Sort by date descending
  projects.sort((a, b) => b.date.localeCompare(a.date));

  const output = {
    generated: new Date().toISOString(),
    projects,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log('\n================================');
  console.log(`Processed: ${slugs.length} project(s)`);
  console.log(`Published: ${projects.filter(p => p.status === 'published').length}`);
  console.log(`Warnings:  ${warnings}`);
  console.log(`Errors:    ${errors}`);
  console.log(`Output:    site-data.json`);

  if (errors > 0) {
    console.error(`\nBuild FAILED with ${errors} error(s).`);
    process.exit(1);
  }

  console.log('\nBuild successful.');
}

main();
