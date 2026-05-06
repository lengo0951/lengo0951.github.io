# Phan The Duy — Personal Site

Source for **https://lengo0951.github.io/** — the personal homepage of Phan The Duy (Ryan), cybersecurity researcher at VNU-HCM University of Information Technology.

> Plain HTML5 + CSS3 + vanilla JS. **No build step.** Push → live in ~1 minute.
> Publications auto-sync daily from [ORCID 0000-0002-5945-3712](https://orcid.org/0000-0002-5945-3712).

## Architecture

```
ORCID Public API ──daily cron──▶ scripts/hydrate-from-orcid.mjs
                                          │
                                          ▼
                              merge with data/paper-extras.json
                                          │
                                          ▼
                       index.html (between ORCID:PUBS markers)
                                          │
                                          ▼
                        github-actions[bot] commits to main
                                          │
                                          ▼
                              GitHub Pages auto-rebuild
```

## File Layout

```
.
├── index.html                  # Homepage — edit hero/about/news/honors/services/contact here
├── 404.html
├── assets/
│   ├── css/style.css           # All styles (CSS variables for theming)
│   ├── js/script.js            # Theme toggle, scroll-spy, year-filter
│   └── img/                    # Avatar, pub thumbnails, favicon, OG image
├── scripts/
│   └── hydrate-from-orcid.mjs  # Node 20 ORCID fetcher (no npm deps)
├── data/
│   ├── orcid-config.json       # { orcid, name_pattern[] }
│   └── paper-extras.json       # DOI → { arxiv, code, project, slides, video, ... }
├── .github/workflows/
│   └── hydrate-orcid.yml       # Daily cron (06:00 UTC) + manual trigger
├── docs/
│   ├── design-guidelines.md    # Design system reference
│   └── wireframe/              # Approved wireframe (frozen)
├── .nojekyll
├── sitemap.xml
├── robots.txt
└── CUSTOMIZE.md                # Section-by-section editing guide
```

## Maintenance

### When Phan publishes a new paper

Nothing to do — daily cron picks it up from ORCID within 24 hours. To trigger immediately:

GitHub repo → **Actions** → **Hydrate from ORCID** → **Run workflow**.

### Adding extras (arXiv, code, project, slides, video)

ORCID does not store these. Add per-DOI in [`data/paper-extras.json`](./data/paper-extras.json):

```json
{
  "10.1016/j.eswa.2026.132546": {
    "arxiv": "https://arxiv.org/abs/2401.12345",
    "code":  "https://github.com/youruser/repo",
    "flag":  "Best Paper"
  }
}
```

Push → next workflow run merges it in. See [CUSTOMIZE.md §17](./CUSTOMIZE.md) for the full schema.

### Editing other sections

`index.html` has comments above each editable section. Open in any editor → save → push.

### Local hydrate (without push)

```bash
node scripts/hydrate-from-orcid.mjs            # update index.html in place
node scripts/hydrate-from-orcid.mjs --dry-run  # print HTML to stdout, no write
```

Requires Node 20+. No `npm install`.

## Repo Setup (one-time, already done)

For reference if reconfiguring:

- **Settings → Pages** → Source: Deploy from a branch · Branch: `main` / `(root)`
- **Settings → Actions → General → Workflow permissions** → "Read and write permissions" (so the bot can commit publications back)

## Credits

- Hybrid design inspired by [yuanxzhang.github.io](https://yuanxzhang.github.io/) and [zwq2018.github.io](https://zwq2018.github.io/)
- Fonts: [Newsreader](https://fonts.google.com/specimen/Newsreader) + [Inter](https://fonts.google.com/specimen/Inter)
- Template: forked from [lengo0951/academic-homepage-template](https://github.com/lengo0951/academic-homepage-template)
- Maintained by [@lengo0951](https://github.com/lengo0951)

## License

MIT — see [LICENSE](./LICENSE).
