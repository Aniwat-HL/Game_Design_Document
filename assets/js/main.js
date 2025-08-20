
const CONFIG = {
  siteTitle: "GDD Blog",
  siteDescription: "คลังเอกสาร Game Design Document (GDD) สำหรับโปรเจกต์ของคุณ",
  githubRepoUrl: "",
  readingWpm: 230
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

// Markdown parser (headings, lists, blockquote, code fence, inline formats)
function mdToHtml(md){
  // Escape basic HTML
  md = md.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Code fences
  md = md.replace(/```([\s\S]*?)```/g, (m, code) => `<pre><code>${code.trim()}</code></pre>`);

  // Convert CRLF to LF
  md = md.replace(/\r\n/g, '\n');

  // Normalize bullets from • or – to '-'
  md = md.replace(/^\s*[•–]\s+/gm, '- ');

  // Headings
  md = md.replace(/^####\s?(.*)$/gm, '<h4>$1</h4>')
         .replace(/^###\s?(.*)$/gm, '<h3>$1</h3>')
         .replace(/^##\s?(.*)$/gm, '<h2>$1</h2>')
         .replace(/^#\s?(.*)$/gm, '<h1>$1</h1>');

  // Blockquotes
  md = md.replace(/^\>\s?(.*)$/gm, '<blockquote>$1</blockquote>');

  // Build lists by scanning lines to group consecutive list items
  const lines = md.split('\n');
  let html = '';
  let inUL = false, inOL = false;

  function closeLists(){
    if(inUL){ html += '</ul>'; inUL = false; }
    if(inOL){ html += '</ol>'; inOL = false; }
  }

  for(let i=0;i<lines.length;i++){
    let line = lines[i];

    // Ordered list item (1. text) or (1) text
    if(/^(\s*\d+)[\.\)]\s+/.test(line)){
      const item = line.replace(/^(\s*\d+)[\.\)]\s+/, '');
      if(!inOL){ closeLists(); html += '<ol>'; inOL = true; }
      html += `<li>${item}</li>`;
      continue;
    }

    // Unordered list item (- text or * text)
    if(/^\s*[-*]\s+/.test(line)){
      const item = line.replace(/^\s*[-*]\s+/, '');
      if(!inUL){ closeLists(); html += '<ul>'; inUL = true; }
      html += `<li>${item}</li>`;
      continue;
    }

    // If blank line -> close any lists and add spacing
    if(/^\s*$/.test(line)){
      closeLists();
      html += '\n';
      continue;
    }

    // Already converted block elements?
    if(/^<h[1-4]>/.test(line) || /^<blockquote>/.test(line) || /^<pre>/.test(line)){
      closeLists();
      html += line;
      continue;
    }

    // Images ![alt](src)
    if(/!\[(.*?)\]\((.*?)\)/.test(line)){
      line = line.replace(/!\[(.*?)\]\((.*?)\)/g, '<p><img alt="$1" src="$2"></p>');
      closeLists();
      html += line;
      continue;
    }

    // Links [text](url) + inline bold/italic/code
    line = line
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');

    // Paragraph
    closeLists();
    if(line.trim().length){
      html += `<p>${line}</p>`;
    }
  }
  closeLists();
  return html;
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

  // Scroll spy
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

function setupProgressAndTop(){
  // progress bar
  const bar = document.createElement('div');
  bar.id = 'progress';
  document.body.appendChild(bar);

  // back to top
  const topBtn = document.createElement('button');
  topBtn.id = 'backToTop';
  topBtn.textContent = '↑';
  topBtn.title = 'กลับขึ้นบน';
  topBtn.onclick = ()=> window.scrollTo({top:0, behavior:'smooth'});
  document.body.appendChild(topBtn);

  const onScroll = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const p = Math.max(0, Math.min(1, docHeight ? scrollTop / docHeight : 0));
    bar.style.width = (p*100) + '%';
    if(scrollTop > 600) topBtn.classList.add('show'); else topBtn.classList.remove('show');
  };
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
}

function renderIndex(data){
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

function buildPageJump(container){
  const h2s = $$('h2', container);
  if(!h2s.length) return;
  const wrap = document.createElement('div');
  wrap.className = 'page-jump';
  h2s.forEach((h, idx) => {
    if(!h.id){ h.id = 'h-' + (idx+1); }
    const btn = document.createElement('button');
    btn.className = 'chip';
    const label = h.textContent.trim().slice(0, 32);
    btn.textContent = label || ('ส่วนที่ ' + (idx+1));
    btn.title = h.textContent.trim();
    btn.onclick = (e)=>{ e.preventDefault(); h.scrollIntoView({behavior:'smooth', block:'start'}); history.replaceState(null, '', '#'+h.id); };
    wrap.appendChild(btn);
  });
  const postHead = $('.post-head');
  postHead && postHead.after(wrap);
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

  $('#readingTime').textContent = readingTimeFromText(contentEl.textContent);

  buildTOC(contentEl, $('#toc'));
  buildPageJump(contentEl);
  setupProgressAndTop();

  // Add anchor links to headings
  $$('h2, h3, h4', contentEl).forEach(h => {
    if(!h.id){
      h.id = 'h-' + Math.random().toString(36).slice(2,8);
    }
    const a = document.createElement('a');
    a.href = '#'+h.id;
    a.textContent = '¶';
    a.style.marginLeft = '6px';
    a.style.textDecoration = 'none';
    a.title = 'ลิงก์ไปยังหัวข้อนี้';
    h.appendChild(a);
  });
}

// Boot
initTheme();
document.addEventListener('click', (e)=>{
  if(e.target && e.target.id === 'themeToggle'){ toggleTheme(); }
});

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
