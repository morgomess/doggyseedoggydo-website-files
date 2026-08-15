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
  </div>
  <div class="footer-bottom">
    <span>&copy; 2026 Doggy See, Doggy Do. Made with <span style="color:var(--red)">❤️</span> for dog people.</span>
    <span class="footer-bottom-links"><a href="#">Privacy Policy</a><a href="#">Terms of Service</a></span>
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
write('404.html', buildNotFound());

// sitemap + robots
const urls = ['/', '/blog/', '/faq/', '/resources/', ...SLUGS.map(s => `/blog/${s}/`)];
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
