/*
 * add-blogs.mjs — DSDD blog publish injector (the mechanical half of the
 * "assisted publish" trigger). Safely appends one or more new articles to the
 * site's three index-aligned lists so build.mjs can regenerate the pages:
 *   - blogPosts[]  (build/source.html)  card + article metadata
 *   - postBodies[] (build/source.html)  full article HTML
 *   - SLUGS[]      (build.mjs)          URL slug (order MUST match the above)
 * ...plus a .blog-img-<name> CSS class and the hero image at images/<name>.jpg.
 *
 * It APPENDS (never inserts) so existing indices stay aligned. Idempotent:
 * a slug that already exists is skipped.
 *
 * Usage:
 *   node add-blogs.mjs <manifest.json> [--no-build]
 *
 * Manifest = JSON array of posts. Each post:
 *   {
 *     "slug": "puppy-potty-training-no-drama-house-training-guide",
 *     "title": "Puppy Potty Training: The No-Drama House Training Guide",
 *     "excerpt": "First-time owner? ... (1-2 sentences, ~160 chars)",
 *     "tag": "Puppies",              // must be an existing tag (see TAGS below)
 *     "date": "Jul 8, 2026",         // controls site display order (newest first)
 *     "read": "8 min read",
 *     "emoji": "🐶",
 *     "img": "potty-training",       // base name -> images/potty-training.jpg + .blog-img-potty-training
 *     "imageFrom": "C:/path/to/hero.jpg",  // optional: copied to images/<img>.jpg
 *     "reuseImg": "puppies",         // optional fallback: reuse an existing images/<x>.jpg (no new file)
 *     "bodyHtml": "<p class=\"lead\">...</p>\n<h2>...</h2>..."
 *   }
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const SRC = path.join(ROOT, 'build', 'source.html');
const BUILD = path.join(ROOT, 'build.mjs');
const IMAGES = path.join(ROOT, 'images');

// Canonical tag -> {tc (badge bg), tt (badge text)} lifted from existing posts.
const TAGS = {
  Training:  { tc: '#FFD600', tt: '#1a1a1a' },
  Nutrition: { tc: '#FF5C00', tt: '#fff' },
  Health:    { tc: '#FF3B3B', tt: '#fff' },
  Puppies:   { tc: '#2ECC71', tt: '#fff' },
  Seniors:   { tc: '#9B59B6', tt: '#fff' },
  Gear:      { tc: '#00C2FF', tt: '#1a1a1a' },
  Grooming:  { tc: '#FFD600', tt: '#1a1a1a' },
};

function die(msg) { console.error('ERROR: ' + msg); process.exit(1); }

const manifestPath = process.argv[2];
const noBuild = process.argv.includes('--no-build');
if (!manifestPath) die('usage: node add-blogs.mjs <manifest.json> [--no-build]');

const posts = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (!Array.isArray(posts)) die('manifest must be a JSON array of posts');

let src = fs.readFileSync(SRC, 'utf8');
let build = fs.readFileSync(BUILD, 'utf8');

// --- current slug list + next index (from build.mjs SLUGS) ---
const slugsBlock = build.match(/const SLUGS = \[([\s\S]*?)\n\];/);
if (!slugsBlock) die('could not locate SLUGS array in build.mjs');
const existingSlugs = [...slugsBlock[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
let nextIndex = existingSlugs.length; // blogPosts/postBodies are 0-indexed & aligned

const added = [];
for (const p of posts) {
  for (const k of ['slug', 'title', 'excerpt', 'tag', 'date', 'read', 'bodyHtml'])
    if (!p[k]) die(`post "${p.slug || p.title || '?'}" missing required field: ${k}`);
  if (!TAGS[p.tag]) die(`post "${p.slug}" has unknown tag "${p.tag}" (use one of: ${Object.keys(TAGS).join(', ')})`);
  if (p.bodyHtml.includes('`') || p.bodyHtml.includes('${'))
    die(`post "${p.slug}" bodyHtml contains a backtick or \${ which would break the template literal`);
  if (existingSlugs.includes(p.slug)) { console.log(`  skip (exists): ${p.slug}`); continue; }

  const { tc, tt } = TAGS[p.tag];
  const imgBase = p.reuseImg || p.img || p.slug;
  const ic = 'blog-img-' + imgBase;
  const idx = nextIndex++;

  // 1. image: copy a provided file, else require an existing reuse target
  const destImg = path.join(IMAGES, imgBase + '.jpg');
  if (p.imageFrom) {
    fs.copyFileSync(p.imageFrom, destImg);
    console.log(`  image: copied -> images/${imgBase}.jpg`);
  } else if (!fs.existsSync(destImg)) {
    die(`post "${p.slug}" has no imageFrom and images/${imgBase}.jpg does not exist (set "reuseImg" to an existing image name or provide "imageFrom")`);
  } else {
    console.log(`  image: reusing existing images/${imgBase}.jpg`);
  }

  // 2. CSS class (only if new)
  if (!src.includes(`.${ic} {`) && !src.includes(`.${ic}{`)) {
    const cssLine = `.${ic} { background-image: url('images/${imgBase}.jpg'); }\n`;
    src = src.replace(/\n(\s*\/\* RESOURCES PAGE \*\/)/, `\n${cssLine}$1`);
  }

  // 3. blogPosts entry — append before the array's closing "];"
  const bpStart = src.indexOf('const blogPosts=[');
  const bpEnd = src.indexOf('\n];', bpStart);
  const esc = s => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const entry = `,\n{tag:"${esc(p.tag)}",tc:"${tc}",tt:"${tt}",ic:"${ic}",title:"${esc(p.title)}",excerpt:"${esc(p.excerpt)}",date:"${esc(p.date)}",read:"${esc(p.read)}",emoji:"${p.emoji || '🐾'}"}`;
  src = src.slice(0, bpEnd) + entry + src.slice(bpEnd);

  // 4. postBodies entry — append before "function openPost"
  const pbInsert = src.indexOf('function openPost');
  const pbEntry = `postBodies[${idx}] = \`\n${p.bodyHtml.trim()}\n\`;\n\n`;
  src = src.slice(0, pbInsert) + pbEntry + src.slice(pbInsert);

  // 5. SLUGS entry — append before its closing "];"
  const slStart = build.indexOf('const SLUGS = [');
  const slEnd = build.indexOf('\n];', slStart);
  build = build.slice(0, slEnd) + `\n  '${p.slug}',` + build.slice(slEnd);

  added.push({ idx, slug: p.slug, url: `/blog/${p.slug}/` });
  console.log(`  + [${idx}] ${p.slug}`);
}

if (!added.length) { console.log('Nothing new to add.'); process.exit(0); }

fs.writeFileSync(SRC, src);
fs.writeFileSync(BUILD, build);
console.log(`\nInjected ${added.length} post(s) into source.html + build.mjs.`);

if (!noBuild) {
  console.log('Running build...');
  execSync('node build.mjs', { cwd: ROOT, stdio: 'inherit' });
}
console.log('\nNew URLs:');
added.forEach(a => console.log(`  https://doggyseedoggydo.com${a.url}`));
