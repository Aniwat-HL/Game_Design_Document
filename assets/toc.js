(function(){
  function slugify(txt){
    return (txt||'').toString().trim()
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙\s-]/gi,'')
      .replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
  }
  function ensureHeadingIDs(){
    const article = document.getElementById('blog-article');
    if(!article) return;
    const seen = new Set();
    let autoIdx = 0;
    article.querySelectorAll('h1, h2, h3').forEach(h=>{
      let id = (h.getAttribute('id')||'').trim();
      if(!id){ id = slugify(h.textContent) || `sec-${++autoIdx}`; }
      const base = id; let next = base, n = 2;
      while(seen.has(next)) next = `${base}-${n++}`;
      h.id = next; seen.add(next);
    });
  }
  function setActiveTOC(id){
    document.querySelectorAll('#toc-list a, #toc-list-mobile a').forEach(a=>{
      a.classList.toggle('active', a.getAttribute('href') === '#'+id);
    });
    const active = document.querySelector('#toc-list a.active');
    if(active){ active.scrollIntoView({block:'nearest'}); }
  }
  function setupScrollSpy(){
    const headings = document.querySelectorAll('#blog-article h2[id], #blog-article h3[id], #blog-article h1[id]');
    if(!headings.length) return;
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{ if(e.isIntersecting){ setActiveTOC(e.target.id); } });
    }, { rootMargin:'0px 0px -70% 0px', threshold:0.1 });
    headings.forEach(h=> io.observe(h));
  }
  function buildTOC(){
    const article = document.getElementById('blog-article');
    const tocList = document.getElementById('toc-list');
    const tocListMobile = document.getElementById('toc-list-mobile');
    const tocEmpty = document.getElementById('toc-empty');
    if(!article) return;

    ensureHeadingIDs();

    let headings = Array.from(article.querySelectorAll('h2[id],h3[id]'));
    if(headings.length === 0){
      headings = Array.from(article.querySelectorAll('h1[id],h2[id],h3[id]'));
    }

    function draw(items, listEl){
      if(!listEl) return;
      listEl.innerHTML = '';
      items.forEach(it=>{
        const li=document.createElement('li');
        const a=document.createElement('a'); a.href=`#${it.id}`; a.textContent=it.text;
        a.onclick=()=> setTimeout(()=> window.scrollBy(0,-10), 0);
        li.appendChild(a);
        if(it.children?.length){
          const ol=document.createElement('ol'); ol.style.paddingLeft='16px';
          it.children.forEach(ch=>{
            const cli=document.createElement('li');
            const ca=document.createElement('a'); ca.href=`#${ch.id}`; ca.textContent=ch.text;
            ca.onclick=()=> setTimeout(()=> window.scrollBy(0,-10), 0);
            cli.appendChild(ca); ol.appendChild(cli);
          });
          li.appendChild(ol);
        }
        listEl.appendChild(li);
      });
    }

    if(headings.length){
      const items=[]; let cur=null;
      headings.forEach(h=>{
        if(h.tagName==='H2' || h.tagName==='H1'){ cur={id:h.id,text:h.textContent,children:[]}; items.push(cur); }
        else if(h.tagName==='H3' && cur){ cur.children.push({id:h.id,text:h.textContent}); }
      });
      draw(items, tocList);
      draw(items, tocListMobile);
      if(tocEmpty) tocEmpty.style.display = 'none';
    }else{
      if(tocList) tocList.innerHTML='';
      if(tocListMobile) tocListMobile.innerHTML='';
      if(tocEmpty) tocEmpty.style.display = 'block';
    }
  }
  function bindTOCEvents(){
    const fab=document.getElementById('tocFab');
    const drawer=document.getElementById('tocDrawer');
    const closeBtn=document.getElementById('tocClose');
    const overlay=drawer?drawer.querySelector('.drawer-backdrop'):null;
    if(fab && drawer){ fab.onclick=()=> drawer.classList.add('active'); }
    if(closeBtn){ closeBtn.onclick=()=> drawer.classList.remove('active'); }
    if(overlay){ overlay.onclick=()=> drawer.classList.remove('active'); }
    document.querySelectorAll('#toc-list a, #toc-list-mobile a').forEach(a=>{
      a.addEventListener('click', ()=> setTimeout(()=> drawer && drawer.classList.remove('active'), 150));
    });
  }
  window.addEventListener('DOMContentLoaded', ()=>{ buildTOC(); setupScrollSpy(); bindTOCEvents(); });
})();