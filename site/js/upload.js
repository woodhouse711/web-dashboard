/**
 * upload.js — Client-side project packager
 * Collects metadata + files, generates a zip via JSZip, triggers download.
 */

let uploadedFiles = [];
let downloadBlob = null;

// --- Slug helpers ---
function titleToSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// --- File list rendering ---
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderFileList() {
  const list = document.getElementById('file-list');
  list.innerHTML = '';

  uploadedFiles.forEach((file, i) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <span class="file-item-name">${file.name}</span>
      <span class="file-item-size">${formatBytes(file.size)}</span>
      <button class="file-item-remove" title="Remove" data-index="${i}">×</button>
    `;
    list.appendChild(item);
  });

  list.querySelectorAll('.file-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      uploadedFiles.splice(parseInt(btn.dataset.index, 10), 1);
      renderFileList();
    });
  });
}

function addFiles(newFiles) {
  const existing = new Set(uploadedFiles.map(f => f.name));
  Array.from(newFiles).forEach(f => {
    if (!existing.has(f.name)) uploadedFiles.push(f);
  });
  renderFileList();
}

// --- Drop zone ---
function setupDropZone() {
  const zone = document.getElementById('drop-zone');
  const input = document.getElementById('file-input');

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') input.click(); });

  input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    addFiles(e.dataTransfer.files);
  });
}

// --- Auto-slug from title ---
function setupTitleSlug() {
  const titleInput = document.getElementById('f-title');
  const slugInput = document.getElementById('f-slug');
  let slugEdited = false;

  slugInput.addEventListener('input', () => { slugEdited = true; });

  titleInput.addEventListener('input', () => {
    if (!slugEdited || !slugInput.value) {
      slugInput.value = titleToSlug(titleInput.value);
    }
  });
}

// --- Default date ---
function setDefaultDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  document.getElementById('f-date').value = `${yyyy}-${mm}-${dd}`;
}

// --- Validate ---
function validate() {
  const errs = [];
  const title = document.getElementById('f-title').value.trim();
  const slug = document.getElementById('f-slug').value.trim();
  const desc = document.getElementById('f-description').value.trim();
  const date = document.getElementById('f-date').value;

  if (!title) errs.push('Title is required');
  if (!slug) errs.push('Slug is required');
  if (!/^[a-z0-9-]+$/.test(slug)) errs.push('Slug must be lowercase letters, numbers, and hyphens only');
  if (!desc) errs.push('Description is required');
  if (!date) errs.push('Date is required');
  if (uploadedFiles.length === 0) errs.push('Add at least one project file');

  const tags = document.getElementById('f-tags').value
    .split(',').map(t => t.trim()).filter(Boolean);
  if (tags.length > 5) errs.push('Maximum 5 tags');

  return errs;
}

// --- Generate zip ---
async function generatePackage() {
  const errs = validate();
  const errEl = document.getElementById('form-error');

  if (errs.length) {
    errEl.textContent = errs[0];
    return;
  }
  errEl.textContent = '';

  const slug    = document.getElementById('f-slug').value.trim();
  const title   = document.getElementById('f-title').value.trim();
  const desc    = document.getElementById('f-description').value.trim();
  const date    = document.getElementById('f-date').value;
  const status  = document.getElementById('f-status').value;
  const format  = document.getElementById('f-format').value;
  const render  = document.getElementById('f-render').value;
  const aspect  = document.getElementById('f-aspect').value;
  const version = document.getElementById('f-version').value.trim() || '1.0.0';
  const tags    = document.getElementById('f-tags').value
    .split(',').map(t => t.trim()).filter(Boolean).slice(0, 5);

  const meta = {
    title, description: desc, date, tags, status, render, format, aspect, version,
    author: '', links: [],
  };

  const zip = new JSZip();
  const folder = zip.folder(slug);

  // Add meta.json
  folder.file('meta.json', JSON.stringify(meta, null, 2));

  // Add all uploaded files
  const readFile = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

  for (const file of uploadedFiles) {
    const buf = await readFile(file);
    folder.file(file.name, buf);
  }

  const btn = document.getElementById('generate-btn');
  btn.textContent = 'Generating...';
  btn.disabled = true;

  downloadBlob = await zip.generateAsync({ type: 'blob' });

  btn.textContent = 'Generate Package';
  btn.disabled = false;

  // Show output area
  const output = document.getElementById('output-area');
  output.classList.add('visible');
  document.getElementById('out-slug-name').textContent = `${slug}/`;
  document.getElementById('out-slug-cmd').textContent = `${slug}/`;
  document.getElementById('out-slug-commit').textContent = title;

  output.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --- Download ---
function setupDownload() {
  document.getElementById('download-btn').addEventListener('click', () => {
    if (!downloadBlob) return;
    const slug = document.getElementById('f-slug').value.trim() || 'project';
    const url = URL.createObjectURL(downloadBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// --- Reset ---
function setupReset() {
  document.getElementById('reset-btn').addEventListener('click', () => {
    document.getElementById('f-title').value = '';
    document.getElementById('f-slug').value = '';
    document.getElementById('f-description').value = '';
    document.getElementById('f-tags').value = '';
    document.getElementById('f-status').value = 'draft';
    document.getElementById('f-format').value = 'html';
    document.getElementById('f-render').value = 'iframe';
    document.getElementById('f-aspect').value = '16:9';
    document.getElementById('f-version').value = '1.0.0';
    uploadedFiles = [];
    downloadBlob = null;
    renderFileList();
    document.getElementById('output-area').classList.remove('visible');
    document.getElementById('form-error').textContent = '';
    setDefaultDate();
  });
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  setupDropZone();
  setupTitleSlug();
  setDefaultDate();
  setupDownload();
  setupReset();

  document.getElementById('generate-btn').addEventListener('click', generatePackage);
});
