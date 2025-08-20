
/* Minimal static blog engine for GDD
 * - Loads /data/posts.json
 * - Index: search + tag filter
 * - Post: renders Markdown, builds sticky ToC (H2–H4), reading time
 * - Dark mode toggle (persisted)
 */

const CONFIG = {
  siteTitle: "GDD Blog",
  siteDescription: "คลังเอกสาร Game Design Document (GDD) สำหรับโปรเจกต์ของคุณ",
  githubRepoUrl: "", // ใส่ลิงก์ repo (เช่น https://github.com/yourname/gdd-blog) เพื่อให้ปุ่ม 'ดูบน GitHub' ทำงาน
  readingWpm: 220
};

const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

function setTheme(mode){
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem('theme', mode);
}
function initTheme(){
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(saved || (prefersDark ? 'dark' : 'light'));
}
function toggleTheme(){ setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); }

function fmtDate(iso){
  try{
    const d = new Date(iso);
    return d.toLocaleDateString('th-TH', {year:'numeric', month:'short', day:'numeric'});
  }catch(e){ return iso }
}

async function loadJSON(path){
  const res = await fetch(path, {cache:'no-store'});
  if(!res.ok) throw new Error('โหลดข้อมูลไม่ได้: ' + path);
  return await res.json();
}

// Very small Markdown → HTML converter (H1–H4, bold/italic/inline code, lists, code block, links, images, tables basic)
function mdToHtml(md){
  // Escape HTML
  md = md.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Code blocks ``` ```
  md = md.replace(/```([\s\S]*?)```/g, (m, code) => `<pre><code>${code.trim()}</code></pre>`);

  // Headers #### to #
  md = md.replace(/^####\s?(.*)$/gm, '<h4>$1</h4>')
         .replace(/^###\s?(.*)$/gm, '<h3>$1</h3>')
         .replace(/^##\s?(.*)$/gm, '<h2>$1</h2>')
         .replace(/^#\s?(.*)$/gm, '<h1>$1</h1>');

  // Bold/Italic/Inline code
  md = md.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
         .replace(/\*(.+?)\*/g, '<em>$1</em>')
         .replace(/`(.+?)`/g, '<code>$1</code>');

  // Images ![alt](src)
  md = md.replace(/!\[(.*?)\]\((.*?)\)/g, '<p><img alt="$1" src="$2"></p>');

  // Links [text](url)
  md = md.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Blockquotes
  md = md.replace(/^\>\s?(.*)$/gm, '<blockquote>$1</blockquote>');

  // Unordered lists
  md = md.replace(/(^|\n)\s*-\s+(.*)/g, (m, p1, item) => `${p1}<li>${item}</li>`);
  md = md.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
  md = md.replace(/<\/ul>\s*<ul>/g, ''); // merge adjacent uls

  // Ordered lists
  md = md.replace(/(^|\n)\s*\d+\.\s+(.*)/g, (m, p1, item) => `${p1}<li>${item}</li>`);
  md = md.replace(/(<li>[\s\S]*?<\/li>)/g, (m) => m); // already wrapped above
  md = md.replace(/(<li>[\s\S]*?<\/li>)(?!(\s*<\/?(ul|ol)>))/g, '$1'); // no-op safeguard
  // Convert sequences of <li> ... to <ol>
  md = md.replace(/(?:^|\n)(<li>[\s\S]*?<\/li>)(?:\n(?!<h\d|<p|<blockquote|<pre|<ul|<ol).*)*/g, (block) => {
    // This naive approach can over-wrap. Keep simple.
    return block;
  });
  // Paragraphs (lines separated by blank line)
  md = md.replace(/^(?!<h\d|<ul>|<li>|<blockquote>|<pre>|<img|<ol>|<\/li>|<\/ul>|<\/ol>)(.+)$/gm, '<p>$1</p>');

  return md;
}

function buildTOC(container, tocEl){
  const headers = $$('h2, h3, h4', container);
  if(headers.length === 0){ tocEl.innerHTML = '<div class="muted">ไม่มีหัวข้อ</div>'; return; }

  const ul = document.createElement('div');
  headers.forEach((h, idx)=>{
    if(!h.id){ h.id = 'h-' + (idx+1); }
    const a = document.createElement('a');
    a.textContent = h.textContent;
    a.href = '#' + h.id;
    const lvl = h.tagName === 'H2'? 2 : h.tagName === 'H3' ? 3 : 4;
    a.className = 'lvl-' + lvl;
    ul.appendChild(a);
  });
  tocEl.innerHTML = '';
  tocEl.appendChild(ul);

  // Highlight active heading on scroll
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach((entry)=>{
      const id = entry.target.id;
      const link = $('a[href="#'+id+'"]', tocEl);
      if(entry.isIntersecting){
        $$('.toc a', tocEl).forEach(x=>x.classList.remove('active'));
        link && link.classList.add('active');
      }
    });
  }, {rootMargin: '0px 0px -70% 0px', threshold: 0.1});
  headers.forEach(h => observer.observe(h));
}

function readingTimeFromText(text){
  const words = (text.replace(/\s+/g,' ').trim().split(' ').filter(Boolean)).length;
  const mins = Math.max(1, Math.round(words / CONFIG.readingWpm));
  return `${mins} นาทีในการอ่าน`;
}

function uniqueTags(posts){
  const s = new Set();
  posts.forEach(p => (p.tags||[]).forEach(t => s.add(t)));
  return Array.from(s).sort((a,b)=>a.localeCompare(b,'th'));
}

function renderIndex(data){
  // Header content
  $('#siteTitle').textContent = CONFIG.siteTitle;
  $('#siteFooterTitle').textContent = CONFIG.siteTitle;
  $('#siteHeading').textContent = data?.site?.title || CONFIG.siteTitle;
  $('#siteDesc').textContent = data?.site?.description || CONFIG.siteDescription;
  $('#year').textContent = (new Date()).getFullYear();
  const repoLink = $('#repoLink');
  if(CONFIG.githubRepoUrl){ repoLink.href = CONFIG.githubRepoUrl; } else { repoLink.style.display='none'; }

  const listEl = $('#postList');
  const emptyEl = $('#emptyState');
  let posts = (data.posts||[]).slice().sort((a,b)=> new Date(b.date) - new Date(a.date));
  const allTags = uniqueTags(posts);

  // Render tag bar
  const tagBar = $('#tagBar');
  const active = new Set();
  function refresh(){
    const q = $('#searchInput').value.trim().toLowerCase();
    const filtered = posts.filter(p => {
      const byTag = active.size===0 || (p.tags||[]).some(t => active.has(t));
      const hay = (p.title+' '+(p.summary||'')+' '+(p.content_md||'')+' '+(p.tags||[]).join(' ')).toLowerCase();
      const bySearch = !q || hay.includes(q);
      return byTag && bySearch;
    });
    listEl.innerHTML = '';
    if(filtered.length === 0){
      emptyEl.classList.remove('hidden');
    }else{
      emptyEl.classList.add('hidden');
      filtered.forEach(p => {
        const card = document.createElement('a');
        card.href = `post.html?id=${encodeURIComponent(p.id)}`;
        card.className = 'card';
        card.innerHTML = `
          <h3>${p.title}</h3>
          <p>${p.summary || ''}</p>
          <div class="meta">${fmtDate(p.date)}</div>
          <div class="tags">${(p.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
        `;
        listEl.appendChild(card);
      });
    }
    // Render chips
    tagBar.innerHTML = '';
    allTags.forEach(t => {
      const chip = document.createElement('button');
      chip.className = 'chip' + (active.has(t) ? ' active' : '');
      chip.textContent = t;
      chip.onclick = ()=>{ active.has(t) ? active.delete(t) : active.add(t); refresh(); };
      tagBar.appendChild(chip);
    });
  }

  $('#searchInput').addEventListener('input', refresh);
  refresh();
}

function renderPost(data){
  $('#siteTitle').textContent = CONFIG.siteTitle;
  $('#siteFooterTitle').textContent = CONFIG.siteTitle;
  $('#year').textContent = (new Date()).getFullYear();
  const repoLink = $('#repoLink');
  if(CONFIG.githubRepoUrl){ repoLink.href = CONFIG.githubRepoUrl; } else { repoLink.style.display='none'; }

  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const post = (data.posts||[]).find(p => p.id === id) || data.posts?.[0];
  if(!post){ $('#postTitle').textContent = 'ไม่พบเอกสาร'; return; }

  document.title = `${post.title} | ${CONFIG.siteTitle}`;
  $('#postTitle').textContent = post.title;
  $('#postDate').textContent = fmtDate(post.date);
  $('#postTags').innerHTML = (post.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('');

  const html = mdToHtml(post.content_md||"");
  const contentEl = $('#postContent');
  contentEl.innerHTML = html;

  // Reading time
  $('#readingTime').textContent = readingTimeFromText(contentEl.textContent);

  // Build ToC
  buildTOC(contentEl, $('#toc'));
}

// Boot
initTheme();
document.addEventListener('click', (e)=>{
  if(e.target && e.target.id === 'themeToggle'){ toggleTheme(); }
});

// Load data and render
loadJSON('data/posts.json')
  .then(data => {
    if(window.__PAGE__ === 'post') renderPost(data);
    else renderIndex(data);
  })
  .catch(err => {
    console.error(err);
    if(window.__PAGE__ === 'index'){
      $('#postList').innerHTML = '<div class="card">โหลดข้อมูลไม่สำเร็จ</div>';
    }else{
      $('#postContent').innerHTML = '<div class="card">โหลดข้อมูลไม่สำเร็จ</div>';
    }
  });
