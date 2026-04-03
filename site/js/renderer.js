/**
 * renderer.js — Format-aware project rendering engine
 * Each renderer receives (projectMeta, container) and renders the project.
 */

const Renderer = (() => {

  // --- Helpers ---

  function setAspectRatio(container, aspect) {
    const map = { '16:9': '16/9', '4:3': '4/3', '1:1': '1/1' };
    container.style.aspectRatio = map[aspect] || '16/9';
  }

  function showLoading(container) {
    container.classList.add('render-container');
    container.innerHTML = `<div class="render-loading"><div class="spinner"></div></div>`;
  }

  function hideLoading(container) {
    const el = container.querySelector('.render-loading');
    if (el) el.remove();
  }

  // --- HTML Renderer (iframe) ---

  function renderHtml(project, container) {
    setAspectRatio(container, project.aspect);
    showLoading(container);

    const iframe = document.createElement('iframe');
    iframe.src = `../projects/${project.slug}/index.html`;
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('loading', 'lazy');
    iframe.title = project.title;

    iframe.addEventListener('load', () => hideLoading(container));
    container.appendChild(iframe);
  }

  // --- Static Renderer (inline injection, no interactivity) ---

  async function renderStatic(project, container) {
    showLoading(container);
    try {
      const res = await fetch(`../projects/${project.slug}/index.html`);
      const html = await res.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Extract body content
      const bodyContent = doc.body.innerHTML;

      const wrapper = document.createElement('div');
      wrapper.className = 'inline-render';
      wrapper.style.cssText = 'all: initial; display: block;';

      const shadow = wrapper.attachShadow({ mode: 'open' });

      // Include any <style> tags from the document
      const styles = Array.from(doc.querySelectorAll('style'))
        .map(s => s.outerHTML).join('\n');
      shadow.innerHTML = `${styles}<div>${bodyContent}</div>`;

      hideLoading(container);
      container.appendChild(wrapper);
    } catch (err) {
      container.innerHTML = `<div class="render-loading" style="color:var(--fg-dim)">Failed to load: ${err.message}</div>`;
    }
  }

  // --- Markdown Renderer ---

  async function renderMarkdown(project, container) {
    showLoading(container);
    try {
      const res = await fetch(`../projects/${project.slug}/content.md`);
      const text = await res.text();

      // Simple markdown → HTML (no external dep)
      const html = simpleMarkdown(text);

      const wrapper = document.createElement('div');
      wrapper.className = 'inline-render readme-content';
      wrapper.style.maxWidth = '720px';
      wrapper.style.margin = '0 auto';
      wrapper.innerHTML = html;

      hideLoading(container);
      container.appendChild(wrapper);
    } catch (err) {
      container.innerHTML = `<div class="render-loading" style="color:var(--fg-dim)">Failed to load markdown: ${err.message}</div>`;
    }
  }

  // --- React Renderer (Babel standalone transpile) ---

  async function renderReact(project, container) {
    setAspectRatio(container, project.aspect);
    showLoading(container);

    // Load via iframe — React projects are self-contained HTML files
    // (react projects should have an index.html that includes React + Babel)
    const iframe = document.createElement('iframe');
    iframe.src = `../projects/${project.slug}/index.html`;
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-pointer-lock');
    iframe.setAttribute('loading', 'lazy');
    iframe.title = project.title;

    iframe.addEventListener('load', () => hideLoading(container));
    container.appendChild(iframe);
  }

  // --- JSON Renderer (data visualization template) ---

  async function renderJson(project, container) {
    showLoading(container);
    try {
      const res = await fetch(`../projects/${project.slug}/data.json`);
      const data = await res.json();

      const wrapper = document.createElement('div');
      wrapper.className = 'inline-render';
      wrapper.style.padding = 'var(--sp-6)';

      const pre = document.createElement('pre');
      pre.style.cssText = `
        background: var(--bg-raised);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: var(--sp-4);
        overflow-x: auto;
        font-family: var(--font-mono);
        font-size: 0.8125rem;
        color: var(--fg);
        line-height: 1.6;
      `;
      pre.textContent = JSON.stringify(data, null, 2);

      wrapper.appendChild(pre);
      hideLoading(container);
      container.appendChild(wrapper);
    } catch (err) {
      container.innerHTML = `<div class="render-loading" style="color:var(--fg-dim)">Failed to load data: ${err.message}</div>`;
    }
  }

  // --- Simple Markdown Parser ---
  // Handles: headings, bold, italic, inline code, code blocks, paragraphs, links, lists

  function simpleMarkdown(text) {
    // Escape HTML
    const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const lines = text.split('\n');
    const result = [];
    let inCode = false;
    let codeBuffer = [];
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Fenced code block
      if (line.startsWith('```')) {
        if (inCode) {
          result.push(`<pre><code>${esc(codeBuffer.join('\n'))}</code></pre>`);
          codeBuffer = [];
          inCode = false;
        } else {
          if (inList) { result.push('</ul>'); inList = false; }
          inCode = true;
        }
        continue;
      }

      if (inCode) { codeBuffer.push(line); continue; }

      // Blank line
      if (!line.trim()) {
        if (inList) { result.push('</ul>'); inList = false; }
        continue;
      }

      // Headings
      const hm = line.match(/^(#{1,4})\s+(.+)/);
      if (hm) {
        if (inList) { result.push('</ul>'); inList = false; }
        const level = hm[1].length;
        result.push(`<h${level}>${inline(esc(hm[2]))}</h${level}>`);
        continue;
      }

      // Unordered list
      const lm = line.match(/^[-*]\s+(.+)/);
      if (lm) {
        if (!inList) { result.push('<ul>'); inList = true; }
        result.push(`<li>${inline(esc(lm[1]))}</li>`);
        continue;
      }

      if (inList) { result.push('</ul>'); inList = false; }

      // Paragraph
      result.push(`<p>${inline(esc(line))}</p>`);
    }

    if (inList) result.push('</ul>');
    if (inCode) result.push(`<pre><code>${esc(codeBuffer.join('\n'))}</code></pre>`);

    return result.join('\n');
  }

  function inline(s) {
    // Bold
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Inline code
    s = s.replace(/`(.+?)`/g, '<code>$1</code>');
    // Links
    s = s.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return s;
  }

  // --- Router ---

  const renderers = {
    html:     renderHtml,
    static:   renderStatic,
    markdown: renderMarkdown,
    react:    renderReact,
    json:     renderJson,
  };

  function render(project, container) {
    const fn = renderers[project.format] || renderers.html;
    fn(project, container);
  }

  return { render };
})();
