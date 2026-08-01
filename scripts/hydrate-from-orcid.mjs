#!/usr/bin/env node
/**
 * Hydrate publications section in index.html from ORCID public API.
 *
 * Usage:
 *   node scripts/hydrate-from-orcid.mjs              # update index.html in place
 *   node scripts/hydrate-from-orcid.mjs --dry-run    # print to stdout, do not modify
 *   node scripts/hydrate-from-orcid.mjs --config path --html path
 *
 * Reads:
 *   - data/orcid-config.json    { orcid, name_pattern: [...] }
 *   - data/paper-extras.json    { "<DOI>": { arxiv, code, project, ... } }
 *
 * Writes the rendered HTML between the markers
 *   <!-- ORCID:PUBS:START -->
 *   <!-- ORCID:PUBS:END -->
 * inside the target HTML file (default: index.html).
 *
 * No npm dependencies. Requires Node 20+ (built-in fetch).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ORCID_API = 'https://pub.orcid.org/v3.0';
const CROSSREF_API = 'https://api.crossref.org/works';
const CROSSREF_CACHE_PATH = 'data/crossref-cache.json';
const CROSSREF_THROTTLE_MS = 220;   // stay under 5 req/sec public pool
const UA = 'scientist-homepage-hydrator/1.0 (+https://github.com/lengo0951; mailto:lengo.vq@gmail.com)';
const MARKER_START = '<!-- ORCID:PUBS:START -->';
const MARKER_END = '<!-- ORCID:PUBS:END -->';
const FALLBACK_THUMBS = [
  'assets/img/pub-thumb-01.svg',
  'assets/img/pub-thumb-02.svg',
  'assets/img/pub-thumb-03.svg',
  'assets/img/pub-thumb-04.svg',
];

/* ---------- Args ---------- */

function parseArgs(argv) {
  const args = { dryRun: false, config: 'data/orcid-config.json', html: 'index.html', extras: 'data/paper-extras.json' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--config') args.config = argv[++i];
    else if (a === '--html') args.html = argv[++i];
    else if (a === '--extras') args.extras = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/hydrate-from-orcid.mjs [--dry-run] [--config <path>] [--html <path>] [--extras <path>]');
      process.exit(0);
    } else {
      console.error(`[hydrator] unknown arg: ${a}`);
      process.exit(2);
    }
  }
  return args;
}

/* ---------- I/O ---------- */

function readJSON(path) {
  return JSON.parse(readFileSync(resolve(path), 'utf8'));
}

function log(...m) { console.log('[hydrator]', ...m); }
function warn(...m) { console.warn('[hydrator] WARN:', ...m); }
function fail(msg) { console.error(`[hydrator] FAIL: ${msg}`); process.exit(1); }

/* ---------- ORCID client ---------- */

