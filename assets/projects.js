(function(){
  const localProjects = [
    {name:"adaptive-hero-progression", description:"ระบบปรับความยากอัตโนมัติด้วย ML สำหรับเกม Unity", tags:["unity","ml","game"], repo:"https://github.com/aniwat-hl/adaptive-hero-progression", demo:"", homepage:"", stars:0, updated_at:"2025-08-15"},
    {name:"werewolf-card-designer", description:"เว็บเครื่องมือออกแบบการ์ดเกม Werewolf สไตล์มินิมอล", tags:["web","tool"], repo:"https://github.com/aniwat-hl/werewolf-card-designer", demo:"https://aniwat-hl.github.io/werewolf-card-designer/", homepage:"", stars:0, updated_at:"2025-07-20"}
  ];
  let state = { projects: [], query:'', activeTag:'all', allTags:new Set() };

  const elGrid = document.getElementById('grid');
  const elChips = document.getElementById('chips');
  const elEmpty = document.getElementById('empty');
  const elToggle = document.getElementById('toggleSource');
  const elQ = document.getElementById('q');
  const elGL = document.getElementById('githubLink');

  if(elGL){ elGL.href = CONFIG.username ? `https://github.com/${CONFIG.username}` : 'https://github.com'; }

  function formatDate(d){ try{ return new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'2-digit'});}catch{ return d } }
  function renderChips(){
    const tags = ['all', ...Array.from(state.allTags).sort()];
    elChips.innerHTML = '';
    tags.forEach(tag=>{
      const c = document.createElement('button');
      c.className = 'link'+(state.activeTag===tag?' primary':'');
      c.style.marginRight = '8px';
      c.textContent = tag;
      c.onclick = ()=>{ state.activeTag = tag; renderProjects(); };
      elChips.appendChild(c);
    });
  }
  function projectMatches(p){
    const q = state.query.trim().toLowerCase();
    const matchQ = !q || [p.name, p.description, (p.tags||[]).join(' ')].join(' ').toLowerCase().includes(q);
    const matchTag = state.activeTag==='all' || (p.tags||[]).includes(state.activeTag);
    return matchQ && matchTag;
  }
  function renderProjects(){
    const filtered = state.projects.filter(projectMatches);
    elGrid.innerHTML = '';
    elEmpty.hidden = filtered.length !== 0;
    filtered.forEach(p=>{
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px">
          <div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--accent2));"></div>
          <h3 style="margin:0">${p.name}</h3>
        </div>
        <p class="muted">${p.description || '—'}</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top:8px">
          <span class="muted">⭐ ${p.stars||0}</span>
          <span class="muted">⏱ ${p.updated_at ? formatDate(p.updated_at) : '—'}</span>
          <span style="flex:1"></span>
          <a class="link" href="${p.repo}" target="_blank" rel="noopener noreferrer">Repo</a>
          ${(p.demo||p.homepage) ? `<a class="link primary" href="${p.demo||p.homepage}" target="_blank" rel="noopener noreferrer">Demo</a>` : ''}
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px">${(p.tags||[]).map(t=>`<span class="link">${t}</span>`).join('')}</div>
      `;
      elGrid.appendChild(card);
    });
  }

  async function loadFromGitHub(username){
    const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`;
    const res = await fetch(url, { headers: { 'Accept': 'application/vnd.github+json' } });
    if(!res.ok) throw new Error('GitHub API error');
    const repos = await res.json();
    return repos.filter(r=>!r.fork).map(r=>({
      name:r.name, description:r.description, tags:(r.topics&&r.topics.length?r.topics:[]),
      repo:r.html_url, demo:r.homepage, homepage:r.homepage, stars:r.stargazers_count,
      updated_at:r.pushed_at || r.updated_at,
    }));
  }
  function ingest(projects){
    state.projects = projects;
    state.allTags = new Set(CONFIG.defaultTags || []);
    projects.forEach(p => (p.tags||[]).forEach(t=> state.allTags.add(t)) );
    renderChips(); renderProjects();
  }

  async function bootstrap(){
    const data = (CONFIG.useGitHubAPI && CONFIG.username)
      ? await loadFromGitHub(CONFIG.username).catch(()=>localProjects)
      : localProjects;
    ingest(data);
    if(elQ){ elQ.addEventListener('input', (e)=>{ state.query = e.target.value; renderProjects(); }); }
    if(elToggle){
      elToggle.textContent = `ข้อมูล: ${CONFIG.useGitHubAPI?'GitHub':'Local'}`;
      elToggle.addEventListener('click', async ()=>{
        CONFIG.useGitHubAPI = !CONFIG.useGitHubAPI;
        elToggle.textContent = `ข้อมูล: ${CONFIG.useGitHubAPI?'GitHub':'Local'}`;
        const d = (CONFIG.useGitHubAPI && CONFIG.username)
          ? await loadFromGitHub(CONFIG.username).catch(()=>localProjects)
          : localProjects;
        ingest(d);
      });
    }
  }
  window.addEventListener('DOMContentLoaded', bootstrap);
})();