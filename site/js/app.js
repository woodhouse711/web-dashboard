/**
 * app.js — Vibe-rary Dashboard
 * Loads site-data.json, renders project cards, handles filtering/search/sort.
 */

const MANIFEST_PATH = '../site-data.json';

// Aspect ratio → CSS aspect-ratio value
const ASPECT_MAP = {
  '16:9': '16/9',
  '4:3':  '4/3',
  '1:1':  '1/1',
};

// Default SVG placeholder thumbnail (inline)
const DEFAULT_THUMB_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="3" width="18" height="18" rx="2"/>
  <circle cx="8.5" cy="8.5" r="1.5"/>
  <polyline points="21 15 16 10 5 21"/>
</svg>`;

let allProjects = [];
let activeTag = null;

// --- URL params state ---
function getParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    q:      p.get('q') || '',
    tag:    p.get('tag') || '',
    status: p.get('status') || 'all',
    sort:   p.get('sort') || 'date-desc',
  };
}

function setParams(updates) {
  const p = new URLSearchParams(window.location.search);
  Object.entries(updates).forEach(([k, v]) => {
    if (!v || v === 'all' || v === 'date-desc') p.delete(k);
    else p.set(k, v);
  });
  const str = p.toString();
  history.replaceState(null, '', str ? `?${str}` : window.location.pathname);
}

// --- Data loading ---
async function loadManifest() {
  const res = await fetch(MANIFEST_PATH);
  if (!res.ok) throw new Error(`Failed to load manifest: ${res.status}`);
  return res.json();
}

// --- Filtering & sorting ---
function filterProjects(projects, { q, tag, status, sort }) {
  let filtered = [...projects];

  if (status !== 'all') {
    filtered = filtered.filter(p => p.status === status);
  }

  if (tag) {
    filtered = filtered.filter(p => p.tags.includes(tag));
  }

  if (q) {
    const lower = q.toLowerCase();
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower) ||
      p.tags.some(t => t.toLowerCase().includes(lower))
    );
  }

  filtered.sort((a, b) => {
    switch (sort) {
      case 'date-asc':   return a.date.localeCompare(b.date);
      case 'title-asc':  return a.title.localeCompare(b.title);
      case 'title-desc': return b.title.localeCompare(a.title);
      default:           return b.date.localeCompare(a.date); // date-desc
    }
  });

  return filtered;
}

// --- Render helpers ---
function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m, 10) - 1]} ${d}, ${y}`;
}

function buildCard(project) {
  const link = document.createElement('a');
  link.className = 'project-card';
  link.href = `project.html?slug=${encodeURIComponent(project.slug)}`;
  link.setAttribute('data-slug', project.slug);

  const thumbHtml = project.thumb
    ? `<img src="../${project.thumb}" alt="${project.title}" loading="lazy" />`
    : `<div class="card-thumb-placeholder">${DEFAULT_THUMB_SVG}</div>`;

  const draftBadge = project.status !== 'published'
    ? `<span class="card-draft-badge">${project.status}</span>`
    : '';

  const visibleTags = project.tags.slice(0, 3);
  const tagsHtml = visibleTags
    .map(t => `<span class="card-tag">${t}</span>`)
    .join('');

  link.innerHTML = `
    <div class="card-thumb" style="aspect-ratio:${ASPECT_MAP[project.aspect] || '16/9'}">
      ${thumbHtml}
      ${draftBadge}
    </div>
    <div class="card-body">
      <div class="card-meta">
        <span class="card-date">${formatDate(project.date)}</span>
        <span class="card-format-badge">${project.format}</span>
      </div>
      <div class="card-title">${project.title}</div>
      <div class="card-desc">${project.description}</div>
      ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
    </div>
  `;

  // Stagger animation
  return link;
}

function renderGrid(projects) {
  const grid = document.getElementById('project-grid');
  grid.innerHTML = '';

  if (projects.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin:0 auto var(--sp-4);opacity:0.2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p>No projects match your filters.</p>
      </div>`;
    return;
  }

  projects.forEach((project, i) => {
    const card = buildCard(project);
    card.style.animationDelay = `${i * 30}ms`;
    grid.appendChild(card);
  });
}

function renderTagPills(projects, activeTagValue) {
  const container = document.getElementById('tag-pills');
  // Count tag occurrences across all projects (not just filtered)
  const tagCounts = {};
  allProjects.forEach(p => {
    p.tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
  });

  const tags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);

  // Keep label
  const label = container.querySelector('.tag-pills-label');
  container.innerHTML = '';
  if (label) container.appendChild(label);

  if (tags.length === 0) return;

  tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = `tag-pill${activeTagValue === tag ? ' active' : ''}`;
    btn.textContent = tag;
    btn.addEventListener('click', () => {
      const newTag = activeTagValue === tag ? '' : tag;
      activeTag = newTag || null;
      setParams({ tag: newTag });
      applyFilters();
    });
    container.appendChild(btn);
  });
}

function updateFilterCount(total, filtered) {
  const el = document.getElementById('filter-count');
  if (total === filtered) {
    el.textContent = `${total} project${total !== 1 ? 's' : ''}`;
  } else {
    el.textContent = `${filtered} / ${total}`;
  }
}

function applyFilters() {
  const params = getParams();
  if (activeTag !== null) params.tag = activeTag;

  // Sync UI controls
  document.getElementById('search-input').value = params.q;
  document.getElementById('status-filter').value = params.status;
  document.getElementById('sort-select').value = params.sort;

  const filtered = filterProjects(allProjects, params);
  renderGrid(filtered);
  renderTagPills(allProjects, params.tag);
  updateFilterCount(allProjects.length, filtered.length);
}

// --- Init ---
async function init() {
  try {
    const data = await loadManifest();
    allProjects = data.projects || [];

    // Wire up controls
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    const sortSelect = document.getElementById('sort-select');

    searchInput.addEventListener('input', () => {
      setParams({ q: searchInput.value });
      applyFilters();
    });

    statusFilter.addEventListener('change', () => {
      setParams({ status: statusFilter.value });
      applyFilters();
    });

    sortSelect.addEventListener('change', () => {
      setParams({ sort: sortSelect.value });
      applyFilters();
    });

    // Initialize activeTag from URL
    const params = getParams();
    activeTag = params.tag || null;

    applyFilters();

  } catch (err) {
    const grid = document.getElementById('project-grid');
    grid.innerHTML = `
      <div class="empty-state">
        <p style="color:var(--fg-dim)">Could not load projects.<br>
        <span style="font-family:var(--font-mono);font-size:0.75rem">${err.message}</span></p>
      </div>`;
  }
}

document.addEventListener('DOMContentLoaded', init);
