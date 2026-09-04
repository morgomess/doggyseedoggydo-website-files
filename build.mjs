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
const SOCIAL_LINKS = [
  {
    label: 'Instagram',
    url: 'https://www.instagram.com/doggysee.doggydo/',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>',
  },
];
const LEGAL_UPDATED = 'September 3, 2026';

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
  '3-3-3-decompression-guide-rescue-dogs',
  'fleas-ticks-late-summer-prevention-dogs',
  'how-to-stop-dog-jumping-on-guests',
  'how-to-teach-dog-to-stay-duration-distance-distraction',
];
const urlFor = i => `/blog/${SLUGS[i]}/`;
// display order: newest post first (by date), while keeping data index → SLUGS/postBodies aligned
const byDate = data.blogPosts.map((_, i) => i).sort((a, b) => new Date(data.blogPosts[b].date) - new Date(data.blogPosts[a].date));
const imgFor = p => '/images/' + p.ic.replace('blog-img-', '') + '.jpg';

const TOPIC_HUBS = [
  { slug: 'dog-health', label: 'Dog Health', icon: '🩺', color: '#FF3B3B', title: 'Dog Health & Wellness Guides', desc: 'Practical guides for spotting health changes, handling everyday care, and knowing when your dog needs veterinary help.', intro: 'Health advice is most useful when it helps you notice changes early and make a calm next-step decision. Start with the guides below, and contact your veterinarian whenever symptoms are severe, sudden, or worrying.', match: (post, slug) => ((post.tag === 'Health' || post.tag === 'Grooming') && !['dog-summer-safety-heat-pavement-cooling', 'fleas-ticks-late-summer-prevention-dogs', 'dog-road-trip-safety-car-travel-tips', 'back-to-school-dog-separation-anxiety-prep'].includes(slug)) || slug === 'how-much-exercise-does-your-dog-need-by-breed-and-age' },
  { slug: 'dog-nutrition', label: 'Dog Nutrition', icon: '🥗', color: '#4CAF50', title: 'Dog Food & Nutrition Guides', desc: 'Understand dog-food labels, compare feeding approaches, and make better-informed nutrition decisions with your veterinarian.', intro: 'There is no single perfect diet for every dog. These guides focus on reading labels, comparing evidence, and choosing food that is complete, balanced, practical, and appropriate for your individual dog.', match: post => post.tag === 'Nutrition' },
  { slug: 'dog-training-behavior', label: 'Training & Behavior', icon: '🎓', color: '#8B5CF6', title: 'Dog Training & Behavior Guides', desc: 'Positive, practical training plans for leash walking, recall, barking, reactivity, separation concerns, and everyday manners.', intro: 'Good training is clear, consistent, and humane. Work in small steps, reward the behavior you want, and choose the guide that matches the problem in front of you today.', match: post => post.tag === 'Training' },
  { slug: 'puppy-care', label: 'Puppy Care', icon: '🐶', color: '#FFD600', title: 'Puppy Care & Training Guides', desc: 'A practical starting point for puppy schedules, socialization, crate training, biting, potty training, and the first month home.', intro: 'Puppyhood moves quickly. Focus first on safety, predictable routines, gentle socialization, and short training sessions that make the right choice easy.', match: (post, slug) => post.tag === 'Puppies' || ['crate-training-101', 'how-to-teach-leave-it'].includes(slug) },
  { slug: 'senior-dogs', label: 'Senior Dogs', icon: '💛', color: '#FF9F1C', title: 'Senior Dog Care Guides', desc: 'Support an older dog’s comfort, mobility, health monitoring, enrichment, grooming, and changing daily needs.', intro: 'Aging is individual. Small changes in movement, appetite, sleep, behavior, or bathroom habits can matter, so pair thoughtful home care with regular veterinary checkups.', match: (post, slug) => post.tag === 'Seniors' || ['signs-your-dog-is-sick', 'how-much-exercise-does-your-dog-need-by-breed-and-age', 'how-to-trim-dog-nails-without-the-struggle', 'brushing-your-dogs-teeth'].includes(slug) },
  { slug: 'seasonal-dog-safety', label: 'Seasonal Safety', icon: '☀️', color: '#00B8D9', title: 'Seasonal Dog Safety Guides', desc: 'Prepare your dog for heat, parasites, travel, routine changes, and other seasonal risks before they become emergencies.', intro: 'Weather, travel, parasites, and household schedules all change through the year. These checklists help you plan ahead and reduce avoidable risks.', match: (post, slug) => ['dog-summer-safety-heat-pavement-cooling', 'fleas-ticks-late-summer-prevention-dogs', 'dog-road-trip-safety-car-travel-tips', 'back-to-school-dog-separation-anxiety-prep', 'essential-dog-gear-guide'].includes(slug) },
];
const topicUrl = topic => `/topics/${topic.slug}/`;
const topicPosts = topic => data.blogPosts.map((post, i) => ({ post, i, slug: SLUGS[i] })).filter(item => topic.match(item.post, item.slug));
const primaryTopicFor = (post, slug) => ['seasonal-dog-safety', 'puppy-care', 'senior-dogs', 'dog-nutrition', 'dog-training-behavior', 'dog-health']
  .map(topicSlug => TOPIC_HUBS.find(topic => topic.slug === topicSlug))
  .find(topic => topic.match(post, slug));

// ---------- 2. Shared helpers ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isoDate = d => { const t = new Date(d); return isNaN(t) ? '' : t.toISOString().slice(0, 10); };
// stable per-question anchor id, shared by the home cover cards and the FAQ page
const qSlug = t => 'q-' + t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const allFaqQs = data.faqData.flatMap(c => c.questions.map(q => q.q));
const findQ = t => { if (!allFaqQs.includes(t)) throw new Error('Cover question not found in faqData: ' + t); return t; };

const COVER_ICONS = {
  training: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13c0-4 3-7 7-7h2c4 0 7 3 7 7v3H4v-3Z"/><path d="M8 6 6 3M16 6l2-3M8 16v3M16 16v3"/><circle cx="9" cy="11" r="1"/><circle cx="15" cy="11" r="1"/></svg>',
  food: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16l-1 8H5l-1-8Z"/><path d="M7 10c.6-3 2.2-5 5-5s4.4 2 5 5"/><path d="M9 14h6"/></svg>',
  health: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20S4 16 4 10a4 4 0 0 1 7-2.6A4 4 0 0 1 18 10c0 6-6 10-6 10Z"/><path d="M8 12h2l1-2 2 5 1-3h2"/></svg>',
  grooming: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/><path d="m9 15 7-10M15 15 8 5"/></svg>',
  mental: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5a3 3 0 0 0-3 3v1a3 3 0 0 0-1 5 3 3 0 0 0 4 4h1V6a2 2 0 0 0-1-1ZM15 5a3 3 0 0 1 3 3v1a3 3 0 0 1 1 5 3 3 0 0 1-4 4h-1V6a2 2 0 0 1 1-1Z"/></svg>',
  stages: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="14" r="5"/><circle cx="6" cy="8" r="2"/><circle cx="10" cy="5" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="19" cy="8" r="2"/></svg>',
};
const BRAND_MARK = '<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="19" r="7"/><circle cx="7" cy="11" r="3"/><circle cx="13" cy="6" r="3"/><circle cx="21" cy="7" r="3"/><circle cx="26" cy="13" r="3"/></svg>';

const CLARITY = `<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "xhu42tzbp5");
</script>`;

const ORG_LD = `<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org', '@type': 'Organization', '@id': SITE + '/#organization',
  name: 'Doggy See, Doggy Do', url: SITE + '/', logo: SITE + '/favicon.svg',
  email: EMAIL, publishingPrinciples: SITE + '/editorial-standards/',
  correctionsPolicy: SITE + '/corrections/',
  sameAs: SOCIAL_LINKS.map(link => link.url),
})}</script>`;

const NAVLINKS = [
  { href: '/', key: 'home', label: 'Home' },
  { href: '/faq/', key: 'faq', label: 'How Do I...?' },
  { href: '/blog/', key: 'blog', label: 'Blog' },
  { href: '/resources/', key: 'resources', label: 'Resources' },
];

const SEARCH_INDEX = [
  ...data.faqData.flatMap(category => category.questions.map(item => ({
    type: 'answer', category: category.category, title: item.q, text: item.a,
    url: `/faq/#${qSlug(item.q)}`,
  }))),
  ...data.blogPosts.map((post, i) => ({
    type: 'guide', category: post.tag, title: post.title, text: post.excerpt,
    url: urlFor(i), meta: `${post.read} · ${post.date}`,
  })),
  ...TOPIC_HUBS.map(topic => ({
    type: 'guide', category: 'Topic hub', title: topic.title, text: topic.desc,
    url: topicUrl(topic), meta: `${topicPosts(topic).length} practical guides`,
  })),
];

