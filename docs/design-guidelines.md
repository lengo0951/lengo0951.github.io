# Design Guidelines — Phan The Duy Homepage

Static personal homepage for an academic researcher. Visual language aligned with the lequocngo portfolio (white shell, Source Serif / Source Sans, sticky sidebar). Plain HTML5 + CSS3 + vanilla JS, deployed to GitHub Pages. Publications hydrate from ORCID (`scripts/hydrate-from-orcid.mjs`).

## 1. Typography

### Fonts (Google Fonts)

- **Headings / name — Source Serif 4** (serif, optical sizing)
- **Body / nav / meta — Source Sans 3** (sans)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600;8..60,700&display=swap" rel="stylesheet">
```

### Type scale

| Token | Size | Line-height | Weight | Usage |
|---|---|---|---|---|
| `--fs-display` | 2.25rem (36px) | 1.15 | 700 | Legacy hero name (unused in sidebar layout) |
| `--fs-h1` | 1.5rem (24px) | 1.25 | 700 | Section headings |
| `--fs-h2` | 1.25rem (20px) | 1.3 | 600 | Pub titles / subsections |
| `--fs-body` | 1.0625rem (17px) | 1.65 | 400 | Body text |
| `--fs-meta` | 0.9375rem (15px) | 1.5 | 400 | Authors, venue, dates |
| `--fs-small` | 0.8125rem (13px) | 1.45 | 500 | Nav, footer, labels |
| `--fs-badge` | 0.6875rem (11px) | 1 | 600 | Badge pills |

Sidebar name: Source Serif 700 ≈ 1.75rem. Section headings: Source Serif 700 with hairline `border-bottom`.

## 2. Color Tokens

### Light theme (`:root`)

```css
--bg:            #ffffff;
--bg-elevated:   #ffffff;
--bg-subtle:     #f8fafc;
--text:          #0f172a;
--text-muted:    #475569;
--text-subtle:   #64748b;
--accent:        #0369a1;
--accent-hover:  #0c4a6e;
--border:        #e2e8f0;
--border-strong: #cbd5e1;
--shadow:        0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.04);
```

### Dark theme (`[data-theme="dark"]`)

```css
--bg:            #020617;
--bg-elevated:   #0f172a;
--bg-subtle:     #1e293b;
--text:          #f1f5f9;
--text-muted:    #94a3b8;
--text-subtle:   #64748b;
--accent:        #38bdf8;
--accent-hover:  #7dd3fc;
--border:        #1e293b;
--border-strong: #334155;
```

WCAG: body text on `--bg` should remain AA+. Accent links ≥ 4.5:1 on background.

### Badge colors (brand-tinted)

| Badge | BG | Text |
|---|---|---|
| arXiv | `#b31b1b` | `#ffffff` |
| PDF | `#5a6068` | `#ffffff` |
| Code / GitHub | `#24292f` | `#ffffff` |
| HuggingFace | `#FFD21E` | `#1a1d23` |
| Project | `#0369a1` | `#ffffff` |
| Bibtex | `#7a6a3f` | `#ffffff` |
| Slides | `#0d8f6c` | `#ffffff` |
| Video | `#a13a8e` | `#ffffff` |

## 3. Spacing Scale

Tokens: `--s-4` … `--s-96` (4/8/12/16/24/32/48/64/96 px). Use only these increments.

Container: `--container: 72rem` (~max-w-6xl). Horizontal padding 24px (mobile 16px).

## 4. Layout & Breakpoints

| Bp | Range | Notes |
|---|---|---|
| Mobile | ≤900px | Single column; sidebar stacks above content, not sticky |
| Desktop | ≥901px | Two-column shell: sticky sidebar (~240–320px) + main column |

```
main > .shell
├── aside.sidebar   (sticky: photo, name, affiliation, contact links)
└── div.main-col    (About → News → Publications → …)
```

## 5. Component Specs

### Navigation
- Desktop (≥901px): a standalone fixed navigation column is flush to the viewport's left edge, separate from the centered profile/sidebar column.
- Mobile (≤900px): a 56px sticky top bar keeps the monogram, horizontally scrollable anchors, and theme toggle reachable.
- Active / hover: subtle `--bg-subtle` pill, not uppercase tracking.

### Sidebar
- Circular photo ~208px, 1px border, light shadow
- Name: Source Serif 700
- Affiliation lines + UIT / InSecLab links
- Contact list separated by top border; accent-colored links

### Section Heading
- Source Serif 700, ~1.5rem
- `border-bottom: 1px solid var(--border)`, padding-bottom 8px, margin-bottom 24px

### News Item
- Flex row: date (`[Mon YYYY]`) + body. Links in accent.

### Teaching
- Placed before Publications as a concise, text-first course list.
- Each course uses a fixed-width bold code followed by an em dash and Vietnamese course name.
- Do not add unverified credits, semesters, schedules, descriptions, or links.

### Publication Card
- Title: Source Serif 600, linked
- Authors: meta; self-name **bold**
- Venue: italic meta + year
- Badge row (DOI / PDF / Code …)
- Year filter pills: All / 2026 / 2025 / …

### ORCID hydrate
- Source of truth: ORCID works for `0000-0002-5945-3712`
- Do **not** filter-out works by author-name matching (ORCID can omit/anon authors; e.g. SSRN `10.2139/ssrn.6381010`)
- Markers in `index.html` delimit the replaceable publications block

### Footer
- Last updated, optional visitor counter, © line — `--fs-small`, `--text-subtle`

## 6. Interactions

- Smooth-scroll anchors + sticky-nav offset
- Theme toggle → `localStorage('theme')`; default `prefers-color-scheme`
- Year filter toggles `[hidden]` on pub entries
- Transitions ≤ 200ms; respect `prefers-reduced-motion`

## 7. Accessibility

- Semantic landmarks; section `id` + `aria-labelledby`
- Skip link; theme toggle `aria-pressed`
- Focus ring: 2px accent outline
- Min touch targets ~44×44 on mobile nav

## 8. Performance

- Single CSS + JS; Google Fonts with `display=swap` + `preconnect`
- Page weight target: < 150KB excluding optional images

## 9. File Structure

```
index.html
assets/css/style.css
assets/js/script.js
assets/img/
scripts/hydrate-from-orcid.mjs
data/orcid-config.json
docs/design-guidelines.md
```
