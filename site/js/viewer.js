/**
 * viewer.js — Project detail page logic
 * Reads ?slug= param, loads manifest, renders project via Renderer.
 */

const MANIFEST_PATH = '../site-data.json';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m, 10) - 1]} ${d}, ${y}`;
}

// Simple markdown → HTML (minimal, for README panel)
function simpleMarkdown(text) {
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const inline = s => s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  const lines = text.split('\n');
  const result = [];
  let inCode = false, codeBuffer = [], inList = false;

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) { result.push(`<pre><code>${esc(codeBuffer.join('\n'))}</code></pre>`); codeBuffer = []; inCode = false; }
      else { if (inList) { result.push('</ul>'); inList = false; } inCode = true; }
      continue;
    }
    if (inCode) { codeBuffer.push(line); continue; }
    if (!line.trim()) { if (inList) { result.push('</ul>'); inList = false; } continue; }
    const hm = line.match(/^(#{1,4})\s+(.+)/);
    if (hm) { if (inList) { result.push('</ul>'); inList = false; } result.push(`<h${hm[1].length}>${inline(esc(hm[2]))}</h${hm[1].length}>`); continue; }
    const lm = line.match(/^[-*]\s+(.+)/);
    if (lm) { if (!inList) { result.push('<ul>'); inList = true; } result.push(`<li>${inline(esc(lm[1]))}</li>`); continue; }
    if (inList) { result.push('</ul>'); inList = false; }
    result.push(`<p>${inline(esc(line))}</p>`);
  }
  if (inList) result.push('</ul>');
  if (inCode) result.push(`<pre><code>${esc(codeBuffer.join('\n'))}</code></pre>`);
  return result.join('\n');
}

async function loadReadme(slug) {
  try {
    const res = await fetch(`../projects/${slug}/README.md`);
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

function renderInfoPanel(project) {
  const panel = document.getElementById('project-info-panel');

  const tagsHtml = project.tags.length
    ? `<div class="info-tags">${project.tags.map(t => `<span class="info-tag">${t}</span>`).join('')}</div>`
    : '<span class="info-block-value">—</span>';

  const linksHtml = project.links && project.links.length
    ? `<div class="info-links">${project.links.map(l =>
        `<a class="info-link" href="${l.url}" target="_blank" rel="noopener">${l.label || l.url}</a>`
      ).join('')}</div>`
    : null;

  panel.innerHTML = `
    <div class="info-block">
      <div class="info-block-label">Date</div>
      <div class="info-block-value">${formatDate(project.date)}</div>
    </div>
    <div class="info-block">
      <div class="info-block-label">Format</div>
      <div class="info-block-value text-mono">${project.format}</div>
    </div>
    <div class="info-block">
      <div class="info-block-label">Status</div>
      <div class="info-block-value text-mono">${project.status}</div>
    </div>
    <div class="info-block">
      <div class="info-block-label">Version</div>
      <div class="info-block-value text-mono">${project.version || '1.0.0'}</div>
    </div>
    <div class="info-block">
      <div class="info-block-label">Tags</div>
      ${tagsHtml}
    </div>
    ${linksHtml ? `<div class="info-block"><div class="info-block-label">Links</div>${linksHtml}</div>` : ''}
  `;
}

function setupFullscreen(container) {
  const btn = document.getElementById('fullscreen-btn');
  if (!container.querySelector('iframe')) return;

  btn.style.display = '';

  let isFullscreen = false;

  btn.addEventListener('click', () => {
    if (!isFullscreen) {
      container.classList.add('fullscreen');
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
          <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
        </svg>
        Exit`;
      isFullscreen = true;
    } else {
      container.classList.remove('fullscreen');
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
          <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
        </svg>
        Fullscreen`;
      isFullscreen = false;
    }
  });

  // Escape key exits
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isFullscreen) btn.click();
  });
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  if (!slug) {
    document.getElementById('viewer-title').textContent = 'No project specified';
    document.getElementById('render-container').innerHTML =
      `<div class="render-loading" style="color:var(--fg-dim)">Missing ?slug= parameter</div>`;
    return;
  }

  try {
    const res = await fetch(MANIFEST_PATH);
    if (!res.ok) throw new Error('Could not load manifest');
    const data = await res.json();

    const project = (data.projects || []).find(p => p.slug === slug);
    if (!project) throw new Error(`Project "${slug}" not found`);

    // Update page title & header
    document.title = `${project.title} — Vibe-rary`;
    document.getElementById('viewer-title').textContent = project.title;
    document.getElementById('viewer-meta').textContent =
      `${formatDate(project.date)} · ${project.format}`;

    // Open link
    const openLink = document.getElementById('open-link');
    openLink.href = `../projects/${slug}/index.html`;

    // Render the project
    const container = document.getElementById('render-container');
    Renderer.render(project, container);

    // Set container height for iframe renders
    if (project.render === 'iframe') {
      const aspect = { '16:9': 9/16, '4:3': 3/4, '1:1': 1 }[project.aspect] || 9/16;
      const updateHeight = () => {
        container.style.height = `${container.offsetWidth * aspect}px`;
      };
      updateHeight();
      window.addEventListener('resize', updateHeight);
      setupFullscreen(container);
    }

    // Load README
    const readmeText = await loadReadme(slug);
    const detailsEl = document.getElementById('project-details');
    detailsEl.style.display = '';

    if (readmeText) {
      document.getElementById('readme-content').innerHTML = simpleMarkdown(readmeText);
    } else {
      document.getElementById('readme-panel').innerHTML =
        `<h2>Description</h2><div class="readme-content"><p>${project.description}</p></div>`;
    }

    renderInfoPanel(project);

  } catch (err) {
    document.getElementById('viewer-title').textContent = 'Error';
    document.getElementById('render-container').innerHTML =
      `<div class="render-loading" style="color:var(--fg-dim)">${err.message}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', init);