const nav = active => `<nav class="nav">
  <div class="nav-inner">
    <a class="nav-logo" href="/">${BRAND_MARK}<span>Doggy See, Doggy Do</span></a>
    <ul class="nav-links">
      ${NAVLINKS.map(l => `<li><a href="${l.href}"${l.key === active ? ' class="active"' : ''}>${l.label}</a></li>`).join('\n      ')}
      <li><button type="button" class="nav-search" data-search-open aria-label="Search dog questions and guides"><span aria-hidden="true">⌕</span> Search</button></li>
    </ul>
    <button type="button" class="mobile-toggle" aria-label="Open navigation" aria-expanded="false" aria-controls="mobileMenu"><span aria-hidden="true">☰</span></button>
  </div>
</nav>
<div class="mobile-menu" id="mobileMenu">
  ${NAVLINKS.map(l => `<a href="${l.href}"${l.key === active ? ' class="active"' : ''}>${l.label}</a>`).join('\n  ')}
  <button type="button" class="mobile-search" data-search-open><span aria-hidden="true">⌕</span> Search</button>
</div>`;

const siteSearch = () => `<div class="site-search" id="siteSearch" role="dialog" aria-modal="true" aria-labelledby="siteSearchTitle" hidden>
  <button type="button" class="search-backdrop" data-search-close aria-label="Close search"></button>
  <div class="search-panel">
    <div class="search-head">
      <div><p class="search-eyebrow">Find the right answer</p><h2 id="siteSearchTitle">What does your dog need?</h2></div>
      <button type="button" class="search-close" data-search-close aria-label="Close search">×</button>
    </div>
    <form class="site-search-form" role="search">
      <label class="sr-only" for="siteSearchInput">Search dog questions and guides</label>
      <span aria-hidden="true">⌕</span>
      <input id="siteSearchInput" type="search" autocomplete="off" placeholder="Try “puppy biting” or “dog won’t eat”">
    </form>
    <p class="search-hint" id="searchHint">Search ${data.faqData.reduce((n, c) => n + c.questions.length, 0)} quick answers and ${data.blogPosts.length} deep-dive guides.</p>
    <div class="search-results" id="siteSearchResults" aria-live="polite"></div>
  </div>
</div>`;

const footer = () => `<footer class="footer">
  <div class="footer-grid">
    <div>
      <div class="footer-brand-name">${BRAND_MARK}<span>Doggy See, Doggy Do</span></div>
      <p class="footer-brand">Every question. Every stage. Every dog.</p>
      <div class="social-links" aria-label="Follow Doggy See, Doggy Do">${SOCIAL_LINKS.map(link => `<a href="${link.url}" target="_blank" rel="me noopener noreferrer" aria-label="Follow Doggy See, Doggy Do on ${link.label}">${link.icon}<span>${link.label}</span></a>`).join('')}</div>
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
        <li><a href="/topics/puppy-care/">Puppy Care</a></li>
        <li><a href="/topics/dog-nutrition/">Dog Nutrition</a></li>
        <li><a href="/topics/dog-training-behavior/">Training &amp; Behavior</a></li>
        <li><a href="/topics/dog-health/">Health &amp; Wellness</a></li>
      </ul>
    </div>
    <div>
      <h2 class="footer-h">The Details</h2>
      <ul>
        <li><a href="/about/">About</a></li>
        <li><a href="/editorial-standards/">Editorial Standards</a></li>
        <li><a href="/corrections/">Corrections</a></li>
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

function breadcrumbNav(items) {
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li>${items.map((item, i) => `<li>${i === items.length - 1 ? `<span aria-current="page">${esc(item.label)}</span>` : `<a href="${item.href}">${esc(item.label)}</a>`}</li>`).join('')}</ol></nav>`;
}

