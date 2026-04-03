# Project Format Specification

Every project in `/projects/` must follow this contract.

---

## Directory Structure

```
projects/
└── {slug}/
    ├── meta.json         ← Required. Project metadata.
    ├── index.html        ← Required for html/react/static formats.
    ├── index.jsx         ← Required for react format (alternative entry).
    ├── content.md        ← Required for markdown format.
    ├── data.json         ← Required for json format.
    ├── thumb.png         ← Recommended. 1200×630px (16:9). Also accepts thumb.svg.
    ├── README.md         ← Optional. Shown in the viewer sidebar.
    └── assets/           ← Optional. Supporting files (images, scripts, etc.)
```

**Slug rules:** lowercase letters, numbers, and hyphens only. No spaces. No uppercase.

---

## meta.json Schema

```json
{
  "title":       "string — required",
  "description": "string — required",
  "date":        "YYYY-MM-DD — required",
  "tags":        ["array of strings — required, max 5"],
  "status":      "published | draft | archived — required",
  "render":      "iframe | inline — required",
  "format":      "html | react | json | markdown | static — default: html",
  "aspect":      "16:9 | 4:3 | 1:1 — default: 16:9",
  "author":      "string — optional",
  "links":       [{"label": "string", "url": "string"}],
  "version":     "semver string — default: 1.0.0"
}
```

### Required Fields

| Field | Type | Description |
|---|---|---|
| `title` | string | Display name of the project |
| `description` | string | Short summary (1-2 sentences) |
| `date` | string | Creation or publish date in `YYYY-MM-DD` format |
| `tags` | string[] | Categorization labels. Max 5. |
| `status` | enum | `published` (visible), `draft` (visible, labeled), `archived` (visible, labeled) |
| `render` | enum | `iframe` (sandboxed) or `inline` (DOM injection) |

### Optional Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `format` | enum | `html` | Determines entry point file and rendering strategy |
| `aspect` | enum | `16:9` | Display aspect ratio for iframe containers |
| `author` | string | `""` | Creator name |
| `links` | array | `[]` | External links shown in the viewer |
| `version` | string | `1.0.0` | Semantic version |

---

## Formats

| Value | Entry Point | Rendering Strategy |
|---|---|---|
| `html` | `index.html` | Sandboxed iframe |
| `react` | `index.html` | Sandboxed iframe (project includes React + Babel) |
| `json` | `data.json` | JSON viewer (formatted display) |
| `markdown` | `content.md` | Parsed and rendered as styled document |
| `static` | `index.html` | Inline DOM injection with Shadow DOM isolation |

---

## Minimal Example

```json
{
  "title": "Color Field Study",
  "description": "An interactive gradient field that responds to cursor movement.",
  "date": "2026-04-03",
  "tags": ["color", "interactive", "canvas"],
  "status": "published",
  "render": "iframe",
  "format": "html",
  "aspect": "16:9",
  "version": "1.0.0"
}
```

---

## Build Validation

Run `node build/generate-manifest.js` to validate all projects.

**FAIL conditions** (build exits with error):
- Missing `meta.json`
- Any required field is missing or empty
- `status` is not `published`, `draft`, or `archived`
- `date` is not in `YYYY-MM-DD` format
- Entry point file is missing for the declared format

**WARN conditions** (build continues):
- No thumbnail found (`thumb.png` or `thumb.svg`)
- No `README.md`
- More than 5 tags

---

## Asset Guidelines

- All file paths must be **relative** (e.g. `./assets/image.png`, not `/projects/my-project/assets/image.png`)
- External dependencies should use CDN URLs (jsDelivr, unpkg, etc.) or be bundled
- Thumbnails should be 1200×630px for best display (16:9 ratio)
- Keep project folders self-contained — do not reference files outside the project folder
