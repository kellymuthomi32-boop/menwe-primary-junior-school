(() => {
  const publicPaths = new Set(['/', '/about', '/academics', '/school-life', '/families', '/how-it-works', '/admissions', '/news', '/events', '/gallery', '/contact']);
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  if (!publicPaths.has(path) || document.querySelector('[data-menwe-discovery]')) return;

  const links = [
    ['/about', 'About Menwe', 'Purpose, people and the environment around learning.'],
    ['/academics', 'Academics', 'Learning pathways, assessment and progress.'],
    ['/school-life', 'School life', 'A window into published school moments and stories.'],
    ['/admissions', 'Admissions', 'A clear next step for families exploring the school.'],
    ['/gallery', 'Gallery', 'Published images from school life and community.'],
    ['/contact', 'Contact', 'Questions, conversations and school enquiries.']
  ].filter(([href]) => href !== path).slice(0, 4);

  const section = document.createElement('section');
  section.dataset.menweDiscovery = 'true';
  section.style.cssText = 'border-top:1px solid rgba(29,43,37,.08);border-bottom:1px solid rgba(29,43,37,.08);background:#f7f4ef;padding:64px 20px';
  section.innerHTML = `
    <div style="max-width:1440px;margin:0 auto">
      <div style="display:flex;gap:24px;align-items:flex-end;justify-content:space-between;flex-wrap:wrap">
        <div style="max-width:680px">
          <p style="margin:0;color:#c2410c;font:800 9px/1 Inter,system-ui;letter-spacing:.25em;text-transform:uppercase">Explore Menwe</p>
          <h2 style="margin:12px 0 0;font:600 clamp(30px,4vw,46px)/1.03 'DM Serif Display',Georgia,serif;letter-spacing:-.03em;color:#191919">Keep discovering the school.</h2>
          <p style="margin:14px 0 0;color:rgba(25,25,25,.58);font:400 14px/1.8 Inter,system-ui">Move naturally between the school's story, learning, community and admissions. School-specific facts remain controlled by authorised publishing.</p>
        </div>
        <a href="/admissions" style="display:inline-flex;align-items:center;gap:8px;background:#191919;color:white;text-decoration:none;border-radius:999px;padding:12px 18px;font:800 13px Inter,system-ui">Explore admissions <span aria-hidden="true">→</span></a>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:36px">
        ${links.map(([href,title,copy]) => `<a href="${href}" style="text-decoration:none;color:#191919;background:#fff;border:1px solid rgba(29,43,37,.09);border-radius:20px;padding:22px;min-height:155px;transition:transform .25s ease,box-shadow .25s ease" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 18px 45px rgba(29,43,37,.08)'" onmouseout="this.style.transform='';this.style.boxShadow=''" onfocus="this.style.transform='translateY(-4px)'" onblur="this.style.transform=''">
          <span style="display:inline-grid;place-items:center;width:38px;height:38px;border-radius:11px;background:#f7f4ef;color:#c2410c;font:700 15px Inter,system-ui">↗</span>
          <strong style="display:block;margin-top:20px;font:600 21px/1.1 'DM Serif Display',Georgia,serif">${title}</strong>
          <span style="display:block;margin-top:8px;color:rgba(25,25,25,.55);font:400 12px/1.6 Inter,system-ui">${copy}</span>
        </a>`).join('')}
      </div>
      <div style="margin-top:18px;padding:18px 20px;border:1px solid rgba(29,43,37,.08);border-radius:18px;background:rgba(255,255,255,.7);display:flex;gap:12px;align-items:center;flex-wrap:wrap;color:rgba(25,25,25,.58);font:600 12px/1.5 Inter,system-ui"><span style="color:#c2410c">●</span><span>Public information is intentionally separated from private learner, family, finance and communication records.</span><a href="/privacy" style="margin-left:auto;color:#c2410c;font-weight:800">Privacy →</a></div>
    </div>`;

  const mount = () => {
    const footer = document.querySelector('footer');
    if (!footer || document.querySelector('[data-menwe-discovery]')) return false;
    footer.parentNode.insertBefore(section, footer);
    return true;
  };
  if (!mount()) {
    const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 10000);
  }
})();
