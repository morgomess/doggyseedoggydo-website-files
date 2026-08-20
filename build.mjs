/*
 * Static-site generator for doggyseedoggydo.com
 * ------------------------------------------------
 * Reads content data + CSS from build/source.html (the original single-file app,
 * kept as the editable source of truth) and emits real, crawlable HTML pages:
 *   /                     home
 *   /blog/                blog index
 *   /blog/<slug>/         one page per article (full text baked into HTML)
 *   /faq/                 all Q&A (static + FAQPage structured data)
 *   /resources/           vetted links + products
 *   /styles.css           shared stylesheet (extracted once)
 *   /sitemap.xml /robots.txt
 *
 * To update content: edit the data arrays in build/source.html, then `node build.mjs`.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const SITE = 'https://doggyseedoggydo.com';
const EMAIL = 'doggysee.doggydo@yahoo.com';
const LEGAL_UPDATED = 'August 15, 2026';

// ---------- 1. Extract content data + CSS from source ----------
function extractData(srcPath) {
  const html = fs.readFileSync(srcPath, 'utf8');
  const code = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).pop();
  const regionA = code.slice(code.indexOf('const blogPosts=['), code.indexOf('function navigateTo'));
  const regionB = code.slice(code.indexOf('const postBodies'), code.indexOf('function openPost'));
  let dataCode = regionA + '\n' + regionB;
  for (const name of ['blogPosts', 'faqData', 'resTraining', 'resHealth', 'resProducts', 'postBodies']) {
    dataCode = dataCode.replace(new RegExp('const\\s+' + name + '\\b'), 'globalThis.' + name);
  }
  (0, eval)(dataCode); // indirect eval → sloppy global scope so `postBodies[0]=...` resolves
  const g = globalThis;
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  return { blogPosts: g.blogPosts, faqData: g.faqData, resTraining: g.resTraining,
           resHealth: g.resHealth, resProducts: g.resProducts, postBodies: g.postBodies, css };
}

const data = extractData(path.join(ROOT, 'build', 'source.html'));

// curated, keyword-forward slugs (article order matches blogPosts / postBodies)
const SLUGS = [
  'positive-reinforcement-dog-training',
  'raw-vs-kibble-vs-fresh-dog-food',
  'signs-your-dog-is-sick',
  'leash-reactive-dog-training-plan',
  'first-30-days-with-a-new-puppy',
  'brushing-your-dogs-teeth',
  'how-to-teach-leave-it',
  'senior-dog-care-guide',
  'dog-food-label-decoder',
  'essential-dog-gear-guide',
  'dog-separation-anxiety-guide',
  'crate-training-101',
  'beat-dog-boredom',
  'how-to-stop-puppy-biting',
  'how-to-train-a-reliable-recall',
  'puppy-potty-training-no-drama-house-training-guide',
  'dog-summer-safety-heat-pavement-cooling',
  'puppy-crate-training-separation-anxiety',
  'how-to-stop-dog-pulling-on-leash-loose-leash-walking',
  'how-much-exercise-does-your-dog-need-by-breed-and-age',
  'puppy-socialization-guide-first-16-weeks',
  'dog-body-language-what-your-dog-is-telling-you',
  'how-to-trim-dog-nails-without-the-struggle',
  'why-does-my-dog-bark-so-much-causes-and-fixes',
  'dog-road-trip-safety-car-travel-tips',
  'how-to-bathe-and-brush-your-dog-at-home',
  'back-to-school-dog-separation-anxiety-prep',
];
const urlFor = i => `/blog/${SLUGS[i]}/`;
// display order: newest post first (by date), while keeping data index → SLUGS/postBodies aligned
const byDate = data.blogPosts.map((_, i) => i).sort((a, b) => new Date(data.blogPosts[b].date) - new Date(data.blogPosts[a].date));
const imgFor = p => '/images/' + p.ic.replace('blog-img-', '') + '.jpg';

// ---------- 2. Shared helpers ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isoDate = d => { const t = new Date(d); return isNaN(t) ? '' : t.toISOString().slice(0, 10); };
// stable per-question anchor id, shared by the home cover cards and the FAQ page
const qSlug = t => 'q-' + t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const allFaqQs = data.faqData.flatMap(c => c.questions.map(q => q.q));
const findQ = t => { if (!allFaqQs.includes(t)) throw new Error('Cover question not found in faqData: ' + t); return t; };

const CLARITY = `<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "xhu42tzbp5");
</script>`;

const NAVLINKS = [
  { href: '/', key: 'home', label: 'Home' },
  { href: '/faq/', key: 'faq', label: 'How Do I...?' },
  { href: '/blog/', key: 'blog', label: 'Blog' },
  { href: '/resources/', key: 'resources', label: 'Resources' },
];

const nav = active => `<nav class="nav">
  <div class="nav-inner">
    <a class="nav-logo" href="/">🐾 Doggy See, Doggy Do</a>
    <ul class="nav-links">
      ${NAVLINKS.map(l => `<li><a href="${l.href}"${l.key === active ? ' class="active"' : ''}>${l.label}</a></li>`).join('\n      ')}
    </ul>
    <button class="mobile-toggle" onclick="document.getElementById('mobileMenu').classList.toggle('open')">☰</button>
  </div>
</nav>
<div class="mobile-menu" id="mobileMenu">
  ${NAVLINKS.map(l => `<a href="${l.href}"${l.key === active ? ' class="active"' : ''}>${l.label}</a>`).join('\n  ')}
</div>`;

const footer = () => `<footer class="footer">
  <div class="footer-grid">
    <div>
      <div class="footer-brand-name">🐾 Doggy See, Doggy Do</div>
      <p class="footer-brand">Every question. Every stage. Every dog.</p>
    </div>
    <div>
      <h2 class="footer-h">Explore</h2>
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/faq/">How Do I...</a></li>
        <li><a href="/blog/">Blog</a></li>
        <li><a href="/resources/">Resources</a></li>
      </ul>
    </div>
    <div>
      <h2 class="footer-h">Popular Topics</h2>
      <ul>
        <li><a href="/faq/">Puppy Training</a></li>
        <li><a href="/faq/">Dog Nutrition</a></li>
        <li><a href="/faq/">Fixing Bad Habits</a></li>
        <li><a href="/blog/">Health &amp; Wellness</a></li>
      </ul>
    </div>
    <div>
      <h2 class="footer-h">The Details</h2>
      <ul>
        <li><a href="/about/">About</a></li>
        <li><a href="/contact/">Contact</a></li>
        <li><a href="/affiliate-disclosure/">Affiliate Disclosure</a></li>
        <li><a href="/disclaimer/">Disclaimer</a></li>
      </ul>
    </div>
  </div>
  <p class="footer-disclosure">Doggy See, Doggy Do is reader supported. Some links on this site are affiliate links, and we may earn a commission when you buy through them at no extra cost to you. We are not veterinarians, and nothing here replaces advice from your own vet. <a href="/affiliate-disclosure/">Full disclosure</a> and <a href="/disclaimer/">disclaimer</a>.</p>
  <div class="footer-bottom">
    <span>&copy; 2026 Doggy See, Doggy Do. Made with <span style="color:var(--red)">❤️</span> for dog people.</span>
    <span class="footer-bottom-links"><a href="/privacy/">Privacy Policy</a><a href="/terms/">Terms and Conditions</a></span>
  </div>
</footer>`;

function page({ title, desc, canonical, active, content, jsonld = '', bodyJs = '', extraHead = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${canonical}">
<meta name="theme-color" content="#FFD600">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${canonical}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="/styles.css">
<link href="https://fonts.googleapis.com/css2?family=Bangers&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
${extraHead ? extraHead + '\n' : ''}${CLARITY}${jsonld ? '\n' + jsonld : ''}
</head>
<body>
${nav(active)}
${content}
${footer()}
${bodyJs}
</body>
</html>
`;
}

// blog card as a real crawlable link
function blogCard(i) {
  const p = data.blogPosts[i];
  return `<a class="card blog-card" href="${urlFor(i)}" data-tag="${p.tag}">
    <div class="card-img ${p.ic}"><span class="badge" style="position:relative;z-index:1;margin:10px;background:${p.tc};color:${p.tt};border-color:var(--dark)">${p.tag}</span></div>
    <div class="card-body"><div class="card-meta"><span>${p.date}</span><span>${p.read}</span></div><h3>${esc(p.title)}</h3><p class="card-excerpt">${esc(p.excerpt)}</p><span class="read-more">Read Full Article →</span></div></a>`;
}

// ---------- 3. Page builders ----------
function buildHome() {
  const preview = byDate.slice(0, 3).map(blogCard).join('\n');
  // Interactive "What We Cover" cards → each opens a drawer of real FAQ question links (deep-linked to the answer)
  const COVERS = [
    { title: 'Training &amp; Behavior', cls: '', icon: '🐕', bg: 'var(--yellow)', color: '#FFD600', blurb: 'From sit to stay to stop eating my shoes.', all: '/faq/#faq-training',
      qs: ["How do I stop my dog from pulling on the leash?", "How do I stop my dog from jumping on people?", "How do I teach \"leave it\"?", "How do I stop my dog from barking at everything?", "How do I use positive reinforcement correctly?"] },
    { title: 'Food &amp; Diet', cls: ' blue-card', icon: '🥩', bg: 'var(--blue)', color: '#00C2FF', blurb: 'What&#39;s actually in that bag? We break it down.', all: '/faq/#faq-feeding',
      qs: ["How do I know how much to feed my dog?", "How do I switch my dog's food safely?", "How do I read a dog food label?", "How do I know if my dog is a healthy weight?", "How do I feed a raw diet safely?"] },
    { title: 'Health &amp; Vet Care', cls: '', icon: '❤️', bg: 'var(--red)', color: '#FF3B3B', blurb: 'Know the signs before it becomes an emergency.', all: '/faq/#faq-health',
      qs: ["How do I know if my dog is sick?", "How do I know if my dog is in pain?", "How do I check my dog for ticks?", "How often does my dog need to go to the vet?", "How do I handle my dog's allergies?"] },
    { title: 'Grooming &amp; Hygiene', cls: '', icon: '✂️', bg: '#ddd', color: '#2ECC71', blurb: 'Yes, you do need to brush their teeth.', all: '/faq/#faq-grooming',
      qs: ["How do I cut my dog's nails safely?", "How do I bathe my dog at home?", "How do I deal with dog shedding?", "How do I brush a dog that hates being brushed?", "How often should I groom my dog?"] },
    { title: 'Mental Stimulation', cls: '', icon: '🧠', bg: 'var(--green)', color: '#FF5C00', blurb: 'A bored dog is a destructive dog. Let&#39;s fix that.', all: '/faq/',
      qs: ["How do I stop my dog from barking at everything?", "How do I help my dog with anxiety?", "How do I get a puppy used to being alone?", "How do I keep a senior dog mentally stimulated?", "How do I socialize a puppy?"] },
    { title: 'Life Stages', cls: ' red-card', icon: '🐾', bg: '#fff', color: '#00C2FF', blurb: 'Puppies, adults, seniors - every phase covered.', all: '/faq/',
      qs: ["How do I set up a puppy schedule?", "How do I potty train a puppy?", "How do I know my dog is entering senior years?", "How do I adjust my senior dog's diet?", "How do I manage arthritis in my dog?"] },
  ];
  // card immediately followed by its (hidden) panel, all inside .cover-grid, so the dropdown opens directly under the row
  const coverItems = COVERS.map((c, i) => {
    const card = `<button type="button" class="card cover-card${c.cls}" data-cover="${i}" aria-expanded="false" aria-controls="cover-panel-${i}"><div class="cover-icon" style="background:${c.bg}">${c.icon}</div><h3>${c.title}</h3><p>${c.blurb}</p><span class="cover-chev" aria-hidden="true">▾</span></button>`;
    const items = c.qs.map(t => `<li><a href="/faq/#${qSlug(findQ(t))}">${esc(t)}</a></li>`).join('');
    const panel = `<div class="cover-panel" id="cover-panel-${i}" data-panel="${i}" style="--c:${c.color}" hidden><div class="cover-panel-head"><h3>${c.title} questions</h3><a class="cover-all" href="${c.all}">See all &rarr;</a></div><ul class="cover-qlist">${items}</ul></div>`;
    return card + '\n        ' + panel;
  }).join('\n        ');
  const content = `<section class="hero-home">
    <div class="hero-home-inner">
      <div>
        <div class="hero-badge"><span class="star">⭐</span> Rated #1 by Good Boys &amp; Girls</div>
        <h1>Every Dog Question,<br>Answered.</h1>
        <p>Straight answers to every dog question. Training, food, health and puppy tips that actually work. Because Google (and ChatGPT) doesn't have a dog. 🐾</p>
        <div class="hero-btns">
          <a class="pill-btn dark" href="/faq/">How Do I...?</a>
          <a class="pill-btn outline" href="/blog/">Read the Blog</a>
        </div>
      </div>
      <div class="hero-img-box"><img src="/images/hero.jpg" alt="A golden retriever and a border collie resting together in a sunny backyard" width="1600" height="800" fetchpriority="high" decoding="async"></div>
    </div>
  </section>

  <section class="section cover-section">
    <div class="container">
      <h2>What We Cover</h2>
      <p class="sub">Tap a topic to see the real questions we answer, then jump straight to the answer.</p>
      <div class="cover-grid">
        ${coverItems}
      </div>
    </div>
  </section>

  <section class="stat-banner">
    <div class="container">
      <h2>Because Google doesn't have a dog.</h2>
      <p class="sub">Real advice from people who've cleaned up the messes.</p>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-emoji">📝</div><div class="num">${data.faqData.reduce((a, c) => a + c.questions.length, 0)}+</div><p>Questions Answered</p></div>
        <div class="stat-card"><div class="stat-emoji">🐾</div><div class="num">${data.blogPosts.length}</div><p>Deep-Dive Guides</p></div>
        <div class="stat-card"><div class="stat-emoji">❤️</div><div class="num">${data.resTraining.length + data.resHealth.length + data.resProducts.length}</div><p>Vetted Resources</p></div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-header">
        <div><h2>Latest from the Blog</h2><p class="sub">Fresh tips, tricks, and tales.</p></div>
        <a class="pill-btn" href="/blog/">View All Posts →</a>
      </div>
      <div class="grid-3">${preview}</div>
    </div>
  </section>`;
  const jsonld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'WebSite', name: 'Doggy See, Doggy Do',
    url: SITE + '/', description: 'Straight answers to every dog question — training, nutrition, health, grooming, and senior care.'
  })}</script>`;
  const bodyJs = `<script>
(function(){
  var grid=document.querySelector('.cover-grid');
  if(!grid)return;
  var cards=[].slice.call(grid.querySelectorAll('.cover-card')),panels=[].slice.call(grid.querySelectorAll('.cover-panel'));
  function closeAll(){cards.forEach(function(c){c.classList.remove('active');c.setAttribute('aria-expanded','false');});panels.forEach(function(p){p.hidden=true;});}
  cards.forEach(function(card){card.addEventListener('click',function(){
    var i=card.getAttribute('data-cover'),wasActive=card.classList.contains('active');
    closeAll();
    if(!wasActive){
      card.classList.add('active');card.setAttribute('aria-expanded','true');
      var panel=panels.filter(function(p){return p.getAttribute('data-panel')===i;})[0];
      if(panel){panel.hidden=false;}
    }
  });});
})();
</script>`;
  return page({
    title: 'Doggy See, Doggy Do - Dog Parenting Resource Hub',
    desc: 'Straight answers to every dog question — from puppy training and nutrition to health, grooming, and senior care. Practical dog advice that actually works.',
    canonical: '/', active: 'home', content, jsonld, bodyJs,
    extraHead: '<link rel="preload" as="image" href="/images/hero.jpg" fetchpriority="high">',
  });
}

function buildBlogIndex() {
  const tags = ['All', ...new Set(data.blogPosts.map(p => p.tag))];
  const filters = tags.map((t, i) => `<button class="filter-btn${i === 0 ? ' active' : ''}" data-tag="${t}" onclick="filterBlog('${t}',this)">${t}</button>`).join('');
  const grid = byDate.map(i => blogCard(i)).join('\n');
  const content = `<section class="hero-blog">
    <div class="bugle">📰 The Doggy Bugle</div>
    <h1>Deep Dives for<br>Dog People.</h1>
    <p>We go beyond the basics so you don't have to.</p>
  </section>
  <div class="filter-bar">${filters}</div>
  <div class="blog-grid"><div class="grid-3" id="blogGrid">${grid}</div></div>`;
  const bodyJs = `<script>
function filterBlog(t,b){
  document.querySelectorAll('.filter-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');
  document.querySelectorAll('#blogGrid .blog-card').forEach(c=>c.style.display=(t==='All'||c.dataset.tag===t)?'':'none');
}
</script>`;
  return page({
    title: 'Dog Care Blog - Deep-Dive Guides | Doggy See, Doggy Do',
    desc: 'In-depth dog guides on training, nutrition, health, grooming, puppies, and senior care. Researched, practical, and free of fluff.',
    canonical: '/blog/', active: 'blog', content, bodyJs,
  });
}

function buildArticle(i) {
  const p = data.blogPosts[i];
  const body = data.postBodies[i] || '<p>This article is coming soon.</p>';
  const related = data.blogPosts.map((_, j) => j).filter(j => j !== i)
    .sort((a, b) => (data.blogPosts[b].tag === p.tag) - (data.blogPosts[a].tag === p.tag))
    .slice(0, 3).map(blogCard).join('\n');
  const content = `<div class="hero-article">
    <span class="badge article-badge" style="background:${p.tc};color:${p.tt};border-color:var(--dark)">${p.tag}</span>
    <img src="${imgFor(p)}" alt="${esc(p.title)}" width="1000" height="562" fetchpriority="high" decoding="async">
  </div>
  <div class="article-wrap">
    <a class="article-back" href="/blog/">← Back to all posts</a>
    <div class="article-head">
      <h1>${esc(p.title)}</h1>
      <div class="article-meta"><span>${p.date}</span><span>•</span><span>${p.read}</span><span>•</span><span>${p.tag}</span></div>
    </div>
    <div class="article-body">${body}</div>
    <div class="article-related">
      <h2 class="related-h">Keep reading</h2>
      <div class="grid-3">${related}</div>
    </div>
  </div>`;
  const jsonld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: p.title, description: p.excerpt, image: SITE + imgFor(p),
    datePublished: isoDate(p.date), dateModified: isoDate(p.date),
    author: { '@type': 'Organization', name: 'Doggy See, Doggy Do' },
    publisher: { '@type': 'Organization', name: 'Doggy See, Doggy Do' },
    mainEntityOfPage: SITE + urlFor(i),
  })}</script>`;
  return page({
    title: `${p.title} | Doggy See, Doggy Do`,
    desc: p.excerpt, canonical: urlFor(i), active: 'blog', content, jsonld,
    extraHead: `<link rel="preload" as="image" href="${imgFor(p)}" fetchpriority="high">`,
  });
}

function buildFaq() {
  let sidebar = '<div class="faq-sidebar-title">Categories</div>';
  let body = '';
  data.faqData.forEach(c => {
    const id = c.category.toLowerCase().replace(/\s+/g, '-');
    sidebar += `<a href="#faq-${id}">${c.category}</a>`;
    body += `<div class="faq-category" id="faq-${id}"><div class="faq-cat-header"><div class="faq-cat-hl" style="background:${c.color}"></div><span class="faq-cat-label">${c.category}</span></div>`;
    c.questions.forEach(q => {
      body += `<div class="faq-item" id="${qSlug(q.q)}" data-q="${esc(q.q.toLowerCase())}"><div class="faq-q" onclick="toggleFAQ(this)"><span>${esc(q.q)}</span><span class="faq-chev">▾</span></div><div class="faq-ans"><div class="faq-ans-inner">${q.a}</div></div></div>`;
    });
    body += '</div>';
  });
  const content = `<section class="hero-faq">
    <h1>How Do I...?</h1>
    <div class="search-bar">
      <span class="si">🔍</span>
      <input type="text" placeholder="Search any dog question..." id="faqSearch" oninput="filterFAQ()">
    </div>
  </section>
  <div class="faq-layout">
    <aside class="faq-sidebar">${sidebar}</aside>
    <div id="faqContent">${body}</div>
  </div>`;
  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: data.faqData.flatMap(c => c.questions.map(q => ({
      '@type': 'Question', name: q.q,
      acceptedAnswer: { '@type': 'Answer', text: q.a.replace(/<[^>]+>/g, '') },
    }))),
  };
  const jsonld = `<script type="application/ld+json">${JSON.stringify(faqLd)}</script>`;
  const bodyJs = `<script>
function toggleFAQ(el){const i=el.parentElement,a=i.querySelector('.faq-ans');i.classList.toggle('open');a.style.maxHeight=i.classList.contains('open')?a.scrollHeight+'px':'0';}
function filterFAQ(){
  const q=document.getElementById('faqSearch').value.toLowerCase().trim();
  document.querySelectorAll('.faq-item').forEach(it=>{it.style.display=(!q||it.dataset.q.includes(q))?'':'none';});
  document.querySelectorAll('.faq-category').forEach(cat=>{const any=[...cat.querySelectorAll('.faq-item')].some(i=>i.style.display!=='none');cat.style.display=any?'':'none';});
}
document.querySelectorAll('.faq-sidebar a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();document.querySelector(a.getAttribute('href')).scrollIntoView({behavior:'smooth'});}));
// deep-link: open + scroll to a specific question when arriving via #q-... (e.g. from the homepage cover cards)
function openFromHash(){
  var h=location.hash; if(!h) return;
  var el; try{ el=document.querySelector(h); }catch(e){ return; }
  if(!el) return;
  if(el.classList.contains('faq-item')){
    var q=el.querySelector('.faq-q');
    if(q && !el.classList.contains('open')) toggleFAQ(q);
    setTimeout(function(){ el.scrollIntoView({behavior:'smooth',block:'center'}); },60);
  } else { el.scrollIntoView({behavior:'smooth'}); }
}
window.addEventListener('load',openFromHash);
window.addEventListener('hashchange',openFromHash);
</script>`;
  return page({
    title: 'How Do I...? Common Dog Questions Answered | Doggy See, Doggy Do',
    desc: 'Straight answers to the most common dog questions — training, behavior, health, grooming, and more. Search 50+ answered questions.',
    canonical: '/faq/', active: 'faq', content, jsonld, bodyJs,
  });
}

function buildResources() {
  const sec = (num, title, items, cls, btn) =>
    `<div class="resource-section"><h2><span class="res-num">${num}</span> ${title}</h2><div class="grid-3">` +
    items.map(i => `<div class="card resource-card${cls}">${cls ? '<span class="star-b">⭐</span>' : ''}<h3>${esc(i.n)}</h3><p>${esc(i.d)}</p><button class="${btn}">${btn === 'shop-btn' ? 'Shop Gear →' : 'Visit Site ↗'}</button></div>`).join('') +
    '</div></div>';
  const content = `<section class="hero-resources">
    <h1>Resources We<br>Actually Stand<br>Behind.</h1>
    <p>Vetted links, trusted trainers, and products we've tested ourselves. Affiliate links marked with ⭐</p>
  </section>
  <div class="disclosure-box">
    <strong>Heads up:</strong> links marked with a star (⭐) are affiliate links. If you buy through one, we may earn a small commission at no extra cost to you, and it never changes what we recommend or what you pay. <a href="/affiliate-disclosure/">Read the full disclosure</a>.
  </div>
  <div id="resourcesContent">
    ${sec('①', 'Reputable Training Resources', data.resTraining, '', 'visit-btn')}
    ${sec('②', 'Health &amp; Vet Resources', data.resHealth, '', 'visit-btn')}
    <div class="resource-section"><div class="product-wrap"><h2><span class="res-num">③</span> Favorite Pet Products ⭐</h2><div class="grid-3">${data.resProducts.map(i => `<div class="card resource-card product-card"><span class="star-b">⭐</span><h3>${esc(i.n)}</h3><p>${esc(i.d)}</p><button class="shop-btn">Shop Gear →</button></div>`).join('')}</div></div></div>
  </div>`;
  return page({
    title: 'Dog Resources & Recommended Products | Doggy See, Doggy Do',
    desc: 'Vetted dog training resources, trusted health references, and pet products we have actually tested and recommend.',
    canonical: '/resources/', active: 'resources', content,
  });
}

function buildNotFound() {
  const content = `<section class="notfound">
    <div class="nf-emoji">🐕‍🦺</div>
    <h1>This page ran off.</h1>
    <p>We looked under the couch and behind the treat jar — no luck. The page you're after doesn't exist (or has moved). Let's get you back on the trail.</p>
    <div class="hero-btns">
      <a class="pill-btn dark" href="/">Back Home</a>
      <a class="pill-btn outline" href="/blog/">Read the Blog</a>
    </div>
  </section>`;
  return page({
    title: 'Page Not Found | Doggy See, Doggy Do',
    desc: 'The page you were looking for could not be found.',
    canonical: '/', active: '', content,
    extraHead: '<meta name="robots" content="noindex">',
  });
}

// ---------- 3b. Detail / legal pages ----------
const mail = `<a href="mailto:${EMAIL}">${EMAIL}</a>`;

const LEGAL = [
  {
    slug: 'about',
    label: 'About',
    title: 'About Doggy See, Doggy Do | Who Writes This Site',
    desc: 'Who is behind Doggy See, Doggy Do, how our dog care and training content gets written, and the sources we rely on.',
    h1: 'About This Site',
    kicker: 'Straight answers for dog people, without the gatekeeping.',
    body: `<p class="lead">Doggy See, Doggy Do exists because getting a straight answer about your dog online is unreasonably hard. Every search turns into ten tabs, four contradictory opinions, and a forum thread from 2011. We wanted one place where the answer is just there.</p>

<h2>Who runs this</h2>
<p>This site is published by Morgan Messick, a dog owner who got tired of the runaround. We are not veterinarians and we do not pretend to be. What we are is careful: we read the research, we lean on the people who do have the credentials, and we write it down in language that makes sense at 11pm when your puppy will not stop biting.</p>

<h2>How the content gets made</h2>
<ul>
<li>We start from published veterinary and professional training guidance, not from forum consensus.</li>
<li>We write for the average healthy dog and say so when a situation falls outside that.</li>
<li>We do not diagnose, and we never tell you to override your own veterinarian.</li>
<li>Every article carries a publication date so you can judge how current it is.</li>
<li>When we get something wrong and find out, we fix it rather than quietly leaving it up.</li>
</ul>

<h2>What we will not do</h2>
<p>We will not tell you your dog has a specific condition. We will not talk you out of a vet visit. We will not recommend a product because someone paid us to, and we will not leave a recommendation up once we stop believing in it. If a company wants coverage here, the answer is that coverage is not for sale.</p>

<h2>How the site pays for itself</h2>
<p>Some links here are or will become affiliate links, meaning we may earn a commission when you buy through them, at no extra cost to you. The full explanation is on our <a href="/affiliate-disclosure/">Affiliate Disclosure</a> page, and it is worth two minutes of your time.</p>

<h2>Say hello</h2>
<p>Questions, corrections, and "you got this wrong" emails are all welcome at ${mail}. Corrections especially.</p>`,
  },
  {
    slug: 'contact',
    label: 'Contact',
    title: 'Contact Doggy See, Doggy Do',
    desc: 'How to reach Doggy See, Doggy Do with questions, corrections, partnership inquiries, or privacy requests.',
    h1: 'Contact Us',
    kicker: 'One inbox, read by an actual person.',
    body: `<p class="lead">The fastest way to reach us is email. Write to ${mail} and we will get back to you, usually within a few business days.</p>

<h2>What we are glad to hear about</h2>
<ul>
<li><strong>Corrections.</strong> If something on this site is wrong, tell us. This is the email we most want to get.</li>
<li><strong>Topic requests.</strong> If you searched for something and could not find a real answer, that is a gap worth filling.</li>
<li><strong>Partnerships, press, and advertising.</strong> Send the details and we will tell you honestly whether it is a fit.</li>
<li><strong>Privacy requests.</strong> Access, deletion, or opt-out requests under GDPR, the CCPA, or any similar law. Put "Privacy Request" in the subject line so it does not get lost.</li>
<li><strong>Copyright concerns.</strong> If you believe something here infringes your work, write to us with the specifics and we will look at it promptly.</li>
</ul>

<h2>What we cannot do</h2>
<p>We cannot answer individual questions about your dog's health, and we will not try. We have not examined your dog, we are not veterinarians, and a well-meaning guess by email is exactly how dogs get hurt. If something is wrong with your dog, call your veterinarian. If it is urgent and your clinic is closed, call the nearest emergency veterinary hospital. Please see our <a href="/disclaimer/">Disclaimer</a> for the full picture.</p>

<h2>Response times</h2>
<p>This is a small operation, not a support desk. We read everything and answer as fast as we reasonably can. If your message is time-sensitive because of your dog's health, please do not wait on us. Call a vet.</p>`,
  },
  {
    slug: 'affiliate-disclosure',
    label: 'Affiliate Disclosure',
    title: 'Affiliate Disclosure | Doggy See, Doggy Do',
    desc: 'How Doggy See, Doggy Do makes money, what an affiliate link is, and our promise that a recommendation here cannot be bought.',
    h1: 'Affiliate Disclosure',
    kicker: 'How this site makes money, in plain English.',
    body: `<p class="lead">Doggy See, Doggy Do is free to read. Some links on this site are or will become affiliate links, which means if you click one and buy something, we may earn a small commission. It does not cost you anything extra.</p>

<h2>The short version</h2>
<ul>
<li>You never pay more for using our link. The price is identical either way.</li>
<li>We only point you toward things we would put on our own dogs.</li>
<li>A company cannot buy its way onto this site. Paying us does not get a product recommended.</li>
<li>Affiliate links are marked with a star on our <a href="/resources/">Resources</a> page.</li>
</ul>

<h2>What an affiliate link actually is</h2>
<p>An affiliate link is an ordinary link with a tracking code attached. If you click it and then buy from that retailer, the retailer sees that the sale came from us and pays us a percentage of it. You are charged the normal retail price. The commission comes out of the retailer's margin, not your wallet, and it does not change what you pay or what you receive.</p>

<h2>Where our affiliate relationships stand right now</h2>
<p>We are in the process of joining retailer and affiliate partner programs. As each one goes live, this page will be updated to name it. Until a program is named here and its links carry a star, treat every product mention on this site as an unpaid editorial recommendation.</p>

<h2>How we decide what to recommend</h2>
<p>Recommendations come from hands-on use where we have it, and from research and published guidance from veterinary and professional training organizations where we do not. When we have not personally used something, we say so rather than implying otherwise. When a product we once recommended stops earning that spot, we take it down instead of leaving it up for the commission.</p>

<h2>Other ways this site might earn</h2>
<p>Alongside affiliate commissions, this site may eventually carry display advertising or sponsored content. If sponsored content ever appears, it will be labeled as sponsored at the top of the page, before you read a word of it. Advertising will never be allowed to shape editorial recommendations.</p>

<h2>Why we are telling you this</h2>
<p>The Federal Trade Commission requires websites to disclose material connections between the publisher and the products it recommends, and we think that rule is a good one. You should know who is paying whom before you take advice about your dog.</p>

<h2>Questions</h2>
<p>Ask us anything about this at ${mail}. If you want to know whether a specific link earns us money, just write and ask. We will tell you.</p>`,
  },
  {
    slug: 'disclaimer',
    label: 'Disclaimer',
    title: 'Disclaimer | Doggy See, Doggy Do',
    desc: 'Content on Doggy See, Doggy Do is general dog care information, not veterinary advice. Here is exactly what that means.',
    h1: 'Disclaimer',
    kicker: 'We write about dogs. We are not your veterinarian.',
    body: `<p class="lead">Everything on Doggy See, Doggy Do is general information for dog owners. It is not veterinary advice, and it is not a substitute for an examination by a licensed veterinarian who has actually met your dog.</p>

<h2>Not veterinary advice</h2>
<p>We do not diagnose, treat, or prescribe. We cannot see your dog, feel their abdomen, take their temperature, or run bloodwork. Nothing here creates a veterinarian-client-patient relationship. If your dog is sick, injured, in pain, or doing something that worries you, call your veterinarian. If it is urgent and your regular clinic is closed, call the nearest emergency veterinary hospital.</p>

<h2>Emergencies</h2>
<p>Please do not use this website to work out whether something is an emergency. That decision needs a professional, and the minutes you spend reading are minutes you do not get back. If you suspect your dog has eaten something toxic, contact your veterinarian or the <a href="https://www.aspca.org/pet-care/animal-poison-control" target="_blank" rel="noopener">ASPCA Animal Poison Control Center</a> immediately.</p>

<h2>Training and behavior</h2>
<p>Behavior content here is written for the average healthy dog, and dogs are individuals. A plan that transforms one dog can be wrong for the next one. Behavior that looks like stubbornness is sometimes pain. Aggression, severe anxiety, and sudden personality changes are not do-it-yourself projects: work with a qualified trainer or a veterinary behaviorist, and rule out medical causes first.</p>

<h2>Nutrition</h2>
<p>Diet content here is general. Puppies, seniors, pregnant and nursing dogs, and dogs with kidney, liver, heart, or pancreatic conditions have requirements no article can address safely. Talk to your veterinarian before you change your dog's food, add a supplement, or start a weight-loss plan.</p>

<h2>Accuracy and updates</h2>
<p>We work to keep this site accurate and current, and we correct mistakes when we find them. Even so, guidance changes and errors happen, so we make no warranty that everything here is complete, current, or correct at the moment you read it. Every article carries a publication date so you can judge for yourself.</p>

<h2>Links to other sites</h2>
<p>We link to outside websites we find useful. We do not control them, and we are not responsible for their content, their accuracy, their products, or their privacy practices. A link is not an endorsement of everything on the other end of it.</p>

<h2>Products and results</h2>
<p>Any product mentioned here is mentioned because we think it is worth considering, not because it is guaranteed to work for your dog. Results vary by dog, by household, and by how consistently a plan gets followed. We are not the manufacturer or seller of anything we link to, and warranty and safety questions belong with them.</p>

<h2>Your call, your responsibility</h2>
<p>Decisions about your dog are yours to make. By using this site you accept that you are responsible for those decisions, and that Doggy See, Doggy Do is not liable for any outcome that follows from something you read here. The full statement is in our <a href="/terms/">Terms and Conditions</a>, and our commercial relationships are described in our <a href="/affiliate-disclosure/">Affiliate Disclosure</a>.</p>`,
  },
  {
    slug: 'privacy',
    label: 'Privacy Policy',
    title: 'Privacy Policy | Doggy See, Doggy Do',
    desc: 'What Doggy See, Doggy Do collects, what we do not collect, the analytics we use, and how to exercise your privacy rights.',
    h1: 'Privacy Policy',
    kicker: 'What we collect, what we do not, and how to make us stop.',
    body: `<p class="lead">Short version: we do not ask you for anything. There is no account to create, no newsletter signup, and nothing to buy on this site. What we do collect is anonymous usage data that tells us which articles are worth writing more of.</p>

<h2>What we do not collect</h2>
<p>We do not ask for your name, your address, your phone number, or your payment details, because there is nowhere on this site to give them to us. We do not run a newsletter, we do not sell anything directly, and we do not have user accounts. If you email us, we have your email address, because that is how email works. We use it to answer you and nothing else.</p>

<h2>What is collected automatically</h2>
<p>Like nearly every website, ours records basic technical information when you visit: the pages you look at, roughly how long you stay, the site or search that sent you, your browser and device type, and a general geographic area derived from your IP address. This is aggregate and is not used to work out who you are.</p>

<h2>Analytics</h2>
<p>We use <strong>Microsoft Clarity</strong> to understand how people actually use this site. Clarity records anonymized usage metrics and can replay anonymized session recordings and build heatmaps, which is how we learn that a section confuses everyone or that nobody scrolls far enough to reach the important part. Clarity sets cookies and processes data under Microsoft's own privacy terms. You can read the <a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noopener">Microsoft Privacy Statement</a> for the details of what Microsoft does with it.</p>

<h2>Fonts and other third parties</h2>
<p>This site loads typefaces from Google Fonts, which means your browser makes a request to Google's servers and Google receives your IP address as part of that request. We do not run advertising networks on this site today. If that changes, this policy will be updated before it does.</p>

<h2>Cookies</h2>
<p>Cookies are small files a site stores in your browser. Ours are used for analytics, not for advertising, and none of them are required for the site to work. You can block or delete cookies in your browser settings at any time and this site will keep functioning normally. Most browsers also offer a "do not track" signal; there is currently no industry-standard way for sites to honor it, so we do not claim to.</p>

<h2>Affiliate links and tracking</h2>
<p>Some links on this site are or will become affiliate links. When you click one, the retailer may set a cookie in order to credit the referral if you buy something. That cookie belongs to the retailer, not to us, and is governed by that retailer's privacy policy. We never see your payment information. See our <a href="/affiliate-disclosure/">Affiliate Disclosure</a> for how all of that works.</p>

<h2>Children</h2>
<p>This site is written for adults who own dogs. It is not directed at children under 13, and we do not knowingly collect personal information from them. If you believe a child has provided us with personal information, write to us and we will delete it.</p>

<h2>How long data is kept</h2>
<p>Analytics data is retained by our analytics provider under its own retention schedule. Emails you send us are kept as long as they are useful for answering you and keeping a record of the conversation, and are deleted on request.</p>

<h2>Your rights</h2>
<p>Depending on where you live, you may have the right to know what personal information is held about you, to get a copy of it, to have it corrected or deleted, and to opt out of its sale or sharing. We do not sell personal information, and we never have. To exercise any of these rights, email ${mail} with "Privacy Request" in the subject line. We will not treat you differently for asking.</p>

<h2>Security</h2>
<p>This site is served over HTTPS. That said, no method of transmission over the internet is completely secure, and we cannot guarantee absolute security of anything sent to us by email.</p>

<h2>Changes to this policy</h2>
<p>If we change what we collect or which services we use, we will update this page and change the date at the bottom. Continuing to use the site after a change means you accept the updated policy.</p>

<h2>Contact</h2>
<p>Privacy questions and requests go to ${mail}.</p>`,
  },
  {
    slug: 'terms',
    label: 'Terms and Conditions',
    title: 'Terms and Conditions | Doggy See, Doggy Do',
    desc: 'The terms you agree to when you use Doggy See, Doggy Do, including acceptable use, intellectual property, and limitation of liability.',
    h1: 'Terms and Conditions',
    kicker: 'The rules of the road for using this site.',
    body: `<p class="lead">By visiting doggyseedoggydo.com you agree to these terms. If you do not agree with them, please do not use the site. We have tried to write them in language a human can actually read.</p>

<h2>1. Who we are</h2>
<p>Doggy See, Doggy Do ("we", "us", "the site") publishes general information about dog care, training, health, nutrition, and gear at doggyseedoggydo.com. You can reach us at ${mail}.</p>

<h2>2. The site is informational only</h2>
<p>Everything here is general information, not veterinary, medical, legal, or professional advice, and it does not create a professional relationship of any kind between you and us. Our <a href="/disclaimer/">Disclaimer</a> sets this out in full and forms part of these terms.</p>

<h2>3. Using the site</h2>
<p>You may read, print, and share our content for your own personal, non-commercial use. You agree not to:</p>
<ul>
<li>Republish our articles, in whole or in substantial part, as your own or on another site.</li>
<li>Scrape, crawl, or harvest the site by automated means beyond ordinary search engine indexing.</li>
<li>Use the site or anything on it to train a machine learning model without our written permission.</li>
<li>Attempt to interfere with, overload, or gain unauthorized access to the site or its infrastructure.</li>
<li>Use the site for any unlawful purpose or in a way that harms anyone else's use of it.</li>
</ul>

<h2>4. Our content</h2>
<p>The text, images, layout, and design on this site are owned by us or used with permission, and are protected by copyright and other intellectual property laws. Quoting a short passage with clear attribution and a link back is welcome. Wholesale copying is not. If you want to use something more substantially, ask us at ${mail} and we will usually say yes.</p>

<h2>5. Affiliate links and commercial relationships</h2>
<p>Some links on this site are or will become affiliate links, and we may earn a commission on purchases made through them at no additional cost to you. Our full <a href="/affiliate-disclosure/">Affiliate Disclosure</a> explains exactly how this works and forms part of these terms.</p>

<h2>6. Third-party sites and products</h2>
<p>We link to sites and products we do not control. We are not responsible for their content, their accuracy, their availability, their products, or their privacy and security practices, and a link from us is not an endorsement of everything found there. Any transaction you enter into with a third party is strictly between you and that third party.</p>

<h2>7. No warranties</h2>
<p>The site and everything on it is provided "as is" and "as available", without warranties of any kind, whether express or implied, including any implied warranties of merchantability, fitness for a particular purpose, accuracy, or non-infringement. We do not warrant that the site will be uninterrupted, error-free, or free of harmful components, nor that any information here is complete or current at the moment you read it.</p>

<h2>8. Limitation of liability</h2>
<p>To the fullest extent permitted by law, we are not liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of profits, data, goodwill, or for any injury, illness, or harm to any person or animal, arising out of or connected with your use of this site or your reliance on anything published here. Decisions about your dog remain yours. Some jurisdictions do not allow certain limitations of liability, so parts of this section may not apply to you.</p>

<h2>9. Indemnity</h2>
<p>You agree to indemnify and hold us harmless from any claim or demand, including reasonable legal fees, arising out of your breach of these terms or your misuse of the site.</p>

<h2>10. Privacy</h2>
<p>Our <a href="/privacy/">Privacy Policy</a> explains what data is collected when you visit and what your rights are. It forms part of these terms.</p>

<h2>11. Changes to the site and to these terms</h2>
<p>We may add, change, or remove content and features at any time, and we may update these terms. When we do, we will change the date at the bottom of this page. Continuing to use the site after a change means you accept the revised terms.</p>

<h2>12. Severability</h2>
<p>If any part of these terms is found to be unenforceable, the rest stays in force and the unenforceable part is applied as closely as possible to its original intent.</p>

<h2>13. Contact</h2>
<p>Questions about these terms go to ${mail}.</p>`,
  },
];

const legalNav = current => `<nav class="legal-nav" aria-label="Site information">
  ${LEGAL.map(l => `<a href="/${l.slug}/"${l.slug === current ? ' class="active"' : ''}>${l.label}</a>`).join('\n  ')}
</nav>`;

function buildLegal(l) {
  const content = `<section class="hero-legal">
    <h1>${esc(l.h1)}</h1>
    <p>${esc(l.kicker)}</p>
  </section>
  <div class="article-wrap">
    <div class="article-body legal-body">
      ${l.body}
      <p class="legal-updated">Last updated: ${LEGAL_UPDATED}</p>
      ${legalNav(l.slug)}
    </div>
  </div>`;
  return page({
    title: l.title, desc: l.desc, canonical: `/${l.slug}/`, active: l.slug, content,
  });
}

// ---------- 4. Write everything ----------
function write(rel, contents) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents);
  console.log('  wrote', rel);
}

console.log('Generating doggyseedoggydo.com ...');
write('styles.css', data.css.trim() + '\n' + `
/* --- generated: link/element resets so nav/cards/buttons work as real <a> --- */
a.nav-logo{text-decoration:none;color:inherit;cursor:pointer;}
a.blog-card{text-decoration:none;color:inherit;}
a.pill-btn{text-decoration:none;display:inline-flex;align-items:center;justify-content:center;}
a.article-back{text-decoration:none;display:inline-block;}
.footer-h{font-size:1rem;margin-bottom:12px;}
.related-h{margin-bottom:18px;}
/* perf: let offscreen cards skip layout/paint until near the viewport (card images are CSS backgrounds) */
.blog-card{content-visibility:auto;contain-intrinsic-size:auto 420px;}
/* interactive "What We Cover" cards + FAQ drawer */
button.cover-card{font:inherit;width:100%;color:inherit;-webkit-appearance:none;appearance:none;position:relative;cursor:pointer;}
.cover-card .cover-chev{position:absolute;top:14px;right:16px;font-size:1rem;opacity:.45;transition:transform .2s,opacity .2s;}
.cover-card.active .cover-chev{transform:rotate(180deg);opacity:1;}
.cover-card.active{outline:3px solid var(--dark);outline-offset:-3px;box-shadow:var(--shadow-hover);}
/* dense flow so an open full-width panel doesn't leave a hole in the card row */
.cover-grid{grid-auto-flow:dense;}
/* the dropdown: spans the row directly under the cards, themed to the topic color via --c */
.cover-panel{grid-column:1 / -1;text-align:left;padding:20px 22px;border:var(--border);border-color:var(--c,var(--dark));border-radius:var(--radius);box-shadow:var(--shadow);background:#fff8e6;background:color-mix(in srgb, var(--c,#FF5C00) 16%, #fff);animation:coverDrop .22s ease;}
@keyframes coverDrop{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}
.cover-panel-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap;}
.cover-panel-head h3{font-family:var(--font-body,inherit);font-size:1.05rem;}
.cover-all{color:var(--dark);font-weight:800;text-decoration:none;white-space:nowrap;background:#fff;border:2px solid var(--dark);border-radius:999px;padding:4px 13px;font-size:0.78rem;}
.cover-all:hover{background:var(--dark);color:#fff;}
.cover-qlist{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;}
.cover-qlist li a{display:block;text-decoration:none;color:var(--dark);font-weight:700;font-size:0.9rem;padding:10px 14px;border-radius:10px;background:#fff;border:2px solid var(--dark);box-shadow:2px 2px 0 rgba(0,0,0,0.18);transition:transform .12s,box-shadow .12s;}
.cover-qlist li a:hover{transform:translate(-2px,-2px);box-shadow:4px 4px 0 var(--dark);}
@media(max-width:640px){.cover-qlist{grid-template-columns:1fr;}}
/* detail / legal pages */
.hero-legal{background:var(--dark);border-bottom:var(--border);text-align:center;padding:48px 24px;color:#fff;}
.hero-legal h1{font-family:var(--font-display);color:var(--yellow);font-size:2.6rem;margin-bottom:8px;line-height:1.05;}
.hero-legal p{font-size:0.88rem;opacity:0.82;max-width:520px;margin:0 auto;}
.legal-body{padding-top:26px;}
.legal-body h2{margin-top:34px;}
.legal-body ul{margin:0 0 18px 22px;}
.legal-body li{margin-bottom:8px;}
.legal-body a{color:var(--dark);text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:2px;}
.legal-body a:hover{color:var(--orange);}
.legal-updated{margin-top:38px;padding-top:16px;border-top:2px dashed #ddd;font-size:0.82rem;color:#666;}
.legal-nav{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px;}
.legal-nav a{font-size:0.8rem;font-weight:800;color:var(--dark);text-decoration:none;background:#fff;border:2px solid var(--dark);border-radius:999px;padding:5px 14px;}
.legal-nav a:hover{background:var(--yellow);}
.legal-nav a.active{background:var(--dark);color:#fff;}
/* footer: 4th column + sitewide disclosure line */
.footer-grid{grid-template-columns:1.5fr 1fr 1fr 1fr;}
@media(max-width:900px){.footer-grid{grid-template-columns:1fr 1fr;}}
@media(max-width:560px){.footer-grid{grid-template-columns:1fr;}}
.footer-disclosure{max-width:1200px;margin:34px auto 0;padding:0 24px;font-size:0.78rem;line-height:1.7;color:#777;}
.footer-disclosure a{color:#aaa;text-decoration:underline;}
.footer-disclosure a:hover{color:var(--yellow);}
.footer-bottom{margin-top:16px;}
@media(max-width:560px){.footer-bottom{flex-direction:column;gap:8px;text-align:center;}.footer-bottom-links a{margin:0 8px;}}
/* affiliate disclosure callout on /resources/ */
.disclosure-box{max-width:1200px;margin:28px auto -12px;padding:16px 20px;background:#fff8e6;border:var(--border);border-radius:var(--radius);box-shadow:var(--shadow);font-size:0.86rem;line-height:1.6;}
@media(max-width:1248px){.disclosure-box{margin-left:24px;margin-right:24px;}}
.disclosure-box a{color:var(--dark);text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:2px;}
.disclosure-box a:hover{color:var(--orange);}
/* 404 */
.notfound{text-align:center;padding:90px 20px 110px;}
.notfound .nf-emoji{font-size:5rem;margin-bottom:10px;}
.notfound h1{font-size:2.6rem;margin-bottom:12px;}
.notfound p{max-width:460px;margin:0 auto 26px;line-height:1.6;color:#444;}
.notfound .hero-btns{justify-content:center;}
`);
write('index.html', buildHome());
write('blog/index.html', buildBlogIndex());
data.blogPosts.forEach((_, i) => write(`blog/${SLUGS[i]}/index.html`, buildArticle(i)));
write('faq/index.html', buildFaq());
write('resources/index.html', buildResources());
LEGAL.forEach(l => write(`${l.slug}/index.html`, buildLegal(l)));
write('404.html', buildNotFound());

// sitemap + robots
const urls = ['/', '/blog/', '/faq/', '/resources/', ...LEGAL.map(l => `/${l.slug}/`), ...SLUGS.map(s => `/blog/${s}/`)];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE}${u}</loc><changefreq>monthly</changefreq></url>`).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *
Allow: /
Disallow: /build/

Sitemap: ${SITE}/sitemap.xml
`);
console.log('Done. ' + (urls.length) + ' pages + styles.css + sitemap + robots.');
