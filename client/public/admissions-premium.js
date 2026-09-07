(() => {
  if (window.location.pathname !== '/admissions') return;

  const style = document.createElement('style');
  style.textContent = `
    body.admissions-premium { background:#f8f9fa; }
    .admissions-premium .admissions-info-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; margin:0 auto 24px; max-width:1280px; padding:0 16px; }
    .admissions-premium .admission-info-card { border:1px solid rgba(6,18,41,.08); border-radius:20px; background:#fff; padding:18px; box-shadow:0 8px 24px rgba(6,18,41,.06); }
    .admissions-premium .admission-info-card strong { display:block; color:#061229; font-size:14px; margin-bottom:5px; }
    .admissions-premium .admission-info-card span { color:#64748b; font-size:13px; line-height:1.55; }
    .admissions-premium .admission-info-card .admission-icon { width:40px; height:40px; display:grid; place-items:center; border-radius:13px; background:rgba(216,155,40,.12); color:#D89B28; margin-bottom:12px; font-weight:900; }
    .admissions-premium .admission-side-note { border-radius:22px; border:1px solid rgba(216,155,40,.22); background:linear-gradient(135deg,rgba(216,155,40,.09),rgba(6,18,41,.035)); padding:20px; margin-top:18px; }
    .admissions-premium .admission-side-note h3 { margin:0; color:#061229; font-size:16px; font-weight:800; }
    .admissions-premium .admission-side-note p { margin:7px 0 0; color:#64748b; font-size:13px; line-height:1.6; }
    .admissions-premium .admission-required-badge { display:inline-flex; align-items:center; gap:6px; margin-top:10px; padding:6px 10px; border-radius:999px; background:#fff; color:#061229; font-size:11px; font-weight:800; border:1px solid rgba(6,18,41,.08); }
    .admissions-premium input:focus, .admissions-premium select:focus, .admissions-premium textarea:focus { box-shadow:0 0 0 4px rgba(216,155,40,.12); }
    @media(max-width:900px){ .admissions-premium .admissions-info-grid{grid-template-columns:1fr;} }
  `;
  document.head.appendChild(style);
  document.body.classList.add('admissions-premium');

  const addEnhancements = () => {
    const main = document.querySelector('main');
    if (!main || document.querySelector('.admissions-info-grid')) return;

    const form = main.querySelector('form');
    if (!form) return;

    const grid = document.createElement('div');
    grid.className = 'admissions-info-grid';
    grid.innerHTML = `
      <div class="admission-info-card"><div class="admission-icon">01</div><strong>Apply online</strong><span>Complete the guided application in about 5–10 minutes.</span></div>
      <div class="admission-info-card"><div class="admission-icon">02</div><strong>School review</strong><span>Our Admissions Office reviews the application and supporting information.</span></div>
      <div class="admission-info-card"><div class="admission-icon">03</div><strong>Next steps</strong><span>Keep your reference number for follow-up, assessment and enrolment.</span></div>
    `;
    main.parentElement.insertBefore(grid, main);

    const note = document.createElement('div');
    note.className = 'admission-side-note';
    note.innerHTML = '<h3>Before you submit</h3><p>Have the learner\'s details and previous school information ready. Documents can be presented during the school\'s verification and enrolment process.</p><span class="admission-required-badge">✓ Secure application</span><span class="admission-required-badge">✓ Reference number issued</span>';
    form.parentElement.appendChild(note);
  };

  const run = () => addEnhancements();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once:true }); else run();
  const observer = new MutationObserver(() => addEnhancements());
  observer.observe(document.getElementById('root') || document.body, { childList:true, subtree:true });
  setTimeout(() => observer.disconnect(), 15000);
})();