async function orcidGET(path) {
  const res = await fetch(`${ORCID_API}${path}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`ORCID ${res.status} on ${path}`);
  return res.json();
}

/* ---------- Crossref enrichment (book-chapter / conference-paper venues) ---------- */

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchCrossrefVenue(doi) {
  try {
    const res = await fetch(`${CROSSREF_API}/${encodeURIComponent(doi)}`, {
      headers: { Accept: 'application/json', 'User-Agent': UA },
    });
    if (!res.ok) return { venue: null, publisher: null, status: res.status };
    const data = await res.json();
    const m = data.message || {};
    const event = (m.event || {}).name;
    const containers = m['container-title'] || [];
    // Conferences: prefer event.name when present (cleaner than "Proceedings of …").
    // Books: container-title last item is most specific (e.g. ["LNCS","Network and System Security"] → book name).
    const venue = event || containers[containers.length - 1] || containers[0] || null;
    return { venue, publisher: m.publisher || null, crossrefType: m.type || null };
  } catch (e) {
    return { venue: null, publisher: null, error: String(e.message || e) };
  }
}

async function enrichVenuesViaCrossref(pubs) {
  let cache = {};
  try { cache = readJSON(CROSSREF_CACHE_PATH); } catch { /* first run, no cache yet */ }

  let hits = 0, fetched = 0, missing = 0, applied = 0;
  for (const p of pubs) {
    if (!p.doi) continue;
    let entry = cache[p.doi];
    if (!entry) {
      entry = await fetchCrossrefVenue(p.doi);
      entry.fetchedAt = new Date().toISOString();
      cache[p.doi] = entry;
      fetched++;
      await sleep(CROSSREF_THROTTLE_MS);
    } else {
      hits++;
    }
    if (entry.venue) {
      // Prefer ORCID journal-title if it's specific, else use Crossref.
      // Crossref overrides only when ORCID is empty OR is a generic series name (e.g. just "Lecture Notes in Computer Science").
      const orcidGeneric = !p.venue || /^lecture notes in computer science$/i.test(p.venue);
      if (orcidGeneric) {
        p.venue = entry.venue;
        applied++;
      }
    } else {
      missing++;
    }
  }

  try {
    writeFileSync(resolve(CROSSREF_CACHE_PATH), JSON.stringify(cache, null, 2) + '\n', 'utf8');
  } catch (e) {
    warn(`could not write ${CROSSREF_CACHE_PATH}: ${e.message}`);
  }
  log(`crossref: cache-hit=${hits} fetched=${fetched} venue-missing=${missing} applied-to-pubs=${applied}`);
}

async function fetchAllWorks(orcid) {
  const list = await orcidGET(`/${orcid}/works`);
  const groups = list.group || [];
  const summaries = groups.map(g => (g['work-summary'] || [])[0]).filter(Boolean);
  const putCodes = summaries.map(s => s['put-code']).filter(Boolean);

  // Bulk-fetch detail in chunks of 50
  const detail = new Map();
  for (let i = 0; i < putCodes.length; i += 50) {
    const chunk = putCodes.slice(i, i + 50);
    const data = await orcidGET(`/${orcid}/works/${chunk.join(',')}`);
    const items = data.bulk || [];
    for (const it of items) {
      const w = it.work;
      if (w && w['put-code']) detail.set(w['put-code'], w);
    }
  }
  return summaries.map(s => detail.get(s['put-code']) || s);
}

/* ---------- Extract / shape ---------- */

function getDOI(work) {
  const eids = (work['external-ids'] && work['external-ids']['external-id']) || [];
  const doi = eids.find(e => (e['external-id-type'] || '').toLowerCase() === 'doi');
  return doi ? (doi['external-id-value'] || '').trim() : null;
}

function getArxivFromORCID(work) {
  const eids = (work['external-ids'] && work['external-ids']['external-id']) || [];
  const arx = eids.find(e => (e['external-id-type'] || '').toLowerCase() === 'arxiv');
  return arx ? (arx['external-id-value'] || '').trim() : null;
}

function getYear(work) {
  const y = ((work['publication-date'] || {}).year || {}).value;
  return y ? String(y) : 'n.d.';
}

function getTitle(work) {
  return ((work.title || {}).title || {}).value || '(untitled)';
}

function getVenue(work) {
  return ((work['journal-title'] || {}).value || '').trim();
}

function getAuthors(work) {
  const arr = ((work.contributors || {}).contributor) || [];
  return arr
    .map(c => ((c['credit-name'] || {}).value || '').trim())
    .filter(Boolean);
}

function shape(work) {
  return {
    putCode: work['put-code'],
    type: work.type || 'work',
    title: getTitle(work),
    venue: getVenue(work),
    year: getYear(work),
    doi: getDOI(work),
    arxiv: getArxivFromORCID(work),
    authors: getAuthors(work),
  };
}

/* ---------- Render ---------- */

function escHTML(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function escAttr(s) {
  return escHTML(s);
}

function boldName(authorList, namePatterns) {
  const pats = (namePatterns || []).map(p => p.toLowerCase());
  return authorList.map(a => {
    const lower = a.toLowerCase();
    const hit = pats.some(p => lower.includes(p));
    return hit ? `<strong>${escHTML(a)}</strong>` : escHTML(a);
  }).join(', ');
}

function renderBadges(pub, idx) {
  const out = [];
  if (pub.doi) {
    out.push(`<li><a class="badge badge-pdf" href="https://doi.org/${escAttr(pub.doi)}" target="_blank" rel="noopener">DOI</a></li>`);
  }
  // arXiv: prefer extras override, fallback to ORCID external-id
  const arxivVal = (pub.extras && pub.extras.arxiv) || pub.arxiv;
  if (arxivVal) {
    const url = arxivVal.startsWith('http') ? arxivVal : `https://arxiv.org/abs/${arxivVal}`;
    out.push(`<li><a class="badge badge-arxiv" href="${escAttr(url)}" target="_blank" rel="noopener">arXiv</a></li>`);
  }
  if (pub.extras) {
    const map = [
      ['code', 'badge-code', 'Code'],
      ['project', 'badge-project', 'Project'],
      ['hf', 'badge-hf', 'HuggingFace'],
      ['slides', 'badge-slides', 'Slides'],
      ['video', 'badge-video', 'Video'],
      ['bibtex', 'badge-bibtex', 'BibTeX'],
    ];
    for (const [k, cls, label] of map) {
      if (pub.extras[k]) {
        out.push(`<li><a class="${cls === 'badge-bibtex' ? 'badge badge-bibtex' : 'badge ' + cls}" href="${escAttr(pub.extras[k])}" target="_blank" rel="noopener">${escHTML(label)}</a></li>`);
      }
    }
  }
  return out.length ? `\n          <ul class="badge-row" aria-label="Paper links">\n            ${out.join('\n            ')}\n          </ul>` : '';
}

