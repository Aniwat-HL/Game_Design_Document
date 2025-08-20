// Theme + Nav active
(function(){
  const el = document.documentElement;
  const stored = localStorage.getItem('theme');
  if(stored){ el.setAttribute('data-theme', stored); }
  const themeBtn = document.getElementById('themeBtn');
  function apply(theme){ el.setAttribute('data-theme', theme); localStorage.setItem('theme', theme); }
  if(themeBtn){ themeBtn.addEventListener('click', ()=>{ const next = (el.getAttribute('data-theme')==='light')?'dark':'light'; apply(next); }); }

  const path = location.pathname.replace(/\/index\.html$/, '/');
  document.querySelectorAll('nav.primary a').forEach(a=>{
    const href = new URL(a.href).pathname.replace(/\/index\.html$/, '/');
    if(href===path){ a.classList.add('active'); }
  });

  // progress bar (optional, blog will update)
  const progressEl = document.getElementById('progress');
  if(progressEl){
    window.addEventListener('scroll', ()=>{
      const article = document.getElementById('blog-article'); if(!article) return;
      const total = article.scrollHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(window.scrollY - (article.offsetTop - 12), 0), total);
      const pct = total > 0 ? (scrolled / total) * 100 : 0; progressEl.style.width = pct + '%';
    }, {passive:true});
  }
})();

// Global CONFIG (can be edited)
window.CONFIG = {
  username: "aniwat-hl",
  useGitHubAPI: true,
  defaultTags: ["web","unity","ml","game","tool"],
  contactTo: "s6530611018@phuket.psu.ac.th",
};