function page({ title, desc, canonical, active, content, jsonld = '', bodyJs = '', extraHead = '', breadcrumbs = [] }) {
  const breadcrumbLd = breadcrumbs.length ? `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [{ label: 'Home', href: '/' }, ...breadcrumbs].map((item, i) => ({
      '@type': 'ListItem', position: i + 1, name: item.label, item: SITE + item.href,
    })),
  })}</script>` : '';
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
${extraHead ? extraHead + '\n' : ''}${CLARITY}${ORG_LD}${jsonld ? '\n' + jsonld : ''}${breadcrumbLd}
</head>
<body>
${nav(active)}
${siteSearch()}
${breadcrumbs.length ? breadcrumbNav(breadcrumbs) : ''}
${content}
${footer()}
<script>
(function(){
  var button=document.querySelector('.mobile-toggle'),menu=document.getElementById('mobileMenu');
  if(!button||!menu)return;
  function setOpen(open){
    menu.classList.toggle('open',open);
    button.setAttribute('aria-expanded',String(open));
    button.setAttribute('aria-label',open?'Close navigation':'Open navigation');
    document.body.classList.toggle('menu-open',open);
  }
  button.addEventListener('click',function(){setOpen(button.getAttribute('aria-expanded')!=='true');});
  menu.addEventListener('click',function(event){if(event.target.closest('a'))setOpen(false);});
  document.addEventListener('keydown',function(event){if(event.key==='Escape'&&button.getAttribute('aria-expanded')==='true'){setOpen(false);button.focus();}});
  document.addEventListener('click',function(event){if(button.getAttribute('aria-expanded')==='true'&&!menu.contains(event.target)&&!button.contains(event.target))setOpen(false);});
})();
</script>
<script>
(function(){
  var dialog=document.getElementById('siteSearch'),input=document.getElementById('siteSearchInput'),results=document.getElementById('siteSearchResults'),hint=document.getElementById('searchHint');
  if(!dialog||!input||!results)return;
  var entries=null,loadPromise=null,previousFocus=null;
  function loadEntries(){
    if(entries)return Promise.resolve(entries);
    if(!loadPromise)loadPromise=fetch('/search-index.json',{credentials:'same-origin'}).then(function(response){if(!response.ok)throw new Error('Search index unavailable');return response.json();}).then(function(data){entries=data;return data;});
    return loadPromise;
  }
  function clean(value){return value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
  function escapeHtml(value){return String(value).replace(/[&<>\"]/g,function(char){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[char];});}
  function score(entry,query){
    var title=clean(entry.title),text=clean(entry.text),category=clean(entry.category),tokens=query.split(' ').filter(Boolean),score=0;
    if(title===query)score+=120; else if(title.indexOf(query)>-1)score+=70;
    if(text.indexOf(query)>-1)score+=25;
    tokens.forEach(function(token){if(title.indexOf(token)>-1)score+=18;if(category.indexOf(token)>-1)score+=8;if(text.indexOf(token)>-1)score+=3;});
    if(tokens.length&&tokens.every(function(token){return (title+' '+text+' '+category).indexOf(token)>-1;}))score+=20;
    return score;
  }
  function card(entry){return '<a class="search-result" href="'+escapeHtml(entry.url)+'"><span class="search-result-type">'+escapeHtml(entry.category)+'</span><strong>'+escapeHtml(entry.title)+'</strong><span>'+escapeHtml(entry.type==='guide'?(entry.meta||entry.text):entry.text)+'</span></a>';}
  function render(){
    var query=clean(input.value),url=new URL(window.location.href);
    if(input.value.trim())url.searchParams.set('q',input.value.trim());else url.searchParams.delete('q');
    history.replaceState(null,'',url.pathname+url.search+url.hash);
    if(!query){results.innerHTML='';hint.hidden=false;return;}
    hint.hidden=true;
    if(!entries){results.innerHTML='<div class="search-loading">Searching…</div>';return;}
    var ranked=entries.map(function(entry){return {entry:entry,score:score(entry,query)};}).filter(function(item){return item.score>0;}).sort(function(a,b){return b.score-a.score;});
    var answers=ranked.filter(function(item){return item.entry.type==='answer';}).slice(0,6),guides=ranked.filter(function(item){return item.entry.type==='guide';}).slice(0,6);
    if(!answers.length&&!guides.length){results.innerHTML='<div class="search-empty"><strong>No matches yet.</strong><p>Try fewer words, a symptom, or a behavior such as “barking.”</p><a href="/contact/">Tell us what answer is missing →</a></div>';return;}
    results.innerHTML=(answers.length?'<section><h3>Quick Answers <span>'+answers.length+'</span></h3><div class="search-result-grid">'+answers.map(function(item){return card(item.entry);}).join('')+'</div></section>':'')+(guides.length?'<section><h3>Deep-Dive Guides <span>'+guides.length+'</span></h3><div class="search-result-grid">'+guides.map(function(item){return card(item.entry);}).join('')+'</div></section>':'');
  }
  function openSearch(){
    previousFocus=document.activeElement;
    var mobileMenu=document.getElementById('mobileMenu'),mobileToggle=document.querySelector('.mobile-toggle');
    if(previousFocus&&previousFocus.closest&&previousFocus.closest('.mobile-menu'))previousFocus=mobileToggle;
    if(mobileMenu)mobileMenu.classList.remove('open');
    if(mobileToggle){mobileToggle.setAttribute('aria-expanded','false');mobileToggle.setAttribute('aria-label','Open navigation');}
    document.body.classList.remove('menu-open');dialog.hidden=false;document.body.classList.add('search-open');
    var query=new URL(window.location.href).searchParams.get('q')||'';input.value=query;render();
    loadEntries().then(render).catch(function(){hint.hidden=true;results.innerHTML='<div class="search-empty"><strong>Search is taking a break.</strong><p>Please try again, or browse the question library.</p><a href="/faq/">Browse all answers →</a></div>';});
    window.setTimeout(function(){input.focus();},0);
  }
  function closeSearch(){
    dialog.hidden=true;document.body.classList.remove('search-open');
    var url=new URL(window.location.href);url.searchParams.delete('q');history.replaceState(null,'',url.pathname+url.search+url.hash);
    if(previousFocus&&previousFocus.focus)previousFocus.focus();
  }
  document.querySelectorAll('[data-search-open]').forEach(function(button){button.addEventListener('click',openSearch);});
  document.querySelectorAll('[data-search-close]').forEach(function(button){button.addEventListener('click',closeSearch);});
  input.addEventListener('input',render);
  dialog.querySelector('form').addEventListener('submit',function(event){event.preventDefault();var first=results.querySelector('a');if(first)first.click();});
  document.addEventListener('keydown',function(event){
    if(event.key==='/'&&dialog.hidden&&!/input|textarea|select/i.test(document.activeElement.tagName)){event.preventDefault();openSearch();}
    if(event.key==='Escape'&&!dialog.hidden){event.preventDefault();closeSearch();}
    if(event.key==='Tab'&&!dialog.hidden){var focusable=[].slice.call(dialog.querySelectorAll('button:not([hidden]),input,a')).filter(function(el){return el.offsetParent!==null;});if(!focusable.length)return;var first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  });
  if(new URL(window.location.href).searchParams.get('q'))openSearch();
})();
</script>
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
    { title: 'Training &amp; Behavior', icon: COVER_ICONS.training, color: '#FFD23F', blurb: 'From sit to stay to stop eating my shoes.', all: '/faq/#faq-training',
      qs: ["How do I stop my dog from pulling on the leash?", "How do I stop my dog from jumping on people?", "How do I teach \"leave it\"?", "How do I stop my dog from barking at everything?", "How do I use positive reinforcement correctly?"] },
    { title: 'Food &amp; Diet', icon: COVER_ICONS.food, color: '#48B9F2', blurb: 'What&#39;s actually in that bag? We break it down.', all: '/faq/#faq-feeding',
      qs: ["How do I know how much to feed my dog?", "How do I switch my dog's food safely?", "How do I read a dog food label?", "How do I know if my dog is a healthy weight?", "How do I feed a raw diet safely?"] },
    { title: 'Health &amp; Vet Care', icon: COVER_ICONS.health, color: '#FF4D57', blurb: 'Know the signs before it becomes an emergency.', all: '/faq/#faq-health',
      qs: ["How do I know if my dog is sick?", "How do I know if my dog is in pain?", "How do I check my dog for ticks?", "How often does my dog need to go to the vet?", "How do I handle my dog's allergies?"] },
    { title: 'Grooming &amp; Hygiene', icon: COVER_ICONS.grooming, color: '#4BC58A', blurb: 'Yes, you do need to brush their teeth.', all: '/faq/#faq-grooming',
      qs: ["How do I cut my dog's nails safely?", "How do I bathe my dog at home?", "How do I deal with dog shedding?", "How do I brush a dog that hates being brushed?", "How often should I groom my dog?"] },
    { title: 'Mental Stimulation', icon: COVER_ICONS.mental, color: '#B88AE8', blurb: 'A bored dog is a destructive dog. Let&#39;s fix that.', all: '/faq/',
      qs: ["How do I stop my dog from barking at everything?", "How do I help my dog with anxiety?", "How do I get a puppy used to being alone?", "How do I keep a senior dog mentally stimulated?", "How do I socialize a puppy?"] },
    { title: 'Life Stages', icon: COVER_ICONS.stages, color: '#FF923D', blurb: 'Puppies, adults, seniors. Every phase covered.', all: '/faq/',
      qs: ["How do I set up a puppy schedule?", "How do I potty train a puppy?", "How do I know my dog is entering senior years?", "How do I adjust my senior dog's diet?", "How do I manage arthritis in my dog?"] },
  ];
  // card immediately followed by its (hidden) panel, all inside .cover-grid, so the dropdown opens directly under the row
  const coverItems = COVERS.map((c, i) => {
    const card = `<button type="button" class="card cover-card" style="--cover-color:${c.color}" data-cover="${i}" aria-expanded="false" aria-controls="cover-panel-${i}"><div class="cover-icon">${c.icon}</div><h3>${c.title}</h3><p>${c.blurb}</p><span class="cover-chev" aria-hidden="true">▾</span></button>`;
    const items = c.qs.map(t => `<li><a href="/faq/#${qSlug(findQ(t))}">${esc(t)}</a></li>`).join('');
    const panel = `<div class="cover-panel" id="cover-panel-${i}" data-panel="${i}" style="--c:${c.color}" hidden><div class="cover-panel-head"><h3>${c.title} questions</h3><a class="cover-all" href="${c.all}">See all &rarr;</a></div><ul class="cover-qlist">${items}</ul></div>`;
    return card + '\n        ' + panel;
  }).join('\n        ');
  const content = `<section class="hero-home">
    <div class="hero-home-inner">
      <div class="hero-copy">
        <div class="hero-badge"><span class="star" aria-hidden="true">✣</span> Practical advice for real-life dog people</div>
        <h1>Because Google<br>doesn't have a dog.</h1>
        <p>Straight answers on training, food, health, and puppies from people who have cleaned up the messes.</p>
        <form class="hero-search" role="search" action="/" method="get">
          <label class="sr-only" for="heroSearchInput">Search dog questions and guides</label>
          <span class="hero-search-icon" aria-hidden="true">⌕</span>
          <input id="heroSearchInput" name="q" type="search" autocomplete="off" placeholder="Ask anything: leash pulling, puppy food...">
          <button type="submit">Search</button>
        </form>
        <p class="hero-search-note">Search ${data.faqData.reduce((a, c) => a + c.questions.length, 0)} quick answers and ${data.blogPosts.length} deep-dive guides.</p>
      </div>
      <div class="hero-img-box"><img src="/images/hero.jpg" alt="A golden retriever and a border collie resting together in a sunny backyard" width="1600" height="800" fetchpriority="high" decoding="async"></div>
    </div>
  </section>

  <section class="section cover-section">
    <div class="container">
      <h2>What we cover</h2>
      <p class="sub">Tap a topic to see the real questions we answer, then jump straight to the answer.</p>
      <div class="cover-grid">
        ${coverItems}
      </div>
    </div>
  </section>

  <section class="stat-banner">
    <div class="container">
      <div class="stat-grid">
        <div class="stat-card"><div class="num">${data.faqData.reduce((a, c) => a + c.questions.length, 0)}+</div><p>Questions answered</p></div>
        <div class="stat-card"><div class="num">${data.blogPosts.length}</div><p>Deep-dive guides</p></div>
        <div class="stat-card"><div class="num">${data.resTraining.length + data.resHealth.length + data.resProducts.length}</div><p>Vetted resources</p></div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-header">
        <div><h2>Latest from the blog</h2><p class="sub">Fresh tips, practical guides, and dog-life lessons.</p></div>
        <a class="pill-btn" href="/blog/">View all posts →</a>
      </div>
      <div class="grid-3">${preview}</div>
    </div>
  </section>`;
  const jsonld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'WebSite', name: 'Doggy See, Doggy Do',
    url: SITE + '/', description: 'Straight answers to dog questions about training, nutrition, health, grooming, and senior care.'
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
    desc: 'Straight answers to dog questions about puppy training, nutrition, health, grooming, and senior care. Practical advice that works.',
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
  <nav class="topic-nav" aria-label="Browse dog advice by topic">
    <h2>Browse by topic</h2>
    <div>${TOPIC_HUBS.map(topic => `<a href="${topicUrl(topic)}"><span aria-hidden="true">${topic.icon}</span>${topic.label}</a>`).join('')}</div>
  </nav>
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
    breadcrumbs: [{ label: 'Blog', href: '/blog/' }],
  });
}

function buildTopicHub(topic) {
  const items = topicPosts(topic).sort((a, b) => new Date(b.post.date) - new Date(a.post.date));
  const content = `<section class="topic-hero" style="--topic-color:${topic.color}">
    <div class="topic-icon" aria-hidden="true">${topic.icon}</div>
    <p class="topic-kicker">Dog advice topic</p>
    <h1>${esc(topic.title)}</h1>
    <p>${esc(topic.desc)}</p>
  </section>
  <main class="topic-wrap">
    <p class="topic-intro">${esc(topic.intro)}</p>
    <div class="topic-summary"><strong>${items.length} guides</strong><span>Reviewed and organized by the Doggy See, Doggy Do Editorial Team</span></div>
    <div class="grid-3 topic-grid">${items.map(item => blogCard(item.i)).join('\n')}</div>
    <aside class="topic-help"><h2>Need a quicker answer?</h2><p>Search our short answers for common questions, or browse every deep-dive guide.</p><div><a class="pill-btn" href="/faq/">Browse quick answers</a><a class="pill-btn outline" href="/blog/">View all guides</a></div></aside>
  </main>`;
  const jsonld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: topic.title, description: topic.desc, url: SITE + topicUrl(topic),
    isPartOf: { '@type': 'Blog', url: SITE + '/blog/' },
    mainEntity: { '@type': 'ItemList', itemListElement: items.map((item, position) => ({
      '@type': 'ListItem', position: position + 1, url: SITE + urlFor(item.i), name: item.post.title,
    })) },
  })}</script>`;
  return page({
    title: `${topic.title} | Doggy See, Doggy Do`, desc: topic.desc,
    canonical: topicUrl(topic), active: 'blog', content, jsonld,
    breadcrumbs: [{ label: 'Blog', href: '/blog/' }, { label: topic.label, href: topicUrl(topic) }],
  });
}

const EVIDENCE_REVIEWED = 'September 3, 2026';
const ARTICLE_SOURCES = {
  'signs-your-dog-is-sick': [
    ['When to See a Veterinarian', 'Merck Veterinary Manual', 'https://www.merckvetmanual.com/multimedia/table/when-to-see-a-veterinarian'],
    ['Help! Is This a Pet Emergency?', 'American Animal Hospital Association', 'https://www.aaha.org/resources/help-is-this-a-pet-emergency/'],
    ['Recognizing Canine Respiratory Distress', 'Cornell University College of Veterinary Medicine', 'https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-topics/recognizing-and-responding-canine-respiratory-distress'],
  ],
  'raw-vs-kibble-vs-fresh-dog-food': [
    ['Raw Pet Food Diets Can Be Dangerous', 'U.S. Food and Drug Administration', 'https://www.fda.gov/animal-veterinary/animal-health-literacy/get-facts-raw-pet-food-diets-can-be-dangerous-you-and-your-pet'],
    ['Complete and Balanced Pet Food', 'U.S. Food and Drug Administration', 'https://www.fda.gov/animal-veterinary/animal-health-literacy/complete-and-balanced-pet-food'],
    ['Selecting the Right Pet Food', 'AAFCO', 'https://www.aafco.org/consumers/understanding-pet-food/selecting-the-right-pet-food'],
  ],
  'fleas-ticks-late-summer-prevention-dogs': [
    ['Preventing Ticks on Pets', 'U.S. Centers for Disease Control and Prevention', 'https://www.cdc.gov/ticks/prevention/preventing-ticks-on-pets.html'],
    ['Controlling Fleas and Ticks on Your Pet', 'U.S. Environmental Protection Agency', 'https://www.epa.gov/pets/controlling-fleas-and-ticks-your-pet'],
  ],
  'dog-summer-safety-heat-pavement-cooling': [
    ['Summer Heat Safety Tips for Dogs', 'Cornell University College of Veterinary Medicine', 'https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-topics/summer-heat-safety-tips-dogs'],
    ['What to Do in a Dog or Cat Emergency', 'Merck Veterinary Manual', 'https://www.merckvetmanual.com/special-pet-topics/emergencies/what-to-do-in-a-dog-or-cat-emergency'],
  ],
  'senior-dog-care-guide': [
    ['2023 AAHA Senior Care Guidelines for Dogs and Cats', 'American Animal Hospital Association', 'https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/'],
    ['Routine Health Care of Dogs', 'Merck Veterinary Manual', 'https://www.merckvetmanual.com/dog-owners/routine-care-of-dogs/routine-health-care-of-dogs'],
  ],
  'dog-food-label-decoder': [
    ['Reading Pet Food Labels', 'AAFCO', 'https://aafco.org/consumers/understanding-pet-food/reading-labels/'],
    ['Complete and Balanced Pet Food', 'U.S. Food and Drug Administration', 'https://www.fda.gov/animal-veterinary/animal-health-literacy/complete-and-balanced-pet-food'],
    ['Animal Food Labeling and Pet Food Claims', 'U.S. Food and Drug Administration', 'https://www.fda.gov/animal-veterinary/animal-foods-feeds/animal-food-labeling-and-pet-food-claims'],
  ],
};

const SEO_OVERRIDES = {
  'how-to-trim-dog-nails-without-the-struggle': {
    title: 'How to Trim Black Dog Nails Safely and Find the Quick',
    desc: 'Learn how to trim black dog nails safely, spot the quick from the cut surface, choose clippers or a grinder, and stop bleeding if you cut too far.',
  },
  'puppy-potty-training-no-drama-house-training-guide': {
    title: 'Apartment Puppy Potty Training: Schedule and Tips',
    desc: 'Use this apartment puppy potty-training schedule for elevators, shared spaces, no-yard homes, accidents, crate timing, and safe outdoor trips.',
  },
  'beat-dog-boredom': {
    title: 'Is My Dog Bored? Signs and 8 Easy Enrichment Ideas',
    desc: 'Learn the common signs of dog boredom, how it differs from separation anxiety, and eight indoor enrichment ideas that do not require expensive toys.',
  },
  'dog-separation-anxiety-guide': {
    title: 'Dog Separation Anxiety vs. Boredom: Signs and Solutions',
    desc: 'Compare dog separation anxiety with boredom, learn what a home camera can reveal, and build a gradual plan for calmer time alone.',
  },
  'how-to-stop-dog-jumping-on-guests': {
    title: 'How to Stop a Dog Jumping on Guests at the Door',
    desc: 'Use this practical front-door training plan to stop your dog jumping on guests, rehearse calm greetings, and manage exciting arrivals without yelling.',
  },
  '3-3-3-decompression-guide-rescue-dogs': {
    title: '3-3-3 Rule for Rescue Dogs: What to Expect',
  },
  'brushing-your-dogs-teeth': {
    title: 'How Often Should You Brush Your Dog\'s Teeth?',
    desc: 'Learn how often to brush your dog\'s teeth, which toothpaste and brush to use, how to build cooperation, and when professional dental care is needed.',
  },
  'how-to-stop-puppy-biting': {
    title: 'How to Stop Puppy Biting Hands, Clothes, and Legs',
  },
  'how-to-teach-dog-to-stay-duration-distance-distraction': {
    title: 'How to Teach a Dog to Stay: Duration, Distance, Distraction',
    desc: 'Teach your dog a reliable stay by building duration, distance, and distraction separately. Follow a clear progression and avoid the common setbacks.',
  },
  'dog-body-language-what-your-dog-is-telling-you': {
    title: 'Dog Body Language: Stress Signals and Warning Signs',
  },
  'how-to-train-a-reliable-recall': {
    desc: 'Build a reliable dog recall with high-value rewards, short practice sessions, and gradual distractions. Learn what to do when your dog ignores the cue.',
  },
  'fleas-ticks-late-summer-prevention-dogs': {
    title: 'Flea and Tick Prevention for Dogs in Late Summer',
    desc: 'Protect your dog from fleas and ticks with a simple prevention routine, post-walk checks, common warning signs, and veterinarian-approved products.',
  },
  'crate-training-101': {
    desc: 'Crate-train your dog with a gradual, reward-based plan for meals, naps, nighttime, whining, and comfortable time alone without using the crate as punishment.',
  },
  'raw-vs-kibble-vs-fresh-dog-food': {
    title: 'Raw vs. Kibble vs. Fresh Dog Food: Evidence and Safety',
    desc: 'Compare raw, kibble, and fresh dog food using safety, nutrition, cost, and convenience. Learn what complete and balanced means before choosing a diet.',
  },
  'positive-reinforcement-dog-training': {
    title: 'Positive Reinforcement Dog Training: Why It Works',
    desc: 'Learn why positive reinforcement dog training works, how rewards shape behavior, and why punishment can increase fear, stress, and unwanted behavior.',
  },
  'how-to-stop-dog-pulling-on-leash-loose-leash-walking': {
    desc: 'Stop leash pulling with a practical loose-leash walking plan. Learn the stop-and-go method, reward timing, equipment options, and distraction practice.',
  },
  'essential-dog-gear-guide': {
    desc: 'A practical dog gear checklist covering collars, harnesses, leashes, crates, bowls, beds, grooming tools, and which popular products you can skip.',
  },
  'dog-food-label-decoder': {
    desc: 'Learn how to read a dog food label, including ingredient lists, guaranteed analysis, feeding trials, nutritional adequacy statements, and marketing claims.',
  },
  'leash-reactive-dog-training-plan': {
    desc: 'Follow a four-week leash-reactivity training plan using distance, counterconditioning, trigger tracking, and calmer alternatives to barking and lunging.',
  },
  'back-to-school-dog-separation-anxiety-prep': {
    title: 'Back-to-School Dog Routine: Prevent Separation Anxiety',
  },
  'dog-road-trip-safety-car-travel-tips': {
    title: 'Dog Road Trip Safety: Carsickness and Long-Drive Tips',
  },
  'how-to-bathe-and-brush-your-dog-at-home': {
    title: 'How to Bathe and Brush Your Dog at Home',
  },
};

const ARTICLE_UPGRADES = {
  'how-to-trim-dog-nails-without-the-struggle': `<section class="search-intent-section"><h2>How to Trim Black Dog Nails Without Hitting the Quick</h2><p>Black nails hide the quick, so do not guess how far you can cut. Work from the tip in very thin slices. After each cut, look straight at the cross-section of the nail. The dry outer material will gradually give way to a smoother center. Stop when a darker central dot becomes visible or the center begins to look soft rather than chalky.</p><ol><li>Hold the paw securely without squeezing.</li><li>Trim one thin slice from the end at a time.</li><li>Check the cut surface after every slice.</li><li>Stop before the dark center becomes prominent.</li><li>Keep styptic powder within reach before you begin.</li></ol><p>A grinder removes less nail with each pass and may feel safer for dark nails, but some dogs dislike the sound or vibration. Clippers are faster. The best tool is the one your dog can calmly tolerate while you work slowly.</p></section>`,
  'puppy-potty-training-no-drama-house-training-guide': `<section class="search-intent-section"><h2>Apartment Puppy Potty Training Without a Yard</h2><p>Apartment potty training uses the same routine as house training, but elevators, stairs, hallways, and shared dog areas add delay. Keep the leash by the crate, carry a young puppy through the building when practical, and go directly to the same approved potty spot before greetings or play.</p><h3>A Simple Apartment Potty Schedule</h3><ul><li>Immediately after waking, eating, drinking heavily, training, and energetic play</li><li>Before entering the crate and immediately after leaving it</li><li>Every 30 to 60 minutes while a very young puppy is awake</li><li>Once or twice overnight at first, depending on age and individual needs</li></ul><p>If your puppy is not fully vaccinated, ask your veterinarian about local disease risk and safer outdoor locations. Avoid heavily trafficked dog areas until your veterinarian says they are appropriate. Indoor pads or a grass tray can be temporary management tools, but use one consistent location and transition deliberately if outdoor toileting is the long-term goal.</p></section>`,
  'beat-dog-boredom': `<section class="search-intent-section"><h2>Is Your Dog Bored or Experiencing Separation Anxiety?</h2><p>Boredom and separation anxiety can leave similar evidence, but the pattern is different. A bored dog may explore trash, chew available objects, or invent games while alone without showing panic. Separation-related distress often begins soon after departure and can include frantic exit-focused scratching, sustained vocalizing, drooling, pacing, or house-soiling in a reliably trained dog.</p><p>Record the first 30 to 45 minutes after you leave. If your dog settles after using a food toy, boredom is more likely. If distress escalates or the dog cannot eat, enrichment alone may not solve the problem. Start with our <a href="/blog/dog-separation-anxiety-guide/">dog separation anxiety guide</a> and speak with your veterinarian or a qualified behavior professional when panic is severe.</p></section>`,
  'how-to-stop-dog-jumping-on-guests': `<section class="search-intent-section"><h2>A Front-Door Plan for Calm Guest Greetings</h2><p>Do not make the first real guest your training session. Rehearse with one helper while your dog is on leash and the house is quiet.</p><ol><li>Set a mat several feet from the door and reward your dog for standing or settling there.</li><li>Have your helper knock once. If your dog leaves the mat, pause the arrival and reset.</li><li>Open the door only while four paws remain on the floor.</li><li>Let the guest enter without immediately touching or speaking to the dog.</li><li>Release your dog for a brief greeting, then guide them back to the mat before excitement climbs.</li></ol><p>Practice several short arrivals instead of one long visit. Consistency matters because jumping that earns attention even occasionally remains worth trying.</p></section>`,
};

const CONTEXTUAL_LINKS = {
  'beat-dog-boredom': [['Dog separation anxiety versus boredom', '/blog/dog-separation-anxiety-guide/'], ['Exercise needs by breed and age', '/blog/how-much-exercise-does-your-dog-need-by-breed-and-age/']],
  'brushing-your-dogs-teeth': [['Dog health and wellness guides', '/topics/dog-health/'], ['How to handle at-home grooming', '/blog/how-to-bathe-and-brush-your-dog-at-home/']],
  'crate-training-101': [['Crate training and puppy separation anxiety', '/blog/puppy-crate-training-separation-anxiety/'], ['The first 30 days with a puppy', '/blog/first-30-days-with-a-new-puppy/']],
  'dog-separation-anxiety-guide': [['Dog boredom signs and enrichment ideas', '/blog/beat-dog-boredom/'], ['Back-to-school separation-anxiety preparation', '/blog/back-to-school-dog-separation-anxiety-prep/']],
  'essential-dog-gear-guide': [['How to choose walking gear for leash pulling', '/blog/how-to-stop-dog-pulling-on-leash-loose-leash-walking/'], ['Seasonal dog safety guides', '/topics/seasonal-dog-safety/']],
  'first-30-days-with-a-new-puppy': [['Puppy potty-training schedule', '/blog/puppy-potty-training-no-drama-house-training-guide/'], ['Puppy socialization during the first 16 weeks', '/blog/puppy-socialization-guide-first-16-weeks/']],
  'how-to-stop-puppy-biting': [['Positive reinforcement training', '/blog/positive-reinforcement-dog-training/'], ['Puppy care and training guides', '/topics/puppy-care/']],
  'how-to-teach-leave-it': [['How to teach a reliable stay', '/blog/how-to-teach-dog-to-stay-duration-distance-distraction/'], ['Positive reinforcement training', '/blog/positive-reinforcement-dog-training/']],
  'how-to-train-a-reliable-recall': [['How to teach leave it', '/blog/how-to-teach-leave-it/'], ['Loose-leash walking guide', '/blog/how-to-stop-dog-pulling-on-leash-loose-leash-walking/']],
  'leash-reactive-dog-training-plan': [['Loose-leash walking guide', '/blog/how-to-stop-dog-pulling-on-leash-loose-leash-walking/'], ['Dog body-language warning signs', '/blog/dog-body-language-what-your-dog-is-telling-you/']],
  'positive-reinforcement-dog-training': [['Dog training and behavior guides', '/topics/dog-training-behavior/'], ['How to teach leave it', '/blog/how-to-teach-leave-it/']],
};

function buildArticle(i) {
  const p = data.blogPosts[i];
  const slug = SLUGS[i];
  const seo = SEO_OVERRIDES[slug] || {};
  const primaryTopic = primaryTopicFor(p, slug);
  const sources = ARTICLE_SOURCES[slug] || [];
  const body = data.postBodies[i] || '<p>This article is coming soon.</p>';
  const upgrade = ARTICLE_UPGRADES[slug] || '';
  const contextualLinks = CONTEXTUAL_LINKS[slug] || [];
  const linkBlock = contextualLinks.length ? `<section class="article-next"><h2>Keep building on this</h2><ul>${contextualLinks.map(link => `<li><a href="${link[1]}">${esc(link[0])}</a></li>`).join('')}</ul></section>` : '';
  const related = data.blogPosts.map((_, j) => j).filter(j => j !== i)
    .sort((a, b) => (data.blogPosts[b].tag === p.tag) - (data.blogPosts[a].tag === p.tag))
    .slice(0, 3).map(blogCard).join('\n');
  const content = `<div class="hero-article">
    <span class="badge article-badge" style="background:${p.tc};color:${p.tt};border-color:var(--dark)">${p.tag}</span>
    <img src="${imgFor(p)}" alt="${esc(p.title)}" width="1000" height="562" fetchpriority="high" decoding="async">
  </div>
  <div class="article-wrap">
    <a class="article-back" href="${primaryTopic ? topicUrl(primaryTopic) : '/blog/'}">← Back to ${primaryTopic ? primaryTopic.label : 'all posts'}</a>
    <div class="article-head">
      <h1>${esc(p.title)}</h1>
      <div class="article-meta"><span>${p.date}</span><span>•</span><span>${p.read}</span><span>•</span>${primaryTopic ? `<a href="${topicUrl(primaryTopic)}">${primaryTopic.label}</a>` : `<span>${p.tag}</span>`}</div>
      <div class="editorial-byline"><span class="editorial-mark" aria-hidden="true">🐾</span><span>By the <strong>Doggy See, Doggy Do Editorial Team</strong><br><a href="/editorial-standards/">How we research and review our content</a></span></div>
    </div>
    <div class="article-body">${body}${upgrade}${linkBlock}${sources.length ? `<aside class="evidence-note" aria-label="Editorial review note"><strong>Educational information, not veterinary advice.</strong> This guide was checked against the sources below on ${EVIDENCE_REVIEWED}. A source review is not the same as review by a veterinarian who has examined your dog.</aside><section class="article-sources" aria-labelledby="sources-title"><h2 id="sources-title">Sources &amp; further reading</h2><ol>${sources.map(source => `<li><a href="${source[2]}" target="_blank" rel="noopener">${esc(source[0])}</a><span>${esc(source[1])}</span></li>`).join('')}</ol><p>Sources support the core health, safety, or nutrition guidance in this article. <a href="/editorial-standards/">Read our editorial standards</a>.</p></section>` : ''}</div>
    <div class="article-related">
      <h2 class="related-h">Keep reading</h2>
      <div class="grid-3">${related}</div>
    </div>
  </div>`;
  const jsonld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: p.title, description: seo.desc || p.excerpt, image: SITE + imgFor(p),
    datePublished: isoDate(p.date), dateModified: isoDate(p.date),
    author: { '@id': SITE + '/#organization' },
    publisher: { '@id': SITE + '/#organization' },
    ...(sources.length ? { dateModified: isoDate(EVIDENCE_REVIEWED), citation: sources.map(source => source[2]) } : {}),
    mainEntityOfPage: SITE + urlFor(i),
  })}</script>`;
  return page({
    title: seo.title || p.title,
    desc: seo.desc || p.excerpt, canonical: urlFor(i), active: 'blog', content, jsonld,
    extraHead: `<link rel="preload" as="image" href="${imgFor(p)}" fetchpriority="high">`,
    breadcrumbs: [{ label: 'Blog', href: '/blog/' }, ...(primaryTopic ? [{ label: primaryTopic.label, href: topicUrl(primaryTopic) }] : []), { label: p.title, href: urlFor(i) }],
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
    breadcrumbs: [{ label: 'How Do I...?', href: '/faq/' }],
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
    breadcrumbs: [{ label: 'Resources', href: '/resources/' }],
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
    title: 'About Doggy See, Doggy Do | How We Publish',
    desc: 'Why Doggy See, Doggy Do exists, how our faceless editorial brand publishes dog care content, and where our limits are.',
    h1: 'About This Site',
    kicker: 'Straight answers for dog people, without the gatekeeping.',
    body: `<p class="lead">Doggy See, Doggy Do exists because getting a straight answer about your dog online is unreasonably hard. Every search turns into ten tabs, four contradictory opinions, and a forum thread from 2011. We wanted one place where the answer is just there.</p>

<h2>Who publishes this site</h2>
<p>Doggy See, Doggy Do is a faceless editorial brand. We keep the focus on useful answers rather than personalities, and we do not use invented expert profiles or borrowed credentials. We are not veterinarians and we do not pretend to be. Our responsibility is to make our process visible: what sources we use, where our limits are, and how we correct the record.</p>

<h2>How the content gets made</h2>
<ul>
<li>We start from published veterinary and professional training guidance, not from forum consensus.</li>
<li>We write for the average healthy dog and say so when a situation falls outside that.</li>
<li>We do not diagnose, and we never tell you to override your own veterinarian.</li>
<li>Every article carries a publication date so you can judge how current it is.</li>
<li>When we get something wrong and find out, we fix it rather than quietly leaving it up.</li>
</ul>
<p>Read the complete <a href="/editorial-standards/">Editorial Standards</a> and <a href="/corrections/">Corrections Policy</a>.</p>

<h2>What we will not do</h2>
<p>We will not tell you your dog has a specific condition. We will not talk you out of a vet visit. We will not recommend a product because someone paid us to, and we will not leave a recommendation up once we stop believing in it. If a company wants coverage here, the answer is that coverage is not for sale.</p>

<h2>How the site pays for itself</h2>
<p>Some links here are or will become affiliate links, meaning we may earn a commission when you buy through them, at no extra cost to you. The full explanation is on our <a href="/affiliate-disclosure/">Affiliate Disclosure</a> page, and it is worth two minutes of your time.</p>

<h2>Say hello</h2>
<p>Questions, corrections, and "you got this wrong" emails are all welcome at ${mail}. Corrections especially.</p>`,
  },
  {
    slug: 'editorial-standards',
    label: 'Editorial Standards',
    title: 'Editorial Standards | Doggy See, Doggy Do',
    desc: 'How the Doggy See, Doggy Do editorial team researches, writes, reviews, updates, and labels dog care content.',
    h1: 'Editorial Standards',
    kicker: 'The process behind every answer, without fake experts or mystery claims.',
    body: `<p class="lead">Doggy See, Doggy Do is a faceless editorial brand. That makes transparency about our process more important, not less. These standards explain how we choose topics, evaluate evidence, write recommendations, and handle the limits of general dog-care information.</p>

<h2>Who writes the content</h2>
<p>Articles are published by the Doggy See, Doggy Do Editorial Team. We do not attach invented biographies, stock-photo experts, or qualifications we do not hold. An editorial-team byline means the work represents this site's process and standards; it does not imply veterinary review.</p>

<h2>Our source hierarchy</h2>
<p>We prefer the most direct and authoritative source available for a claim. Depending on the topic, that includes peer-reviewed research, veterinary schools, government agencies, veterinary professional associations, credentialed veterinary behaviorists, and established animal-welfare organizations. We use commercial sources for product specifications, not as the sole authority for health or safety claims.</p>

<h2>How an article is made</h2>
<ol>
<li><strong>Define the question.</strong> We identify what a dog owner is trying to decide or do.</li>
<li><strong>Check the evidence.</strong> We compare current authoritative guidance and look for meaningful disagreement or limitations.</li>
<li><strong>Write for action.</strong> We translate the evidence into practical steps without presenting general information as a diagnosis.</li>
<li><strong>Check the boundaries.</strong> Health, nutrition, safety, aggression, and severe-anxiety content must identify when professional help is appropriate.</li>
<li><strong>Publish with context.</strong> Articles show a publication date, topic, scope, and links to these standards.</li>
</ol>

<h2>Health and veterinary content</h2>
<p>Our health content is educational. It cannot diagnose, examine, prescribe for, or establish a veterinarian-client-patient relationship with your dog. We distinguish routine care from warning signs and direct readers to a veterinarian when an individual assessment is needed. We never use “medically reviewed” or “vet reviewed” unless a real, appropriately qualified reviewer has reviewed that specific page.</p>

<h2>Training and behavior content</h2>
<p>We favor humane, evidence-informed training and management. We do not present punishment or fear as shortcuts. Aggression, sudden behavioral change, severe anxiety, and behavior that may be driven by pain should involve a qualified professional and, where appropriate, a veterinarian.</p>

<h2>Products, affiliates, and commercial influence</h2>
<p>Commercial relationships do not determine coverage or conclusions. Affiliate links are disclosed, sponsored material must be labeled before the content begins, and a company cannot buy a positive editorial recommendation. Our full commercial policy is in the <a href="/affiliate-disclosure/">Affiliate Disclosure</a>.</p>

<h2>Dates, updates, and corrections</h2>
<p>Publication dates show when an article first appeared. When a substantive review changes or revalidates the guidance, we add an updated date. Material errors are corrected and disclosed according to our <a href="/corrections/">Corrections Policy</a>.</p>

<h2>Contact the editorial team</h2>
<p>Questions about a source, claim, recommendation, or possible error can be sent to ${mail}. Include the page URL and the passage you are asking about so we can investigate it efficiently.</p>`,
  },
  {
    slug: 'corrections',
    label: 'Corrections',
    title: 'Corrections Policy | Doggy See, Doggy Do',
    desc: 'How to report an error and how Doggy See, Doggy Do investigates, corrects, and discloses changes to published content.',
    h1: 'Corrections Policy',
    kicker: 'If the record is wrong, we fix the record.',
    body: `<p class="lead">Accuracy matters more than defending old copy. We welcome specific correction requests and review them against the strongest available evidence.</p>

<h2>How to report an error</h2>
<p>Email ${mail} with the subject line “Correction.” Include the page URL, the statement you believe is wrong, why it is wrong, and any authoritative source that supports the correction. You do not need to be an expert to flag a problem.</p>

<h2>What happens next</h2>
<ol>
<li>We locate the original claim and the source or reasoning behind it.</li>
<li>We compare the request with current authoritative evidence.</li>
<li>We correct the page when the evidence supports a change.</li>
<li>For material corrections, we add a dated correction note explaining what changed.</li>
</ol>

<h2>Material versus minor changes</h2>
<p>A material correction changes the meaning of health, safety, nutrition, behavior, product, or factual guidance. Material corrections receive a visible note on the affected page. Spelling, grammar, formatting, link repairs, and wording changes that do not alter meaning may be fixed without a correction note.</p>

<h2>Updates are not corrections</h2>
<p>Guidance can change even when the original article was accurate at publication. Substantive refreshes receive an updated date. If the earlier guidance was materially wrong, we label the change as a correction as well as an update.</p>

<h2>Disagreements and unresolved evidence</h2>
<p>Not every disagreement proves an error. When reputable sources conflict, we aim to describe the uncertainty rather than manufacture a single confident answer. We may decline a requested change when the evidence does not support it, but we will reassess when better evidence becomes available.</p>

<h2>Corrections log</h2>
<p>No material corrections are currently recorded. Future material corrections will be listed here and on the affected article.</p>`,
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
    breadcrumbs: [{ label: l.label, href: `/${l.slug}/` }],
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
write('search-index.json', JSON.stringify(SEARCH_INDEX));
write('styles.css', data.css.trim() + '\n' + `
/* --- generated: link/element resets so nav/cards/buttons work as real <a> --- */
a.nav-logo{text-decoration:none;color:inherit;cursor:pointer;}
a.blog-card{text-decoration:none;color:inherit;}
a.pill-btn{text-decoration:none;display:inline-flex;align-items:center;justify-content:center;}
a.article-back{text-decoration:none;display:inline-block;}
.mobile-toggle{align-items:center;justify-content:center;width:44px;height:44px;border-radius:8px;line-height:1;}
.mobile-toggle:focus-visible,.nav-links a:focus-visible,.mobile-menu a:focus-visible,.nav-search:focus-visible,.mobile-search:focus-visible,.search-close:focus-visible,.site-search-form:focus-within,.search-result:focus-visible{outline:3px solid var(--dark);outline-offset:3px;}
body.menu-open{overflow:hidden;}
.footer li a{display:inline-flex;align-items:center;min-height:44px;padding:4px 0;}
.breadcrumbs{max-width:1200px;margin:0 auto;padding:11px 24px 10px;font-size:.76rem;color:#666;}
.breadcrumbs ol{display:flex;align-items:center;gap:8px;list-style:none;min-width:0;}
.breadcrumbs li{display:flex;align-items:center;min-width:0;}
.breadcrumbs li+li::before{content:'›';margin-right:8px;color:var(--orange);font-weight:900;}
.breadcrumbs a{font-weight:800;text-decoration:underline;text-decoration-thickness:1.5px;text-underline-offset:2px;}
.breadcrumbs a:hover{color:var(--orange);}
.breadcrumbs [aria-current="page"]{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
@media(max-width:640px){.breadcrumbs{padding:9px 16px 8px;}.breadcrumbs li:last-child{overflow:hidden;}.breadcrumbs li:not(:first-child):not(:last-child){display:none;}.breadcrumbs li:last-child::before{content:'›';}}
.nav-search,.mobile-search{border:0;background:transparent;font:inherit;font-weight:800;color:inherit;cursor:pointer;}
.nav-search{padding:5px 12px;border-radius:999px;font-size:.85rem;}
.nav-search:hover{background:rgba(0,0,0,.06);}
.mobile-search{font-size:1.2rem;padding:10px 24px;border-radius:999px;}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
.site-search[hidden]{display:none;}
.site-search{position:fixed;inset:0;z-index:2000;display:grid;place-items:start center;padding:7vh 20px 20px;}
.search-backdrop{position:absolute;inset:0;width:100%;height:100%;border:0;background:rgba(26,26,26,.72);cursor:pointer;}
.search-panel{position:relative;width:min(820px,100%);max-height:86vh;overflow:auto;background:var(--offwhite);border:var(--border);border-radius:18px;box-shadow:8px 8px 0 var(--dark);padding:28px;}
.search-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:18px;}
.search-head h2{font-size:2rem;line-height:1.05;}
.search-eyebrow{text-transform:uppercase;letter-spacing:.12em;color:var(--orange);font-size:.72rem;font-weight:900;margin-bottom:4px;}
.search-close{flex:0 0 44px;width:44px;height:44px;border:var(--border);border-radius:50%;background:#fff;font-size:1.7rem;font-weight:800;line-height:1;cursor:pointer;}
.site-search-form{display:flex;align-items:center;gap:10px;background:#fff;border:var(--border);border-radius:999px;box-shadow:var(--shadow);padding:0 18px;}
.site-search-form>span{font-size:1.3rem;font-weight:900;}
.site-search-form input{width:100%;min-width:0;border:0;outline:0;background:transparent;padding:14px 0;font:inherit;font-size:1rem;color:var(--dark);}
.search-hint{font-size:.82rem;color:#666;margin:14px 4px 2px;}
.search-results section{margin-top:24px;}
.search-results h3{font-family:var(--font-body);font-size:.86rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;}
.search-results h3 span{display:inline-grid;place-items:center;min-width:23px;height:23px;margin-left:5px;background:var(--yellow);border:2px solid var(--dark);border-radius:50%;font-size:.7rem;}
.search-result-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.search-result{display:flex;flex-direction:column;gap:3px;background:#fff;border:2px solid var(--dark);border-radius:10px;padding:13px 14px;transition:transform .12s,box-shadow .12s;}
.search-result:hover{transform:translate(-2px,-2px);box-shadow:3px 3px 0 var(--dark);}
.search-result-type{color:var(--orange);font-size:.68rem;font-weight:900;text-transform:uppercase;letter-spacing:.06em;}
.search-result strong{font-size:.93rem;line-height:1.35;}
.search-result>span:last-child{color:#666;font-size:.76rem;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.search-empty{text-align:center;padding:40px 16px 20px;}
.search-loading{text-align:center;padding:40px 16px;color:#666;font-weight:800;}
.search-empty strong{font-family:var(--font-display);font-size:1.8rem;}
.search-empty p{color:#666;margin:4px 0 14px;}
.search-empty a{font-weight:900;text-decoration:underline;text-decoration-thickness:2px;}
body.search-open{overflow:hidden;}
@media(max-width:640px){.site-search{padding:0;}.search-panel{width:100%;height:100%;max-height:none;border:0;border-radius:0;box-shadow:none;padding:20px 16px;}.search-head h2{font-size:1.65rem;}.search-result-grid{grid-template-columns:1fr;}.site-search-form input{font-size:16px;}.search-results section{margin-top:20px;}}
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
.legal-body ol{margin:0 0 18px 22px;}
.legal-body li{margin-bottom:8px;}
.legal-body a{color:var(--dark);text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:2px;}
.legal-body a:hover{color:var(--orange);}
.legal-updated{margin-top:38px;padding-top:16px;border-top:2px dashed #ddd;font-size:0.82rem;color:#666;}
.legal-nav{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px;}
.legal-nav a{font-size:0.8rem;font-weight:800;color:var(--dark);text-decoration:none;background:#fff;border:2px solid var(--dark);border-radius:999px;padding:5px 14px;}
.legal-nav a:hover{background:var(--yellow);}
.legal-nav a.active{background:var(--dark);color:#fff;}
.editorial-byline{display:flex;align-items:center;gap:10px;margin-top:18px;padding:12px 14px;background:#fff;border:2px solid var(--dark);border-radius:10px;font-size:.8rem;line-height:1.45;}
.editorial-mark{display:grid;place-items:center;flex:0 0 38px;width:38px;height:38px;background:var(--yellow);border:2px solid var(--dark);border-radius:50%;}
.editorial-byline a{font-weight:800;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:2px;}
.evidence-note{margin:34px 0 28px;padding:18px 20px;background:#fff8e6;border:var(--border);border-left:8px solid var(--orange);border-radius:var(--radius);font-size:.86rem;line-height:1.6;}
.evidence-note strong{display:block;margin-bottom:3px;}
.article-sources{margin-top:30px;padding-top:26px;border-top:3px solid var(--dark);}
.article-sources h2{margin-top:0;}
.article-sources ol{margin:0 0 14px 22px;}
.article-sources li{padding:7px 0;}
.article-sources li a{font-weight:800;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:2px;}
.article-sources li span{display:block;color:#666;font-size:.8rem;}
.article-sources>p{font-size:.8rem;color:#666;}
.search-intent-section{margin:34px 0 26px;padding:24px;background:#fff8e6;border:var(--border);border-radius:var(--radius);box-shadow:var(--shadow);}
.search-intent-section h2{margin-top:0;}
.search-intent-section h3{margin-top:20px;}
.search-intent-section ul,.search-intent-section ol{margin:0 0 16px 22px;}
.search-intent-section li{margin-bottom:8px;line-height:1.6;}
.article-next{margin:34px 0 10px;padding:20px 22px;background:#fff;border:var(--border);border-left:8px solid var(--blue);border-radius:var(--radius);}
.article-next h2{margin-top:0;font-size:1.2rem;}
.article-next ul{margin:8px 0 0 20px;}
.article-next li{margin:7px 0;}
.article-next a{font-weight:900;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:2px;}
.article-next a:hover{color:var(--orange);}
/* crawlable topic hubs */
.topic-nav{max-width:1200px;margin:30px auto 4px;padding:0 24px;}
.topic-nav h2{text-align:center;font-size:1.35rem;margin-bottom:14px;}
.topic-nav>div{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;}
.topic-nav a{display:inline-flex;align-items:center;gap:7px;min-height:44px;padding:8px 14px;background:#fff;border:2px solid var(--dark);border-radius:999px;box-shadow:2px 2px 0 var(--dark);font-size:.82rem;font-weight:900;text-decoration:none;transition:transform .12s,box-shadow .12s;}
.topic-nav a:hover{transform:translate(-2px,-2px);box-shadow:4px 4px 0 var(--dark);background:var(--yellow);}
.topic-hero{text-align:center;padding:58px 24px 62px;background:color-mix(in srgb,var(--topic-color) 28%,var(--offwhite));border-bottom:var(--border);}
.topic-icon{display:grid;place-items:center;width:74px;height:74px;margin:0 auto 14px;background:#fff;border:var(--border);border-radius:50%;box-shadow:var(--shadow);font-size:2.3rem;}
.topic-kicker{text-transform:uppercase;letter-spacing:.14em;font-size:.72rem;font-weight:900;margin-bottom:6px;}
.topic-hero h1{font-size:clamp(2.4rem,6vw,4.6rem);line-height:1;margin-bottom:14px;}
.topic-hero>p:last-child{max-width:690px;margin:0 auto;font-size:1rem;line-height:1.65;}
.topic-wrap{max-width:1200px;margin:0 auto;padding:42px 24px 72px;}
.topic-intro{max-width:800px;margin:0 auto 24px;text-align:center;font-size:1.04rem;line-height:1.75;}
.topic-summary{display:flex;justify-content:center;align-items:center;gap:12px 22px;flex-wrap:wrap;margin:0 auto 30px;color:#666;font-size:.82rem;}
.topic-summary strong{color:var(--dark);background:var(--yellow);border:2px solid var(--dark);border-radius:999px;padding:5px 12px;}
.topic-grid{margin-top:8px;}
.topic-help{margin-top:48px;padding:30px;background:var(--dark);color:#fff;border-radius:var(--radius);box-shadow:var(--shadow);text-align:center;}
.topic-help h2{color:var(--yellow);font-size:1.8rem;margin-bottom:6px;}
.topic-help p{margin-bottom:18px;color:#ddd;}
.topic-help>div{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;}
.article-meta a{font-weight:900;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:2px;}
@media(max-width:640px){.topic-nav{padding:0 16px;}.topic-nav>div{display:grid;grid-template-columns:1fr 1fr;}.topic-nav a{justify-content:center;text-align:center;padding:7px 9px;font-size:.74rem;}.topic-hero{padding:42px 18px 46px;}.topic-wrap{padding:32px 16px 54px;}.topic-help{padding:24px 18px;}}
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
/* 2026 homepage refresh: preserve the comic identity with calmer surfaces and clearer hierarchy */
.nav{background:#fffdf5;border-bottom:4px solid var(--dark);box-shadow:none;}
.nav-logo{gap:9px;font-size:1.2rem;letter-spacing:.7px;text-transform:uppercase;}
.brand-mark{display:block;flex:0 0 28px;width:28px;height:28px;fill:none;stroke:var(--blue);stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;}
.footer-brand-name{display:flex;align-items:center;gap:9px;}
.footer-brand-name .brand-mark{stroke:var(--yellow);}
.social-links{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px;}
.social-links a{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:7px 13px;color:#fff;border:2px solid #fff;border-radius:999px;font-size:.8rem;font-weight:900;transition:color .15s,background .15s,transform .15s;}
.social-links a:hover{color:var(--dark);background:var(--yellow);transform:translateY(-2px);}
.social-links a:focus-visible{outline:3px solid var(--yellow);outline-offset:3px;}
.social-links svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.hero-home{background:#fffdf5;border-bottom:0;isolation:isolate;}
.hero-home::before{inset:0 auto auto 0;width:68%;height:100%;opacity:1;background:var(--yellow);clip-path:polygon(0 0,94% 0,79% 100%,0 88%);z-index:-1;}
.hero-home-inner{padding:70px 24px 58px;grid-template-columns:minmax(0,1.1fr) minmax(360px,.9fr);gap:52px;align-items:center;}
.hero-copy{min-width:0;}
.hero-badge{background:#fff;color:var(--dark);border:var(--border);box-shadow:2px 2px 0 var(--dark);padding:7px 14px;margin-bottom:22px;text-transform:uppercase;letter-spacing:.045em;}
.hero-badge .star{color:var(--blue);font-size:1rem;}
.hero-home h1{font-size:clamp(3.8rem,7.1vw,6.7rem);line-height:.9;letter-spacing:1.5px;max-width:780px;margin-bottom:24px;}
.hero-home .hero-copy>p:not(.hero-search-note){max-width:650px;margin-bottom:28px;font-size:clamp(1rem,1.4vw,1.2rem);line-height:1.55;font-weight:600;}
.hero-search{display:flex;align-items:center;width:min(680px,100%);min-height:60px;padding:0 7px 0 18px;background:#fff;border:4px solid var(--dark);border-radius:999px;box-shadow:4px 4px 0 var(--dark);}
.hero-search-icon{flex:0 0 auto;font-family:Arial,sans-serif;font-size:2rem;font-weight:900;line-height:1;transform:rotate(-12deg);}
.hero-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;padding:14px 12px;font:inherit;font-size:1rem;color:var(--dark);}
.hero-search button{flex:0 0 auto;border:2px solid var(--dark);border-radius:999px;background:var(--yellow);padding:9px 18px;font:inherit;font-size:.8rem;font-weight:900;cursor:pointer;}
.hero-search button:hover{background:var(--blue);}
.hero-search:focus-within{outline:3px solid var(--blue);outline-offset:4px;}
.hero-search-note{max-width:none!important;margin:10px 4px 0!important;font-size:.82rem!important;color:#555;}
.hero-img-box{min-height:370px;border-width:3px;border-radius:18px;box-shadow:7px 7px 0 var(--dark);transform:rotate(.5deg);}
.hero-img-box img{min-height:370px;}
.cover-section{padding-top:66px;background:#fffdf5;}
.cover-section h2,.section-header h2{font-family:var(--font-body);font-weight:900;letter-spacing:-.035em;}
.cover-section h2{font-size:2.3rem;}
.cover-section .sub{font-size:.94rem;margin-bottom:34px;}
.cover-grid{gap:20px;}
.cover-card{min-height:190px;padding:25px 22px;background:var(--cover-color);border-width:3px;box-shadow:5px 5px 0 var(--dark);}
.cover-card:hover{transform:translate(-3px,-3px);box-shadow:8px 8px 0 var(--dark);}
.cover-icon{width:46px;height:46px;background:#fff;border-width:2.5px;border-radius:50%;box-shadow:2px 2px 0 var(--dark);}
.cover-icon svg{width:25px;height:25px;fill:none;stroke:var(--dark);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}
.cover-card h3{font-size:1.06rem;font-weight:900;}
.cover-card p{color:var(--dark);font-weight:700;}
.cover-card .cover-chev{opacity:.65;}
.stat-banner{background:var(--yellow);padding:34px 0;border-width:3px;}
.stat-grid{max-width:900px;gap:0;}
.stat-card{background:transparent;border:0;border-radius:0;box-shadow:none;padding:8px 22px;}
.stat-card+.stat-card{border-left:2px solid rgba(26,26,26,.28);}
.stat-card .num{font-size:2.7rem;}
.stat-card p{color:var(--dark);text-transform:uppercase;letter-spacing:.06em;font-size:.72rem;}
@media(max-width:900px){
  .hero-home::before{width:100%;height:64%;clip-path:polygon(0 0,100% 0,100% 82%,62% 100%,0 91%);}
  .hero-home-inner{grid-template-columns:1fr;padding-top:54px;gap:42px;}
  .hero-copy{text-align:left;}
  .hero-home h1{font-size:clamp(3.4rem,12vw,5.8rem);}
  .hero-home .hero-copy>p:not(.hero-search-note){margin-left:0;margin-right:0;}
  .hero-img-box{width:100%;min-height:300px;transform:none;}
  .hero-img-box img{min-height:300px;}
}
@media(max-width:640px){
  .nav{padding:0 16px;}
  .nav-logo{font-size:1.02rem;}
  .brand-mark{width:25px;height:25px;flex-basis:25px;}
  .hero-home::before{height:68%;}
  .hero-home-inner{padding:42px 16px 42px;gap:34px;text-align:left;}
  .hero-badge{font-size:.66rem;padding:6px 10px;margin-bottom:18px;}
  .hero-home h1{font-size:clamp(3.25rem,16.5vw,4.7rem);margin-bottom:20px;}
  .hero-home .hero-copy>p:not(.hero-search-note){font-size:1rem;margin-bottom:22px;}
  .hero-search{min-height:56px;padding-left:14px;border-width:3px;}
  .hero-search input{font-size:16px;padding-left:9px;}
  .hero-search button{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
  .hero-search-note{font-size:.75rem!important;}
  .hero-img-box,.hero-img-box img{min-height:230px;}
  .cover-section{padding-top:50px;}
  .cover-grid{grid-template-columns:1fr 1fr;gap:14px;}
  .cover-card{min-height:180px;padding:19px 15px;}
  .cover-panel{grid-column:1/-1;}
  .cover-card h3{font-size:.92rem;line-height:1.25;}
  .cover-card p{font-size:.75rem;}
  .stat-grid{grid-template-columns:repeat(3,1fr);padding:0 8px;}
  .stat-card{padding:6px 8px;}
  .stat-card .num{font-size:2rem;}
  .stat-card p{font-size:.58rem;line-height:1.35;}
}
`);
write('index.html', buildHome());
write('blog/index.html', buildBlogIndex());
TOPIC_HUBS.forEach(topic => write(`topics/${topic.slug}/index.html`, buildTopicHub(topic)));
data.blogPosts.forEach((_, i) => write(`blog/${SLUGS[i]}/index.html`, buildArticle(i)));
write('faq/index.html', buildFaq());
write('resources/index.html', buildResources());
LEGAL.forEach(l => write(`${l.slug}/index.html`, buildLegal(l)));
write('404.html', buildNotFound());

// sitemap + robots
const urls = ['/', '/blog/', '/faq/', '/resources/', ...TOPIC_HUBS.map(topicUrl), ...LEGAL.map(l => `/${l.slug}/`), ...SLUGS.map(s => `/blog/${s}/`)];
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