function renderArticle(pub, idx, namePatterns) {
  // Only render a thumbnail if the user has explicitly opted in via extras (no auto-placeholders).
  const thumb = pub.extras && pub.extras.thumb;
  const thumbHTML = thumb
    ? `\n        <img class="pub-thumb" src="${escAttr(thumb)}" alt="Thumbnail for: ${escAttr(pub.title)}" loading="lazy" />`
    : '';
  const flag = pub.extras && pub.extras.flag
    ? `\n          <span class="pub-badge-flag">${escHTML(pub.extras.flag)}</span>`
    : '';
  const venue = pub.venue
    ? `\n          <p class="pub-venue"><em>${escHTML(pub.venue)}</em>, ${escHTML(pub.year)}</p>`
    : `\n          <p class="pub-venue"><em>${escHTML(pub.type)}</em>, ${escHTML(pub.year)}</p>`;
  const authors = pub.authors.length
    ? `\n          <p class="pub-authors">${boldName(pub.authors, namePatterns)}</p>`
    : '';
  const badges = renderBadges(pub, idx);

  // Title links to DOI when available (most academic sites do this — title IS the click target).
  const titleHTML = pub.doi
    ? `<a href="https://doi.org/${escAttr(pub.doi)}" target="_blank" rel="noopener">${escHTML(pub.title)}</a>`
    : escHTML(pub.title);

  return `      <article class="pub" data-year="${escAttr(pub.year)}">${thumbHTML}
        <div class="pub-body">${flag}
          <h4 class="pub-title">${titleHTML}</h4>${authors}${venue}${badges}
        </div>
      </article>`;
}

function renderBlock(pubs, namePatterns) {
  const years = Array.from(new Set(pubs.map(p => p.year))).sort((a, b) => b.localeCompare(a));
  const filterBtns = ['<button class="pub-filter-btn is-active" type="button" data-year="all" aria-pressed="true">All</button>']
    .concat(years.map(y => `<button class="pub-filter-btn" type="button" data-year="${escAttr(y)}" aria-pressed="false">${escHTML(y)}</button>`));

  const sections = [];
  let idx = 0;
  for (const y of years) {
    sections.push(`      <h3 class="pub-year" data-year="${escAttr(y)}">${escHTML(y)}</h3>`);
    for (const p of pubs.filter(p => p.year === y)) {
      sections.push(renderArticle(p, idx++, namePatterns));
    }
  }

  return `\n      <div class="pub-filter" role="group" aria-label="Filter publications by year">
        ${filterBtns.join('\n        ')}
      </div>\n\n${sections.join('\n\n')}\n      `;
}

/* ---------- Marker replace ---------- */

function replaceBetweenMarkers(html, inner) {
  const i = html.indexOf(MARKER_START);
  const j = html.indexOf(MARKER_END);
  if (i === -1 || j === -1 || j < i) {
    fail(`markers not found in HTML (need both ${MARKER_START} and ${MARKER_END} with START before END)`);
  }
  const before = html.slice(0, i + MARKER_START.length);
  const after = html.slice(j);
  return `${before}\n${inner}\n      ${after}`;
}

/* ---------- Main ---------- */

async function main() {
  const args = parseArgs(process.argv);

  let cfg;
  try { cfg = readJSON(args.config); }
  catch (e) { fail(`cannot read config ${args.config}: ${e.message}`); }
  if (!cfg.orcid) fail(`config missing "orcid" field`);
  const namePatterns = Array.isArray(cfg.name_pattern) ? cfg.name_pattern : [];

  let extras = {};
  try { extras = readJSON(args.extras); }
  catch { warn(`extras ${args.extras} not found — proceeding without`); }

  log(`orcid=${cfg.orcid} fetching works…`);
  let works;
  try { works = await fetchAllWorks(cfg.orcid); }
  catch (e) { fail(`ORCID fetch failed: ${e.message}`); }

  // ORCID works list is the source of truth — include every work on this profile.
  // name_pattern is only used later to bold the teacher's name when present.
  const pubs = works.map(shape);

  // Attach extras by DOI (case-insensitive)
  let matched = 0;
  for (const p of pubs) {
    if (!p.doi) continue;
    const ex = extras[p.doi] || extras[p.doi.toLowerCase()];
    if (ex) { p.extras = ex; matched++; }
  }

  // Enrich venue from Crossref for papers where ORCID didn't supply journal-title
  // (mostly book-chapter / conference-paper). Cached to data/crossref-cache.json.
  await enrichVenuesViaCrossref(pubs);

  // Sort year desc, then title asc
  pubs.sort((a, b) => b.year.localeCompare(a.year) || a.title.localeCompare(b.title));

  const years = Array.from(new Set(pubs.map(p => p.year))).sort();
  log(`works=${pubs.length} years=[${years.join(', ')}] extras-matched=${matched}/${Object.keys(extras).length}`);

  const inner = renderBlock(pubs, namePatterns);

  if (args.dryRun) {
    process.stdout.write(inner);
    log('dry-run done');
    return;
  }

  let html;
  try { html = readFileSync(resolve(args.html), 'utf8'); }
  catch (e) { fail(`cannot read ${args.html}: ${e.message}`); }
  const updated = replaceBetweenMarkers(html, inner);
  if (updated === html) {
    log('no changes');
    return;
  }
  writeFileSync(resolve(args.html), updated, 'utf8');
  log(`wrote ${args.html}`);
}

main().catch(e => fail(e.stack || e.message));
