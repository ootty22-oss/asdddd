/* مختبر الفيزياء: 14 محاكاة تفاعلية */
(function (P) {
  'use strict';
  const { h, $, $$ } = P;
  const K = 9e9;
  const col = () => ({
    pos: P.css('--pos'), neg: P.css('--neg'), ink: P.css('--ink'), muted: P.css('--muted'), line: P.css('--line'), surface: P.css('--surface'), surface2: P.css('--surface2'),
    metal: P.css('--metal'), metalL: P.css('--metal-l'), gold: P.css('--gold'), glass: P.css('--glass2'), rubber: P.css('--rubber'), copper: P.css('--copper'), ok: P.css('--ok'),
    law: P.css('--law'), act: P.css('--act'), ex: P.css('--ex'), lineF: P.css('--line-f'), skin: P.css('--skin'), cork: P.css('--cork'), warn: P.css('--warn'), enr: P.css('--enr')
  });

  // ------------------------------------------------------------ إطار مشترك
  function shell(id, inLesson) {
    const m = P.simById[id], l = P.lessonById[m.lesson];
    const el = h('div', { class: `sim ch${m.ch}c`, id: 'sim-' + id });
    el.innerHTML = `<header><h3><span class="pill">${id}</span> ${m.title}</h3><div class="row">${m.qualitative ? '<span class="qual" title="الكتاب يشرح هذه الظاهرة نوعياً ولا يعطي قانوناً كمياً">تمثيل نوعي</span>' : ''}${inLesson ? '' : `<a class="btn sm" href="#lesson-${l.id}">الدرس ${l.sec}</a>`}</div></header>`;
    return el;
  }
  function canvasIn(el, ratio, minH, maxH) {
    const cv = h('canvas', { role: 'img', 'aria-label': 'لوحة المحاكاة' }); el.append(cv);
    const o = { cv, ctx: null, W: 600, H: 300, onResize: null };
    const fit = () => {
      const w = Math.max(260, Math.min(900, el.clientWidth - 24 || 600));
      const hh = Math.round(Math.max(minH, Math.min(maxH, w * ratio)));
      if (w === o.W && hh === o.H && o.ctx) return;
      o.W = w; o.H = hh; o.ctx = P.setupCanvas(cv, w, hh); if (o.onResize) o.onResize();
    };
    o.fit = fit;
    const ro = new ResizeObserver(() => fit()); ro.observe(el);
    o.dispose = () => ro.disconnect();
    return o;
  }
  function loop(el, step) {
    let raf = 0, vis = true, on = false;
    const io = new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis && on && !raf) raf = requestAnimationFrame(tick); }, { threshold: 0 });
    io.observe(el);
    let last = performance.now();
    function tick(t) {
      raf = 0;
      if (!document.body.contains(el)) { io.disconnect(); return; }
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      const more = step(dt);
      if (more === false) { on = false; return; }
      if (on && vis) raf = requestAnimationFrame(tick);
    }
    return { start() { if (!on) { on = true; last = performance.now(); if (!raf && vis) raf = requestAnimationFrame(tick); } }, stop() { on = false; } };
  }
  function drag(cv, o) {
    let tgt = null, moved = 0, sx = 0, sy = 0;
    const pt = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', e => {
      const [x, y] = pt(e); sx = x; sy = y; moved = 0; tgt = o.hit ? o.hit(x, y) : null;
      if (tgt != null) { cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; if (o.down) o.down(tgt, x, y); e.preventDefault(); }
    });
    cv.addEventListener('pointermove', e => {
      const [x, y] = pt(e);
      if (tgt != null) { moved += 1; o.move(tgt, x, y); }
      else if (o.hover) cv.style.cursor = o.hit && o.hit(x, y) != null ? 'grab' : 'default';
    });
    const up = e => { const [x, y] = pt(e); if (tgt != null && o.up) o.up(tgt, x, y); if (tgt == null && o.click && Math.hypot(x - sx, y - sy) < 6) o.click(x, y); tgt = null; cv.style.cursor = ''; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', () => { tgt = null; });
  }
  function slider(label, min, max, step, val, fmt, oninput) {
    const id = 'r' + Math.random().toString(36).slice(2, 8);
    const inp = h('input', { type: 'range', min, max, step, value: val, id });
    const out = h('output', { for: id });
    const wrap = h('label', { class: 'rng', for: id }, h('span', null, label, out), inp);
    const upd = () => { out.innerHTML = fmt(+inp.value); };
    inp.addEventListener('input', () => { upd(); oninput(+inp.value); }); upd();
    return { el: wrap, input: inp, set(v) { inp.value = v; upd(); } };
  }
  const btn = (t, f, cls) => h('button', { class: 'btn sm ' + (cls || ''), type: 'button', onclick: f }, t);
  const ctl = (...k) => h('div', { class: 'ctl' }, ...k);
  const readout = () => h('div', { class: 'readout' });
  const note = html => h('p', { class: 'simnote', html });
  const sign = (ctx, x, y, s, c, size) => { ctx.fillStyle = s > 0 ? c.pos : c.neg; ctx.font = `700 ${size || 14}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s > 0 ? '+' : '−', x, y); };
  const ball = (ctx, x, y, r, fill, stroke) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); } };
  const text = (ctx, s, x, y, c, size, align, bold) => { ctx.direction = /[\u0600-\u06FF]/.test(s) ? 'rtl' : 'ltr'; ctx.fillStyle = c; ctx.font = `${bold ? 700 : 400} ${size || 13}px "IBM Plex Sans Arabic", sans-serif`; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y); };
  const groundSym = (ctx, x, y, c) => { ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; [[12, 0], [8, 4], [4, 8]].forEach(([w, d]) => { ctx.beginPath(); ctx.moveTo(x - w, y + d); ctx.lineTo(x + w, y + d); ctx.stroke(); }); };
  const sciTxt = v => P.strip(P.sci(v)).replace(/×10(−?\d+)/, (m, e) => '×10^' + e);
  const HTMLsci = v => `<span class="ltr">${P.sci(v)}</span>`;

  const SIMS = {};

  // ============================================================ L1 قانون كولوم
  SIMS.L1 = function (el) {
    const st = { q1: 4, q2: 9, r: 6 };
    const cvs = canvasIn(el, 0.62, 330, 520);
    const ro = readout(); el.append(ro);
    const s1 = slider('الشحنة الأولى q₁ (μC)', -10, 10, 0.5, st.q1, v => (v > 0 ? '+' : '') + v, v => { st.q1 = v; draw(); });
    const s2 = slider('الشحنة الثانية q₂ (μC)', -10, 10, 0.5, st.q2, v => (v > 0 ? '+' : '') + v, v => { st.q2 = v; draw(); });
    const sr = slider('البعد r (cm)', 1, 30, 0.5, st.r, v => v + ' cm', v => { st.r = v; draw(); });
    el.append(ctl(s1.el, s2.el, sr.el), h('div', { class: 'row', style: 'margin-top:8px' }, btn('مثال الكتاب (90 N)', () => { st.q1 = 4; st.q2 = 9; st.r = 6; s1.set(4); s2.set(9); sr.set(6); draw(); }), btn('ضاعف البعد', () => { st.r = Math.min(30, st.r * 2); sr.set(st.r); draw(); })),
      note('اسحب إحدى الشحنتين لتغيير البعد. طول السهم نسبي (يتناسب مع لوغاريتم القوة) ليبقى ظاهراً عند القيم الكبيرة والصغيرة؛ القيمة الدقيقة في المربع أسفل اللوحة.'));
    const F = (r) => K * Math.abs(st.q1 * 1e-6 * st.q2 * 1e-6) / Math.pow(r / 100, 2);
    let geo = {};
    function draw() {
      const { ctx, W, H } = cvs; const c = col(); ctx.clearRect(0, 0, W, H);
      const top = H * 0.42, cy = top * 0.55, sc = (W - 100) / 30, cx = W / 2;
      const x1 = cx - st.r * sc / 2, x2 = cx + st.r * sc / 2; geo = { x1, x2, cy, sc, cx };
      // البعد
      ctx.strokeStyle = c.muted; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x1, cy + 34); ctx.lineTo(x2, cy + 34); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, `r = ${st.r} cm = ${(st.r / 100).toFixed(st.r < 10 ? 3 : 2)} m`, cx, cy + 48, c.muted, 12);
      const f = F(st.r), prod = st.q1 * st.q2;
      if (f > 0) {
        const len = Math.min(110, 18 + 22 * Math.log10(1 + f / 1e-3));
        const rep = prod > 0, d = rep ? 1 : -1;
        P.arrow(ctx, x1 - d * 20, cy, x1 - d * (20 + len), cy, c.law, 3);
        P.arrow(ctx, x2 + d * 20, cy, x2 + d * (20 + len), cy, c.law, 3);
        text(ctx, 'F₂₁', x1 - d * (30 + len / 2), cy - 16, c.law, 12, 'center', 1);
        text(ctx, 'F₁₂', x2 + d * (30 + len / 2), cy - 16, c.law, 12, 'center', 1);
        text(ctx, rep ? 'قوة تنافر' : 'قوة تجاذب', cx, 16, c.ink, 14, 'center', 1);
      } else text(ctx, 'لا قوة: إحدى الشحنتين صفر', cx, 16, c.muted, 13);
      [[x1, st.q1, 'q₁', 'right'], [x2, st.q2, 'q₂', 'left']].forEach(([x, q, n, al]) => {
        const r = 12 + Math.abs(q) * 1.1; ball(ctx, x, cy, r, q > 0 ? c.pos : q < 0 ? c.neg : c.muted);
        text(ctx, q > 0 ? '+' : q < 0 ? '−' : '0', x, cy + 1, '#fff', 15, 'center', 1); text(ctx, `${n} = ${q > 0 ? '+' : ''}${q} μC`, x + (al === 'right' ? 6 : -6), cy - r - 10, c.ink, 12, al);
      });
      // الرسم البياني F مقابل r
      const gx = 56, gy = top + 24, gw = W - 80, gh = H - top - 58;
      const rmin = 1, rmax = 30, fmax = F(Math.max(1, st.r / 2)) || 1;
      ctx.fillStyle = c.surface; ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) { const y = gy + gh - gh * i / 4; ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke(); text(ctx, sciTxt(fmax * i / 4), gx - 4, y, c.muted, 10, 'right'); }
      for (let r = 5; r <= 30; r += 5) { const x = gx + (r - rmin) / (rmax - rmin) * gw; text(ctx, String(r), x, gy + gh + 12, c.muted, 10); }
      text(ctx, 'r (cm)', gx + gw / 2, gy + gh + 28, c.muted, 11); text(ctx, 'F (N)', gx + 4, gy - 10, c.muted, 11, 'left');
      if (fmax > 0 && f > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip();
        ctx.beginPath(); for (let i = 0; i <= 200; i++) { const r = rmin + (rmax - rmin) * i / 200, x = gx + i / 200 * gw, y = gy + gh - F(r) / fmax * gh; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.lineTo(gx + gw, gy + gh); ctx.lineTo(gx, gy + gh); ctx.closePath(); ctx.fillStyle = c.law + '22'; ctx.fill();
        ctx.beginPath(); for (let i = 0; i <= 200; i++) { const r = rmin + (rmax - rmin) * i / 200, x = gx + i / 200 * gw, y = gy + gh - F(r) / fmax * gh; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.strokeStyle = c.law; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
        const mx = gx + (st.r - rmin) / (rmax - rmin) * gw, my = Math.max(gy, gy + gh - f / fmax * gh);
        ball(ctx, mx, my, 5, c.ex); text(ctx, sciTxt(f) + ' N', Math.min(mx + 8, gx + gw - 60), my - 12, c.ink, 11, 'left', 1);
      }
      ro.innerHTML = `<span class="r"><b>F = k|q₁q₂|/r²</b></span><span class="r ltr">F = 9×10<sup>9</sup> × (${Math.abs(st.q1)}×10<sup>−6</sup>)(${Math.abs(st.q2)}×10<sup>−6</sup>) / (${(st.r / 100)})<sup>2</sup></span><span class="r">F = <b>${HTMLsci(f)} N</b></span><span class="r">${f ? (prod > 0 ? 'تنافر' : 'تجاذب') : '—'}</span>`;
      el.dataset.f = f;
    }
    cvs.onResize = draw;
    drag(cvs.cv, {
      hit: (x, y) => Math.abs(y - geo.cy) < 34 ? (Math.abs(x - geo.x1) < 30 ? 1 : Math.abs(x - geo.x2) < 30 ? 2 : null) : null, hover: true,
      move: (t, x) => { const r = Math.abs(x - geo.cx) * 2 / geo.sc; st.r = Math.max(1, Math.min(30, Math.round(r * 2) / 2)); sr.set(st.r); draw(); }
    });
    cvs.fit(); draw();
  };

  // ============================================================ L2 الشحن بالدلك
  SIMS.L2 = function (el) {
    const PAIRS = [
      { id: 'bw', a: 'بالون', b: 'صوف', to: 'a', note: 'البالون يكتسب إلكترونات فيصير سالباً، والصوف يفقدها فيصير موجباً (الكتاب، شكل 14).' },
      { id: 'gs', a: 'ساق زجاج', b: 'حرير', to: 'b', note: 'ساق الزجاج المدلوكة بالحرير تُشحن بشحنة موجبة (نشاط الكتاب)، أي أنها تفقد إلكترونات ينتقل بعضها إلى الحرير.' },
      { id: 'rw', a: 'ساق مطاط', b: 'صوف', to: 'a', note: 'ساق المطاط المدلوكة بالصوف تُشحن بشحنة سالبة (نشاط الكتاب).' },
      { id: 'ch', a: 'مشط بلاستيك', b: 'شعر جاف', to: 'a', note: 'يذكر الكتاب أن المشط يصير مشحوناً ولا يذكر نوع شحنته. <span class="enrich-tag">معلومة إثرائية</span> المشط البلاستيكي يكتسب عادة إلكترونات من الشعر فيصير سالباً.' }];
    let pair = PAIRS[0], moved = 0, parts = [], rubX = 0, papers = 0;
    const sel = h('select', { class: 'ans', 'aria-label': 'زوج المواد', style: 'min-width:0' }, ...PAIRS.map(p => h('option', { value: p.id }, `${p.a} / ${p.b}`)));
    const cvs = canvasIn(el, 0.45, 240, 360);
    const ro = readout(), nt = note(''); el.append(ro);
    el.append(h('div', { class: 'row', style: 'margin-top:8px' }, sel, btn('ادلك', () => rub()), btn('قرّب من قصاصات الورق', () => { papers = 1; an.start(); }), btn('إعادة', () => { moved = 0; parts = []; papers = 0; draw(); })), nt,
      note('يمكنك أيضاً سحب القطعة اليمنى ذهاباً وإياباً فوق الجسم لتدلكه.'));
    sel.onchange = () => { pair = PAIRS.find(p => p.id === sel.value); moved = 0; parts = []; papers = 0; draw(); };
    let geo = {};
    const rub = () => { for (let i = 0; i < 3; i++) parts.push({ t: -i * 0.15 }); rubX = 1; an.start(); };
    const an = loop(el, dt => {
      parts.forEach(p => p.t += dt * 1.4); const done = parts.filter(p => p.t >= 1); moved += done.length; parts = parts.filter(p => p.t < 1);
      rubX = Math.max(0, rubX - dt * 2); if (papers && papers < 2) papers = Math.min(2, papers + dt);
      draw(); return parts.length > 0 || rubX > 0 || (papers > 0 && papers < 2);
    });
    function draw() {
      const { ctx, W, H } = cvs, c = col(); ctx.clearRect(0, 0, W, H);
      const ax = W * 0.3, bx = W * 0.68 - rubX * 30 * Math.sin(rubX * 20), cy = H * 0.42; geo = { ax, bx, cy };
      const qa = pair.to === 'a' ? -moved : moved, qb = -qa;
      // الجسم أ
      if (pair.id === 'bw') { ctx.beginPath(); ctx.ellipse(ax, cy, 52, 64, 0, 0, 7); ctx.fillStyle = c.pos + '55'; ctx.fill(); ctx.strokeStyle = c.muted; ctx.stroke(); }
      else { ctx.fillStyle = pair.id === 'gs' ? c.glass : pair.id === 'rw' ? c.rubber : c.ex; ctx.fillRect(ax - 90, cy - 14, 180, 28); }
      const lbl = (x, y, name, q) => { text(ctx, name, x, y, c.ink, 13, 'center', 1); text(ctx, q ? `${q > 0 ? '+' : '−'}${Math.abs(q)} (${q > 0 ? 'موجبة' : 'سالبة'})` : 'متعادل', x, y + 18, q > 0 ? c.pos : q < 0 ? c.neg : c.muted, 12); };
      lbl(ax, cy + 80, pair.a, qa);
      // القطعة ب
      ctx.fillStyle = pair.id === 'ch' ? c.cork : pair.id === 'gs' ? c.metalL : c.gold + '99';
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx - 40, cy - 34, 80, 68, 14) : ctx.rect(bx - 40, cy - 34, 80, 68); ctx.fill();
      lbl(bx, cy + 80, pair.b, qb);
      // إشارات الشحنات
      const n = Math.min(12, Math.abs(qa));
      for (let i = 0; i < n; i++) { const a = i / Math.max(1, n) * 6.28; sign(ctx, ax + Math.cos(a) * 34, cy + Math.sin(a) * 22, qa, c); sign(ctx, bx + Math.cos(a) * 24, cy + Math.sin(a) * 20, qb, c); }
      // إلكترونات منتقلة
      const from = pair.to === 'a' ? bx : ax, to = pair.to === 'a' ? ax : bx;
      parts.forEach(p => { if (p.t < 0) return; const x = from + (to - from) * p.t, y = cy - 50 - Math.sin(p.t * 3.14) * 30; ball(ctx, x, y, 7, c.neg); text(ctx, 'e', x, y, '#fff', 10); });
      if (moved || parts.length) text(ctx, `انتقلت ${moved} إلكترونات من ${pair.to === 'a' ? pair.b : pair.a} إلى ${pair.to === 'a' ? pair.a : pair.b}`, W / 2, 18, c.ink, 12);
      // قصاصات الورق
      if (papers) for (let i = 0; i < 6; i++) { const x = ax - 60 + i * 24, base = H - 14, lift = Math.min(1, Math.abs(qa) / 9) * (papers > 1 ? 1 : papers) * (base - cy - 70); ctx.fillStyle = c.surface; ctx.strokeStyle = c.muted; ctx.fillRect(x, base - lift - 6, 12, 7); ctx.strokeRect(x, base - lift - 6, 12, 7); }
      ro.innerHTML = `<span class="r">${pair.a}: <b>${qa ? (qa > 0 ? 'موجب' : 'سالب') : 'متعادل'}</b></span><span class="r">${pair.b}: <b>${qb ? (qb > 0 ? 'موجب' : 'سالب') : 'متعادل'}</b></span>`;
      nt.innerHTML = pair.note;
    }
    let lastX = null, acc = 0;
    drag(cvs.cv, { hit: (x, y) => Math.abs(x - geo.bx) < 50 && Math.abs(y - geo.cy) < 45 ? 1 : null, hover: true,
      move: (t, x) => { if (lastX != null) { acc += Math.abs(x - lastX); if (acc > 120) { acc = 0; rub(); } } lastX = x; }, up: () => { lastX = null; } });
    cvs.onResize = draw; cvs.fit(); draw();
  };

  // ============================================================ L3 الشحن بالتماس
  SIMS.L3 = function (el) {
    const st = { qa: 0, qb: 0, phase: 0, t: 0 };
    const cvs = canvasIn(el, 0.5, 250, 360); const ro = readout(); el.append(ro);
    const b1 = btn('1) المس الكرة الأولى بساق الزجاج المشحونة', () => { if (st.phase === 0) { st.phase = 1; st.t = 0; an.start(); } });
    const b2 = btn('2) دع الكرتين تتلامسان', () => { if (st.phase === 2) { st.phase = 3; st.t = 0; an.start(); } });
    el.append(h('div', { class: 'steps-ctl', style: 'margin-top:8px' }, b1, b2, btn('إعادة', () => { Object.assign(st, { qa: 0, qb: 0, phase: 0, t: 0 }); draw(); })), note('كرتان من نخاع البيلسان معلقتان بخيطين عازلين من نقطة واحدة (الكتاب، شكل 15).'));
    let angA = 0.08, angB = -0.08;
    const an = loop(el, dt => {
      st.t += dt;
      if (st.phase === 1 && st.t > 1.2) { st.qa = 4; st.phase = 2; }
      if (st.phase === 3) { if (st.t < 0.6) { angA = 0.08 - st.t * 0.12; } else if (st.qb === 0) { st.qa = 2; st.qb = 2; } }
      const target = st.qa && st.qb ? 0.45 : 0.08;
      angA += ((st.phase === 3 && st.t < 0.6 ? angA : target) - angA) * Math.min(1, dt * 3); angB += (-target - angB) * Math.min(1, dt * 3);
      draw(); return st.phase === 1 || (st.phase === 3 && (st.t < 3));
    });
    function draw() {
      const { ctx, W, H } = cvs, c = col(); ctx.clearRect(0, 0, W, H);
      const px = W / 2, py = 24, L = H * 0.62;
      ctx.fillStyle = c.metal; ctx.fillRect(px - 80, py - 8, 160, 6);
      [[angA, st.qa, 'الكرة الأولى'], [angB, st.qb, 'الكرة الثانية']].forEach(([a, q, n], i) => {
        const x = px + Math.sin(a) * L * (i ? 1 : 1) * (i ? 1 : 1), y = py + Math.cos(a) * L;
        const xx = i ? px + Math.sin(a) * L : px + Math.sin(a) * L;
        ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(xx, y); ctx.stroke();
        ball(ctx, xx, y, 16, c.surface, c.muted);
        for (let k = 0; k < q; k++) sign(ctx, xx - 8 + (k % 2) * 16, y - 6 + Math.floor(k / 2) * 12, 1, c, 12);
        text(ctx, n, xx + (i ? -40 : 40), y + 28, c.ink, 12);
      });
      if (st.phase === 1) { const t = Math.min(1, st.t / 0.6); const ax = px + Math.sin(angA) * L, ay = py + Math.cos(angA) * L; const rx = ax + 140 - t * 118, ry = ay - 20;
        ctx.save(); ctx.translate(rx, ry); ctx.rotate(-0.3); ctx.fillStyle = c.glass; ctx.fillRect(0, -8, 150, 16); ctx.restore(); sign(ctx, rx + 20, ry - 2, 1, c); sign(ctx, rx + 50, ry - 10, 1, c); text(ctx, 'ساق زجاج مدلوكة بالحرير', rx + 70, ry - 30, c.muted, 11); }
      const msg = ['الكرتان متعادلتان.', 'تلامس الساق الموجبة الكرة الأولى…', 'الكرة الأولى صارت موجبة بالتماس. الآن دعها تلامس الكرة الثانية.', st.qb ? 'اكتسبت الكرة الثانية قسماً من شحنة الأولى بالتماس، فصارتا متشابهتين فتنافرتا.' : 'الكرتان تتلامسان…'][st.phase];
      text(ctx, msg, W / 2, H - 14, c.ink, 12);
      ro.innerHTML = `<span class="r">الكرة الأولى: <b>${st.qa ? '+' + st.qa : '0'}</b></span><span class="r">الكرة الثانية: <b>${st.qb ? '+' + st.qb : '0'}</b></span>`;
      b1.classList.toggle('done', st.phase >= 2); b2.classList.toggle('done', st.qb > 0); b1.disabled = st.phase !== 0; b2.disabled = st.phase !== 2;
    }
    cvs.onResize = draw; cvs.fit(); draw();
  };

  // ============================================================ L4 الشحن بالحث (كرة)
  SIMS.L4 = function (el) {
    const st = { s: -1, near: false, ground: false, Q: 0, log: [], flow: [] };
    const cvs = canvasIn(el, 0.5, 260, 380); const ro = readout(); el.append(ro);
    const rodSel = h('select', { class: 'ans', style: 'min-width:0', 'aria-label': 'الساق' }, h('option', { value: '-1' }, 'ساق مطاط مشحونة بشحنة سالبة'), h('option', { value: '1' }, 'ساق زجاج مشحونة بشحنة موجبة'));
    const B = {
      near: btn('1) قرّب الساق', () => act('near')), ground: btn('2) أرّض الكرة', () => act('ground')),
      cut: btn('3) اقطع التأريض', () => act('cut')), away: btn('4) أبعد الساق', () => act('away'))
    };
    const msg = note('');
    el.append(h('div', { class: 'row', style: 'margin-top:8px' }, rodSel), h('div', { class: 'steps-ctl', style: 'margin-top:8px' }, B.near, B.ground, B.cut, B.away),
      h('div', { class: 'row', style: 'margin-top:8px' }, btn('جرّب ترتيباً خاطئاً (س6)', () => wrong()), btn('إعادة', () => reset())), msg);
    rodSel.onchange = () => { st.s = +rodSel.value; reset(); };
    const ind = 4;
    function reset() { Object.assign(st, { near: false, ground: false, Q: 0, log: [], flow: [] }); draw(); }
    function act(a) {
      if (a === 'near') st.near = true;
      if (a === 'away') { st.near = false; if (st.ground) settle(); }
      if (a === 'ground') { st.ground = true; settle(); }
      if (a === 'cut') st.ground = false;
      st.log.push(a); draw(); an.start();
    }
    function settle() { const target = st.near ? st.s * ind : 0; const d = target - st.Q; if (d) { for (let i = 0; i < Math.abs(d); i++) st.flow.push({ t: -i * 0.18, dir: d < 0 ? 'out' : 'in' }); } st.Q = target; }
    // Q هنا = عدد الإلكترونات الزائدة × (−1)… نستعمل: Q بوحدات الشحنة؛ s*ind سالبة للساق الموجبة؟
    function wrong() { reset(); const seq = ['near', 'ground', 'away', 'cut']; seq.forEach((a, i) => setTimeout(() => act(a), i * 900)); }
    const an = loop(el, dt => { st.flow.forEach(f => f.t += dt * 1.2); st.flow = st.flow.filter(f => f.t < 1); draw(); return st.flow.length > 0; });
    function draw() {
      const { ctx, W, H } = cvs, c = col(); ctx.clearRect(0, 0, W, H);
      const cx = W * 0.55, cy = H * 0.42, R = Math.min(70, H * 0.22);
      // الشحنة الكلية: Q (موجب = نقص إلكترونات). عند التأريض والساق قريبة: Q = s*ind ⇒ نريد مخالفة لشحنة الساق
      const net = -st.Q; // st.Q مخزن بإشارة الساق؛ الشحنة الصافية للكرة مخالفة للساق
      const bound = st.near ? -st.s * ind : 0;               // على الجهة القريبة (مخالفة للساق)
      const free = st.near ? net - bound : 0;                 // على الجهة البعيدة
      ctx.strokeStyle = c.metal; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy + R); ctx.lineTo(cx, H - 30); ctx.stroke();
      ctx.fillStyle = c.muted; ctx.fillRect(cx - 40, H - 30, 80, 8);
      ball(ctx, cx, cy, R, c.metalL, c.metal);
      const put = (n, side, color, sgn) => { for (let i = 0; i < Math.abs(n); i++) { const a = (side === 'near' ? Math.PI : 0) + (i - (Math.abs(n) - 1) / 2) * 0.32; const x = cx + Math.cos(a) * R * 0.72, y = cy + Math.sin(a) * R * 0.72; ball(ctx, x, y, 9, color); text(ctx, sgn > 0 ? '+' : '−', x, y + 1, '#fff', 13, 'center', 1); } };
      if (st.near) {
        put(bound, 'near', bound > 0 ? c.pos : c.neg, bound);
        put(free, 'far', c.ex, free);
        text(ctx, 'مقيدة', cx - R - 4, cy + R + 14, c.ink, 11); if (free) text(ctx, 'طليقة', cx + R + 4, cy + R + 14, c.ex, 11, 'center', 1);
      } else for (let i = 0; i < Math.abs(net); i++) { const a = i / Math.abs(net) * 6.28 - 1.57; const x = cx + Math.cos(a) * R * 0.75, y = cy + Math.sin(a) * R * 0.75; ball(ctx, x, y, 9, net > 0 ? c.pos : c.neg); text(ctx, net > 0 ? '+' : '−', x, y + 1, '#fff', 13, 'center', 1); }
      // الساق
      if (st.near) { const rx = cx - R - 26; ctx.save(); ctx.translate(rx, cy); ctx.rotate(-0.5); ctx.fillStyle = st.s < 0 ? c.rubber : c.glass; ctx.fillRect(-150, -10, 150, 20); ctx.restore();
        for (let i = 0; i < 3; i++) sign(ctx, rx - 18 - i * 30, cy + 8 + i * 15, st.s, c, 15); }
      // التأريض
      if (st.ground) { const gx = cx + R * 0.7, gy = cy - R * 0.7; ctx.strokeStyle = c.skin; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + 60, gy - 30); ctx.stroke(); ctx.lineCap = 'butt';
        ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(gx + 60, gy - 30); ctx.lineTo(W - 40, gy - 30); ctx.lineTo(W - 40, H - 40); ctx.stroke(); groundSym(ctx, W - 40, H - 40, c); text(ctx, 'الأرض', W - 40, H - 14, c.ink, 11); }
      st.flow.forEach(f => { if (f.t < 0) return; const t = f.dir === 'out' ? f.t : 1 - f.t; const x0 = cx + R * 0.7, y0 = cy - R * 0.7; const x = x0 + (W - 40 - x0) * Math.min(1, t * 1.4), y = t < 0.7 ? y0 - 30 * Math.min(1, t * 3) : y0 - 30 + (H - 40 - y0 + 30) * (t - 0.7) / 0.3; ball(ctx, x, y, 6, c.neg); });
      const netTxt = net ? (net > 0 ? `موجبة (+${net})` : `سالبة (${net})`) : 'متعادلة';
      ro.innerHTML = `<span class="r">الساق: <b>${st.near ? 'قريبة' : 'بعيدة'}</b></span><span class="r">التأريض: <b>${st.ground ? 'موصولة بالأرض' : 'غير موصولة'}</b></span><span class="r">الشحنة الكلية للكرة: <b>${netTxt}</b></span>`;
      const L = st.log, last = L[L.length - 1];
      let m = 'ابدأ بتقريب الساق من الكرة المعدنية المعزولة المتعادلة.';
      if (last === 'near') m = `الساق ${st.s < 0 ? 'السالبة تنافر الإلكترونات وتدفعها إلى الجهة البعيدة (شحنات طليقة)، وتظهر في الجهة القريبة شحنة موجبة (شحنات مقيدة)' : 'الموجبة تجذب الإلكترونات إلى الجهة القريبة (مقيدة)، وتظهر في الجهة البعيدة شحنة موجبة (طليقة)'}. الكرة ما زالت متعادلة كلها.`;
      if (last === 'ground') m = st.near ? `بالتأريض ${st.s < 0 ? 'تتسرب الإلكترونات الطليقة إلى الأرض' : 'تأتي إلكترونات من الأرض فتعادل الشحنات الطليقة'}، وتبقى الشحنة المقيدة.` : 'التأريض والساق بعيدة لا يغيّر شيئاً: الكرة متعادلة.';
      if (last === 'cut') m = st.near ? 'قطعنا التأريض والساق قريبة: تبقى الشحنة المقيدة في موضعها.' : (net ? '' : 'قُطع التأريض لكن الكرة عادت متعادلة.');
      if (last === 'away') m = net ? `أبعدنا الساق: الشحنة المقيدة (${net > 0 ? 'الموجبة' : 'السالبة'}، المخالفة لشحنة الساق) تتوزع بانتظام على السطح الخارجي للكرة. نجح الشحن بالحث.` : (st.ground ? 'أبعدنا الساق والكرة ما زالت موصولة بالأرض، فعادت الإلكترونات وتعادلت الكرة. هذا خطأ الطالب في س6: يجب قطع التأريض قبل إبعاد الساق.' : 'أبعدنا الساق: عادت الشحنات إلى توزعها والكرة متعادلة.');
      if (L.join() === 'near,ground,away,cut') m = 'الترتيب الخاطئ (س6): أُبعدت الساق قبل رفع الإصبع، فعادت الكرة متعادلة. الصحيح: قطع التأريض أولاً ثم إبعاد الساق.';
      msg.innerHTML = m;
      B.near.disabled = st.near; B.away.disabled = !st.near; B.ground.disabled = st.ground; B.cut.disabled = !st.ground;
    }
    cvs.onResize = draw; cvs.fit(); draw();
  };

  // ============================================================ L5 الكشاف الكهربائي
  SIMS.L5 = function (el) {
    const KI = 8;
    const st = { Q: 0, obj: 0, p: 0, ground: false, ang: 0 };
    const leafQ = () => st.ground ? 0 : (st.Q + st.obj * st.p * KI) / 2;
    const diskQ = () => st.ground ? -st.obj * st.p * KI : (st.Q - st.obj * st.p * KI) / 2;
    const cvs = canvasIn(el, 0.55, 280, 420); const ro = readout(); el.append(ro);
    const objSel = h('select', { class: 'ans', style: 'min-width:0', 'aria-label': 'الجسم المقرّب' }, h('option', { value: '0' }, 'لا يوجد جسم'), h('option', { value: '1' }, 'جسم موجب (ساق زجاج)'), h('option', { value: '-1' }, 'جسم سالب (ساق مطاط)'));
    const sp = slider('قرب الجسم من القرص', 0, 1, 0.05, 0, v => v === 0 ? 'بعيد' : v >= 1 ? 'قريب جداً' : Math.round(v * 100) + '%', v => { st.p = v; settle(); });
    const gb = btn('ضع إصبعك على القرص (تأريض)', () => { st.ground = !st.ground; settle(); });
    const msg = note('');
    el.append(h('div', { class: 'row', style: 'margin-top:8px' }, objSel, btn('المس القرص بالجسم (شحن بالتماس)', () => contact()), gb, btn('فرّغ الكشاف', () => { st.Q = 0; st.ground = false; settle(); })), ctl(sp.el),
      h('div', { class: 'row', style: 'margin-top:8px' }, h('span', { class: 'small muted' }, 'أسئلة الكتاب:'), btn('س1 فقرة 8', () => scen(8)), btn('س1 فقرة 9', () => scen(9)), btn('س2 فقرة 3', () => scen(23))), msg,
      note('زاوية انفراج الورقتين تزداد مع مقدار الشحنة عليهما. هذا تمثيل نوعي: الكتاب لا يعطي علاقة كمية للانفراج.'));
    objSel.onchange = () => { st.obj = +objSel.value; if (!st.obj) { st.p = 0; sp.set(0); } settle(); };
    let prevLeaf = 0;
    function settle() { if (st.ground) st.Q = -st.obj * st.p * KI; draw(); an.start(); }
    function contact() { if (!st.obj) { msg.innerHTML = 'اختر جسماً مشحوناً أولاً.'; return; } st.Q += st.obj * 4; st.p = 0; sp.set(0); settle(); msg.innerHTML = `لامسنا القرص بجسم ${st.obj > 0 ? 'موجب' : 'سالب'} ثم أبعدناه: اكتسب الكشاف شحنة <b>مماثلة</b> لشحنة الجسم، فانفرجت الورقتان.`; }
    function scen(n) {
      st.ground = false;
      if (n === 8) { st.Q = 4; st.obj = 1; } if (n === 9) { st.Q = 0; st.obj = -1; st.ground = true; } if (n === 23) { st.Q = -4; st.obj = -1; }
      objSel.value = String(st.obj); st.p = 0; sp.set(0); settle();
      msg.innerHTML = { 8: 'س1 فقرة 8: الكشاف مشحون بشحنة موجبة. حرّك منزلق «قرب الجسم» لتقريب الجسم الموجب وراقب الورقتين.', 9: 'س1 فقرة 9: الكشاف متصل بالأرض. قرّب الجسم السالب وراقب الورقتين وشحنة القرص.', 23: 'س2 فقرة 3: الكشاف مشحون بشحنة سالبة. قرّب الجسم السالب وراقب الورقتين.' }[n];
    }
    const an = loop(el, dt => { const target = Math.min(68, Math.abs(leafQ()) * 9); st.ang += (target - st.ang) * Math.min(1, dt * 6); draw(true); return Math.abs(target - st.ang) > 0.3; });
    function draw(fromLoop) {
      const { ctx, W, H } = cvs, c = col(); ctx.clearRect(0, 0, W, H);
      const cx = W * 0.5, top = H * 0.22, boxY = top + 40, boxH = H * 0.62;
      ctx.fillStyle = c.glass + '66'; ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5; ctx.fillRect(cx - 110, boxY, 220, boxH); ctx.strokeRect(cx - 110, boxY, 220, boxH);
      ctx.fillStyle = c.cork; ctx.fillRect(cx - 22, boxY - 8, 44, 16);
      ctx.strokeStyle = c.metal; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, boxY + boxH * 0.45); ctx.stroke();
      ctx.fillStyle = c.metal; ctx.beginPath(); ctx.ellipse(cx, top, 46, 9, 0, 0, 7); ctx.fill();
      const ly = boxY + boxH * 0.45, len = boxH * 0.42, a = st.ang * Math.PI / 180 / 2 + 0.03;
      ctx.strokeStyle = c.gold; ctx.lineWidth = 6;
      [-1, 1].forEach(s => { ctx.beginPath(); ctx.moveTo(cx, ly); ctx.lineTo(cx + s * Math.sin(a) * len, ly + Math.cos(a) * len); ctx.stroke(); });
      const lq = Math.round(leafQ()), dq = Math.round(diskQ());
      for (let i = 0; i < Math.min(6, Math.abs(dq)); i++) sign(ctx, cx - 30 + i * 12, top - 16, dq, c, 15);
      [-1, 1].forEach(s => { for (let i = 0; i < Math.min(3, Math.ceil(Math.abs(lq) / 2)); i++) sign(ctx, cx + s * (Math.sin(a) * len * (0.4 + i * 0.22) + 12), ly + Math.cos(a) * len * (0.4 + i * 0.22), lq, c, 14); });
      if (st.obj && st.p > 0) { const ox = cx + 60 + (1 - st.p) * (W * 0.32), oy = top - 20; ctx.save(); ctx.translate(ox, oy); ctx.rotate(0.35); ctx.fillStyle = st.obj > 0 ? c.glass : c.rubber; ctx.fillRect(0, -10, 170, 20); ctx.restore(); for (let i = 0; i < 3; i++) sign(ctx, ox + 14 + i * 26, oy + 6 + i * 9, st.obj, c, 15); }
      else if (st.obj) text(ctx, `الجسم ${st.obj > 0 ? 'الموجب' : 'السالب'} بعيد — قرّبه بالمنزلق`, W - 12, 18, c.muted, 11, 'right');
      if (st.ground) { ctx.strokeStyle = c.skin; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - 40, top - 4); ctx.lineTo(cx - 110, top - 40); ctx.stroke(); ctx.lineCap = 'butt'; text(ctx, 'إصبع (تأريض)', cx - 130, top - 58, c.ink, 11); }
      text(ctx, 'القرص', cx + 70, top + 4, c.muted, 11); text(ctx, 'الورقتان', cx + 125, ly + len * 0.8, c.muted, 11, 'left');
      ro.innerHTML = `<span class="r">شحنة الورقتين: <b>${lq ? (lq > 0 ? 'موجبة' : 'سالبة') : 'لا شحنة'}</b></span><span class="r">شحنة القرص: <b>${dq ? (dq > 0 ? 'موجبة' : 'سالبة') : 'لا شحنة'}</b></span><span class="r">الورقتان: <b>${Math.abs(lq) < 0.5 ? 'منطبقتان' : 'منفرجتان'}</b></span><span class="r">الشحنة الكلية: <b>${Math.round(st.Q) ? (st.Q > 0 ? 'موجبة' : 'سالبة') : 'متعادل'}</b></span>`;
      gb.textContent = st.ground ? 'ارفع إصبعك عن القرص' : 'ضع إصبعك على القرص (تأريض)'; gb.classList.toggle('on', st.ground);
      if (!fromLoop) { const nl = Math.abs(leafQ()); if (st.obj && st.p > 0 && !st.ground) { const base = Math.abs(st.Q / 2); if (nl > base + 0.3) msg.innerHTML = 'يزداد انفراج الورقتين: الجسم يدفع شحنات مشابهة لشحنته نحو الورقتين.'; else if (nl < base - 0.3) msg.innerHTML = 'يقل انفراج الورقتين: الجسم يجذب الشحنات الموجودة على الورقتين نحو القرص.'; }
        if (st.ground && st.obj && st.p > 0) msg.innerHTML = `الكشاف موصول بالأرض: تبقى الورقتان منطبقتين، وتظهر على القرص شحنة ${st.obj < 0 ? 'موجبة' : 'سالبة'} مقيدة (مخالفة لشحنة الجسم). ارفع إصبعك ثم أبعد الجسم لتشحنه بالحث.`; prevLeaf = nl; }
      el.dataset.leaf = lq; el.dataset.disk = dq;
    }
    cvs.onResize = () => draw(true); cvs.fit(); draw();
  };

  // ============================================================ L6 المجال الكهربائي
  SIMS.L6 = function (el) {
    const st = { ch: [{ x: 9, y: 9, q: 2 }, { x: 21, y: 9, q: -2 }], test: { x: 15, y: 4 }, qt: 2, sel: 0 };
    const cvs = canvasIn(el, 0.6, 300, 520); const ro = readout(); el.append(ro);
    const sq = slider('مقدار الشحنة المحددة (μC)', -5, 5, 0.5, 2, v => (v > 0 ? '+' : '') + v, v => { if (st.ch[st.sel]) { st.ch[st.sel].q = v || 0.5; recalc(); } });
    const st2 = slider("شحنة الاختبار q′ (nC، موجبة)", 1, 10, 1, 2, v => v + ' nC', v => { st.qt = v; draw(); });
    el.append(ctl(sq.el, st2.el), h('div', { class: 'row', style: 'margin-top:8px' }, btn('أضف شحنة موجبة', () => add(1)), btn('أضف شحنة سالبة', () => add(-1)), btn('احذف المحددة', () => { if (st.ch.length > 1) { st.ch.splice(st.sel, 1); st.sel = 0; recalc(); } }), btn('شحنتان متشابهتان', () => { st.ch = [{ x: 10, y: 9, q: 2 }, { x: 20, y: 9, q: 2 }]; recalc(); }), btn('شحنتان مختلفتان', () => { st.ch = [{ x: 9, y: 9, q: 2 }, { x: 21, y: 9, q: -2 }]; recalc(); })),
      note('اسحب الشحنات أو شحنة الاختبار الصفراء. الخطوط تبدأ من الشحنة الموجبة وتنتهي بالسالبة. اللوحة تمثل 30 cm عرضاً.'));
    const add = s => { if (st.ch.length >= 4) { P.toast('الحد الأقصى أربع شحنات.'); return; } st.ch.push({ x: 15, y: 13, q: 2 * s }); st.sel = st.ch.length - 1; recalc(); };
    let sc = 20, lines = [];
    const E = (x, y) => { let ex = 0, ey = 0; st.ch.forEach(c => { const dx = (x - c.x) / 100, dy = (y - c.y) / 100, r2 = dx * dx + dy * dy, r = Math.sqrt(r2); if (r < 1e-4) return; const e = K * c.q * 1e-6 / r2; ex += e * dx / r; ey += e * dy / r; }); return [ex, ey]; };
    function recalc() {
      sc = cvs.W / 30; const px = st.ch.map(c => ({ x: c.x * sc, y: c.y * sc, q: c.q }));
      lines = P.traceLines(px, { per: 10, w: cvs.W, h: cvs.H, step: 4, r0: 14, max: 1500, pad: cvs.W }); sq.set(st.ch[st.sel] ? st.ch[st.sel].q : 0); draw();
    }
    function draw() {
      const { ctx, W, H } = cvs, c = col(); ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = c.lineF; ctx.lineWidth = 1.2;
      lines.forEach(l => { ctx.beginPath(); l.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
        const k = Math.floor(l.pts.length * 0.35); if (l.pts.length > k + 2) { const [a, b] = l.dir > 0 ? [l.pts[k], l.pts[k + 2]] : [l.pts[k + 2], l.pts[k]]; P.arrow(ctx, a[0], a[1], b[0], b[1], c.lineF, 1.2); } });
      st.ch.forEach((q, i) => { const r = 12 + Math.abs(q.q) * 1.5; ball(ctx, q.x * sc, q.y * sc, r, q.q > 0 ? c.pos : c.neg, i === st.sel ? c.ink : null); text(ctx, q.q > 0 ? '+' : '−', q.x * sc, q.y * sc + 1, '#fff', 15, 'center', 1); text(ctx, `${q.q > 0 ? '+' : ''}${q.q} μC`, q.x * sc, q.y * sc - r - 10, c.ink, 11); });
      const [ex, ey] = E(st.test.x, st.test.y), mag = Math.hypot(ex, ey);
      const tx = st.test.x * sc, ty = st.test.y * sc, L = Math.min(90, 14 + 14 * Math.log10(1 + mag / 1e4));
      if (mag > 0) P.arrow(ctx, tx, ty, tx + ex / mag * L, ty + ey / mag * L, c.law, 3);
      ball(ctx, tx, ty, 8, c.gold, c.ink); text(ctx, "q′", tx, ty - 16, c.ink, 12, 'center', 1);
      const F = st.qt * 1e-9 * mag;
      ro.innerHTML = `<span class="r">E عند شحنة الاختبار = <b>${HTMLsci(mag)} N/C</b></span><span class="r">q′ = <span class="ltr">${st.qt}×10<sup>−9</sup> C</span></span><span class="r">F = q′E = <b>${HTMLsci(F)} N</b></span><span class="r">التحقق: E = F/q′ = ${HTMLsci(F / (st.qt * 1e-9))} N/C</span>`;
      el.dataset.e = mag;
    }
    drag(cvs.cv, {
      hit: (x, y) => { if (Math.hypot(x - st.test.x * sc, y - st.test.y * sc) < 16) return 't'; const i = st.ch.findIndex(q => Math.hypot(x - q.x * sc, y - q.y * sc) < 22); return i >= 0 ? i : null; }, hover: true,
      down: t => { if (t !== 't') { st.sel = t; sq.set(st.ch[t].q); draw(); } },
      move: (t, x, y) => { x = Math.max(8, Math.min(cvs.W - 8, x)) / sc; y = Math.max(8, Math.min(cvs.H - 8, y)) / sc; if (t === 't') { st.test.x = x; st.test.y = y; draw(); } else { st.ch[t].x = x; st.ch[t].y = y; recalc(); } }
    });
    cvs.onResize = recalc; cvs.fit(); recalc();
  };

  // ============================================================ L7 المجال المنتظم
  SIMS.L7 = function (el) {
    const st = { E: 2000, qt: 2, tx: 0.5, ty: 0.5 };
    const cvs = canvasIn(el, 0.5, 260, 400); const ro = readout(); el.append(ro);
    const se = slider('مقدار المجال بين اللوحين E (N/C)', 1000, 5000, 500, st.E, v => P.strip(P.sci(v)) + ' N/C', v => { st.E = v; draw(); });
    const sq = slider("شحنة الاختبار q′ (nC)", 1, 10, 1, st.qt, v => v + ' nC', v => { st.qt = v; draw(); });
    el.append(ctl(se.el, sq.el), note('اسحب شحنة الاختبار إلى أي نقطة بين اللوحين: قيمة E واتجاهه لا يتغيران. عدد الخطوط المرسومة يزداد مع قيمة المجال (تمثيل بالرسم).'));
    let geo = {};
    function draw() {
      const { ctx, W, H } = cvs, c = col(); ctx.clearRect(0, 0, W, H);
      const x1 = 50, x2 = W - 50, y1 = 24, y2 = H - 24; geo = { x1, x2, y1, y2 };
      ctx.fillStyle = c.pos; ctx.fillRect(x1 - 16, y1, 16, y2 - y1); ctx.fillStyle = c.neg; ctx.fillRect(x2, y1, 16, y2 - y1);
      for (let i = 0; i < 6; i++) { sign(ctx, x1 - 8, y1 + 14 + i * (y2 - y1 - 28) / 5, 1, { pos: '#fff', neg: '#fff' }, 14); sign(ctx, x2 + 8, y1 + 14 + i * (y2 - y1 - 28) / 5, -1, { pos: '#fff', neg: '#fff' }, 14); }
      const n = 2 + st.E / 500;
      for (let i = 0; i < n; i++) { const y = y1 + (i + 0.5) * (y2 - y1) / n; ctx.strokeStyle = c.lineF; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x1 + 4, y); ctx.lineTo(x2 - 4, y); ctx.stroke(); P.arrow(ctx, (x1 + x2) / 2 - 6, y, (x1 + x2) / 2 + 6, y, c.lineF, 1.3); }
      const tx = x1 + st.tx * (x2 - x1), ty = y1 + st.ty * (y2 - y1);
      P.arrow(ctx, tx, ty, tx + 30 + st.E / 100, ty, c.law, 3.5); ball(ctx, tx, ty, 9, c.gold, c.ink); text(ctx, "q′", tx, ty - 18, c.ink, 12, 'center', 1);
      text(ctx, `E = ${sciTxt(st.E)} N/C`, tx + 40 + st.E / 100, ty - 14, c.law, 12, 'left', 1);
      ro.innerHTML = `<span class="r">E في هذه النقطة = <b>${HTMLsci(st.E)} N/C</b> (ثابت في كل النقاط)</span><span class="r">الاتجاه: من اللوح الموجب إلى السالب</span><span class="r">F = q′E = <span class="ltr">${st.qt}×10<sup>−9</sup> × ${P.sci(st.E)}</span> = <b>${HTMLsci(st.qt * 1e-9 * st.E)} N</b></span>`;
    }
    drag(cvs.cv, { hit: (x, y) => { const tx = geo.x1 + st.tx * (geo.x2 - geo.x1), ty = geo.y1 + st.ty * (geo.y2 - geo.y1); return Math.hypot(x - tx, y - ty) < 18 ? 1 : null; }, hover: true,
      move: (t, x, y) => { st.tx = Math.max(0.03, Math.min(0.85, (x - geo.x1) / (geo.x2 - geo.x1))); st.ty = Math.max(0.05, Math.min(0.95, (y - geo.y1) / (geo.y2 - geo.y1))); draw(); } });
    cvs.onResize = draw; cvs.fit(); draw();
  };

  // ============================================================ L8 الموصل والعازل
  SIMS.L8 = function (el) {
    const RODS = [{ id: 'cu', n: 'ساق نحاس ممسوكة باليد مباشرة' }, { id: 'cuh', n: 'ساق نحاس بمقبض عازل' }, { id: 'gl', n: 'ساق زجاج (عازل) مدلوكة بالحرير' }];
    const st = { rod: 'cu', charge: 0, leak: [], near: 0 };
    const sel = h('select', { class: 'ans', style: 'min-width:0', 'aria-label': 'الساق' }, ...RODS.map(r => h('option', { value: r.id }, r.n)));
    const cvs = canvasIn(el, 0.45, 240, 360); const ro = readout(); el.append(ro); const msg = note('');
    el.append(h('div', { class: 'row', style: 'margin-top:8px' }, sel, btn(st.rod === 'gl' ? 'ادلك' : 'ادلك بالصوف', () => rub()), btn('قرّب من القصاصات', () => { st.near = 0.001; an.start(); }), btn('إعادة', () => { st.charge = 0; st.near = 0; st.leak = []; draw(); })), msg);
    sel.onchange = () => { st.rod = sel.value; st.charge = 0; st.near = 0; st.leak = []; draw(); };
    function rub() { st.charge = 6; st.near = 0; if (st.rod === 'cu') { for (let i = 0; i < 6; i++) st.leak.push({ t: -i * 0.2 }); } an.start(); draw(); }
    const an = loop(el, dt => { st.leak.forEach(l => l.t += dt * 0.9); const gone = st.leak.filter(l => l.t >= 1).length; if (gone) { st.charge = Math.max(0, st.charge - gone); st.leak = st.leak.filter(l => l.t < 1); }
      if (st.near) st.near = Math.min(1, st.near + dt * 1.5); draw(); return st.leak.length > 0 || (st.near > 0 && st.near < 1); });
    function draw() {
      const { ctx, W, H } = cvs, c = col(); ctx.clearRect(0, 0, W, H);
      const ry = H * 0.35 + st.near * H * 0.12, rx1 = W * 0.18, rx2 = W * 0.7;
      ctx.fillStyle = st.rod === 'gl' ? c.glass : c.copper; ctx.fillRect(rx1, ry - 10, rx2 - rx1, 20);
      if (st.rod === 'cuh') { ctx.fillStyle = c.rubber; ctx.fillRect(rx2, ry - 12, 70, 24); text(ctx, 'مقبض عازل', rx2 + 35, ry - 24, c.muted, 11); }
      const hx = st.rod === 'cuh' ? rx2 + 40 : rx2 + 10;
      ctx.strokeStyle = c.skin; ctx.lineWidth = 22; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx, ry); ctx.lineTo(W - 30, H - 20); ctx.stroke(); ctx.lineCap = 'butt';
      if (st.rod === 'cu') { groundSym(ctx, W - 30, H - 14, c); }
      for (let i = 0; i < st.charge - st.leak.filter(l => l.t > 0).length; i++) { const x = rx1 + 20 + i * ((rx2 - rx1 - 40) / 6); if (st.rod === 'gl') sign(ctx, x, ry, 1, c, 15); else { ball(ctx, x, ry, 5, c.ink); } }
      st.leak.forEach(l => { if (l.t <= 0) return; const t = l.t; const x = t < 0.4 ? rx1 + (hx - rx1) * t / 0.4 : hx + (W - 30 - hx) * (t - 0.4) / 0.6, y = t < 0.4 ? ry : ry + (H - 20 - ry) * (t - 0.4) / 0.6; ball(ctx, x, y, 5, c.ink); });
      const attract = st.charge > 0 && st.near > 0;
      for (let i = 0; i < 7; i++) { const x = rx1 + 10 + i * 26, base = H - 12, lift = attract ? st.near * (base - ry - 22) * (0.7 + (i % 3) * 0.1) : 0; ctx.fillStyle = c.surface; ctx.strokeStyle = c.muted; ctx.fillRect(x, base - lift - 7, 14, 7); ctx.strokeRect(x, base - lift - 7, 14, 7); }
      text(ctx, 'قصاصات ورق', rx1 + 90, H - 26 - (attract ? 0 : 0), c.muted, 11);
      ro.innerHTML = `<span class="r">الشحنة على الساق: <b>${st.charge ? 'موجودة' : 'لا توجد'}</b></span><span class="r">القصاصات: <b>${st.near ? (attract ? 'تنجذب' : 'لا تنجذب') : '—'}</b></span>`;
      msg.innerHTML = st.rod === 'cu' ? (st.leak.length || st.near ? 'الشحنات المتولدة على ساق النحاس بالدلك تتسرب مباشرة إلى الأرض عن طريق جسمك (النحاس موصل)، فلا تنجذب القصاصات.' : 'أمسك ساق النحاس بيدك مباشرة، ثم ادلكها بالصوف أو الفرو.')
        : st.rod === 'cuh' ? 'المقبض العازل يمنع تسرب الشحنات: ساق النحاس المعزولة تحتفظ بالشحنة لفترة قصيرة فتجذب القصاصات (شكل 23).'
          : 'الزجاج عازل: الشحنات لا تتحرك فيه بحرية، فتبقى على الساق (موجبة بعد دلكها بالحرير) وتجذب القصاصات.';
    }
    cvs.onResize = draw; cvs.fit(); draw();
  };

  // ============================================================ L9 المرذاذ
  SIMS.L9 = function (el) {
    const st = { charged: true, grounded: true, run: false, ps: [], hits: new Array(24).fill(0) };
    const cvs = canvasIn(el, 0.5, 260, 380); const ro = readout(); el.append(ro);
    const b1 = btn('', () => { st.charged = !st.charged; reset(); }), b2 = btn('', () => { st.grounded = !st.grounded; reset(); }), b3 = btn('ابدأ الرش', () => { st.run = !st.run; if (st.run) an.start(); upd(); });
    el.append(h('div', { class: 'row', style: 'margin-top:8px' }, b3, b1, b2, btn('امسح الطلاء', reset)), note('القطيرات الموجبة تتنافر فتنتشر، وتنجذب إلى الجسم الموصول بالأرض أو بالقطب السالب. تمثيل نوعي لحركة القطيرات.'));
    function reset() { st.ps = []; st.hits.fill(0); upd(); draw(); }
    function upd() { b1.textContent = st.charged ? 'الفوهة موصولة بالقطب الموجب' : 'الفوهة غير موصولة'; b1.classList.toggle('on', st.charged); b2.textContent = st.grounded ? 'الجسم موصول بالأرض' : 'الجسم غير موصول'; b2.classList.toggle('on', st.grounded); b3.textContent = st.run ? 'أوقف الرش' : 'ابدأ الرش'; }
    const an = loop(el, dt => {
      const { W, H } = cvs, nx = 70, ny = H * 0.5, carX = W - 120;
      if (st.run) for (let i = 0; i < 4; i++) st.ps.push({ x: nx + 20, y: ny + (Math.random() - .5) * 4, vx: 160 + Math.random() * 40, vy: (Math.random() - .5) * (st.charged ? 30 : 16) });
      st.ps.forEach(p => {
        if (st.charged) { p.vy += (p.y - ny) * 2.2 * dt; }
        if (st.charged && st.grounded) { p.vx += 90 * dt; }
        p.vy += 30 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x >= carX) { const yi = Math.floor((p.y - (H * 0.12)) / ((H * 0.76) / 24)); if (yi >= 0 && yi < 24) st.hits[yi]++; p.dead = true; }
        if (p.y > H || p.y < 0) p.dead = true;
      });
      st.ps = st.ps.filter(p => !p.dead).slice(-500); draw(); return st.run || st.ps.length > 0;
    });
    function draw() {
      const { ctx, W, H } = cvs, c = col(); ctx.clearRect(0, 0, W, H);
      const nx = 70, ny = H * 0.5, carX = W - 120;
      ctx.fillStyle = c.metal; ctx.fillRect(nx - 50, ny - 14, 70, 28); ctx.beginPath(); ctx.moveTo(nx + 20, ny - 8); ctx.lineTo(nx + 34, ny - 3); ctx.lineTo(nx + 34, ny + 3); ctx.lineTo(nx + 20, ny + 8); ctx.fill();
      if (st.charged) sign(ctx, nx - 15, ny - 26, 1, c, 16); text(ctx, 'المرذاذ', nx - 15, ny + 30, c.ink, 12);
      ctx.fillStyle = c.surface2; ctx.strokeStyle = c.muted; ctx.fillRect(carX, H * 0.12, 70, H * 0.76); ctx.strokeRect(carX, H * 0.12, 70, H * 0.76);
      const max = Math.max(1, ...st.hits);
      st.hits.forEach((v, i) => { ctx.fillStyle = c.ex; ctx.globalAlpha = Math.min(1, v / Math.max(8, max)); ctx.fillRect(carX, H * 0.12 + i * (H * 0.76 / 24), 70, H * 0.76 / 24 + 0.5); }); ctx.globalAlpha = 1;
      text(ctx, 'الجسم المراد صبغه', carX + 35, H * 0.08, c.ink, 12);
      if (st.grounded) { ctx.strokeStyle = c.ink; ctx.beginPath(); ctx.moveTo(carX + 35, H * 0.88); ctx.lineTo(carX + 35, H - 18); ctx.stroke(); groundSym(ctx, carX + 35, H - 18, c); }
      st.ps.forEach(p => { ball(ctx, p.x, p.y, st.charged ? 3 : 2.5, st.charged ? c.pos : c.muted); });
      const tot = st.hits.reduce((a, b) => a + b, 0), cover = st.hits.filter(v => v > 0).length / 24;
      ro.innerHTML = `<span class="r">قطيرات وصلت: <b>${tot}</b></span><span class="r">نسبة السطح المطلي: <b>${Math.round(cover * 100)}%</b></span><span class="r">${st.charged && st.grounded ? 'الطلاء ينتشر ويتجانس' : 'الطلاء يتركز في بقعة'}</span>`;
    }
    cvs.onResize = draw; upd(); cvs.fit(); draw();
  };

  // ============================================================ L10 الأقطاب المغناطيسية
  SIMS.L10 = function (el) {
    const st = { m: [{ x: 0.28, y: 0.35, flip: false }, { x: 0.7, y: 0.35, flip: false }], pieces: 1 };
    const cvs = canvasIn(el, 0.55, 280, 420); const ro = readout(); el.append(ro);
    el.append(h('div', { class: 'row', style: 'margin-top:8px' }, btn('اقلب المغناطيس الأيمن', () => { st.m[1].flip = !st.m[1].flip; draw(); }), btn('اقلب المغناطيس الأيسر', () => { st.m[0].flip = !st.m[0].flip; draw(); }), btn('قطّع المغناطيس أكثر', () => { st.pieces = st.pieces >= 8 ? 1 : st.pieces * 2; draw(); })),
      note('اسحب المغناطيسين لتقريب قطبين من بعضهما. اللون الأحمر للقطب الشمالي N والأزرق للجنوبي S. الشريط السفلي يبين أن كل قطعة من مغناطيس مقطّع لها قطبان.'));
    const BW = 140, BH = 30;
    const poles = (m, W, H) => { const cx = m.x * W, cy = m.y * H, l = { x: cx - BW / 2 + 12, y: cy, n: m.flip ? 'S' : 'N' }, r = { x: cx + BW / 2 - 12, y: cy, n: m.flip ? 'N' : 'S' }; return [l, r]; };
    function draw() {
      const { ctx, W, H } = cvs, c = col(); ctx.clearRect(0, 0, W, H);
      st.m.forEach(m => { const cx = m.x * W, cy = m.y * H; const [l, r] = poles(m, W, H);
        ctx.fillStyle = l.n === 'N' ? c.pos : c.neg; ctx.fillRect(cx - BW / 2, cy - BH / 2, BW / 2, BH); ctx.fillStyle = r.n === 'N' ? c.pos : c.neg; ctx.fillRect(cx, cy - BH / 2, BW / 2, BH);
        text(ctx, l.n, l.x, cy + 1, '#fff', 15, 'center', 1); text(ctx, r.n, r.x, cy + 1, '#fff', 15, 'center', 1); });
      // أقرب قطبين متقابلين
      const P0 = poles(st.m[0], W, H), P1 = poles(st.m[1], W, H); let best = null;
      P0.forEach(a => P1.forEach(b => { const d = Math.hypot(a.x - b.x, a.y - b.y); if (!best || d < best.d) best = { a, b, d }; }));
      let kind = '—';
      if (best) { const same = best.a.n === best.b.n; kind = same ? 'تنافر' : 'تجاذب'; const strength = Math.min(1, 60 / Math.max(20, best.d));
        const dx = (best.b.x - best.a.x) / best.d, dy = (best.b.y - best.a.y) / best.d, L = 20 + 50 * strength, s = same ? -1 : 1;
        if (best.d > 30) { P.arrow(ctx, best.a.x, best.a.y - 26, best.a.x + s * dx * L, best.a.y - 26 + s * dy * L, c.law, 3); P.arrow(ctx, best.b.x, best.b.y - 26, best.b.x - s * dx * L, best.b.y - 26 - s * dy * L, c.law, 3); }
        text(ctx, `${best.a.n} مقابل ${best.b.n}: ${kind}`, (best.a.x + best.b.x) / 2, Math.min(best.a.y, best.b.y) - 50, c.ink, 13, 'center', 1); }
      // التقطيع
      const y0 = H * 0.78, tw = W * 0.7, x0 = (W - tw) / 2, n = st.pieces, gap = n > 1 ? 10 : 0, pw = (tw - gap * (n - 1)) / n;
      text(ctx, n === 1 ? 'مغناطيس كامل' : `قُطّع إلى ${n} قطع: كل قطعة لها N و S`, W / 2, y0 - 22, c.muted, 12);
      for (let i = 0; i < n; i++) { const x = x0 + i * (pw + gap); ctx.fillStyle = c.pos; ctx.fillRect(x, y0, pw / 2, 22); ctx.fillStyle = c.neg; ctx.fillRect(x + pw / 2, y0, pw / 2, 22); if (pw > 34) { text(ctx, 'N', x + 9, y0 + 11, '#fff', 11, 'center', 1); text(ctx, 'S', x + pw - 9, y0 + 11, '#fff', 11, 'center', 1); } }
      ro.innerHTML = `<span class="r">النتيجة: <b>${kind}</b></span><span class="r">القاعدة: الأقطاب المتشابهة تتنافر، والمختلفة تتجاذب</span>`;
      el.dataset.kind = kind;
    }
    drag(cvs.cv, { hit: (x, y) => { const i = st.m.findIndex(m => Math.abs(x - m.x * cvs.W) < BW / 2 && Math.abs(y - m.y * cvs.H) < BH); return i >= 0 ? i : null; }, hover: true,
      move: (t, x, y) => { st.m[t].x = Math.max(BW / 2 / cvs.W, Math.min(1 - BW / 2 / cvs.W, x / cvs.W)); st.m[t].y = Math.max(0.12, Math.min(0.6, y / cvs.H)); draw(); } });
    cvs.onResize = draw; cvs.fit(); draw();
  };

  // ============================================================ L11 خطوط المجال المغناطيسي
  SIMS.L11 = function (el) {
    const st = { type: 'bar', comps: [], lines: true, filings: [], fprog: 0 };
    const cvs = canvasIn(el, 0.6, 300, 500); const ro = readout(); el.append(ro);
    const sel = h('select', { class: 'ans', style: 'min-width:0', 'aria-label': 'نوع المغناطيس' }, h('option', { value: 'bar' }, 'ساق مغناطيسية'), h('option', { value: 'u' }, 'مغناطيس بشكل حرف U'));
    const lb = btn('أخفِ الخطوط', () => { st.lines = !st.lines; lb.textContent = st.lines ? 'أخفِ الخطوط' : 'أظهر الخطوط'; draw(); });
    el.append(h('div', { class: 'row', style: 'margin-top:8px' }, sel, btn('انثر برادة الحديد', () => scatter()), lb, btn('ضع بوصلات حول المغناطيس', () => ring()), btn('امسح', () => { st.comps = []; st.filings = []; draw(); })),
      note('اضغط على أي مكان لتضع بوصلة، واسحب البوصلة لتحريكها. القطب الشمالي للإبرة (الأحمر) يشير باتجاه المجال: من N إلى S خارج المغناطيس.'));
    sel.onchange = () => { st.type = sel.value; st.filings = []; recalc(); };
    let poles = [], lines = [];
    function recalc() {
      const { W, H } = cvs, cx = W / 2, cy = H / 2;
      if (st.type === 'bar') poles = [{ x: cx + 55, y: cy, q: 1 }, { x: cx - 55, y: cy, q: -1 }];
      else poles = [{ x: cx + 40, y: cy - 40, q: 1 }, { x: cx - 40, y: cy - 40, q: -1 }];
      lines = P.traceLines(poles, { per: 14, w: W, h: H, step: 4, r0: 10, max: 1200, pad: 40, mirrorX: cx }); draw();
    }
    const B = (x, y) => P.fieldAt(poles, x, y);
    const inside = (x, y) => { const { W, H } = cvs, cx = W / 2, cy = H / 2; if (st.type === 'bar') return Math.abs(x - cx) < 72 && Math.abs(y - cy) < 16; return (Math.abs(x - (cx - 40)) < 16 || Math.abs(x - (cx + 40)) < 16) && y > cy - 46 && y < cy + 60 || (y > cy + 40 && y < cy + 70 && Math.abs(x - cx) < 56); };
    function scatter() { st.filings = []; const { W, H } = cvs; for (let i = 0; i < 1600; i++) { const x = Math.random() * W, y = Math.random() * H; if (!inside(x, y)) st.filings.push([x, y]); } st.fprog = 0; an.start(); }
    function ring() { const { W, H } = cvs; st.comps = []; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; st.comps.push({ x: W / 2 + Math.cos(a) * W * 0.27, y: H / 2 + Math.sin(a) * H * 0.33 }); } draw(); }
    const an = loop(el, dt => { st.fprog = Math.min(1, st.fprog + dt * 1.2); draw(); return st.fprog < 1; });
    function draw() {
      const { ctx, W, H } = cvs, c = col(); ctx.clearRect(0, 0, W, H); const cx = W / 2, cy = H / 2;
      const nF = Math.floor(st.filings.length * st.fprog); ctx.strokeStyle = c.ink; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.6;
      for (let i = 0; i < nF; i++) { const [x, y] = st.filings[i]; const [bx, by] = B(x, y), m = Math.hypot(bx, by) || 1; ctx.beginPath(); ctx.moveTo(x - bx / m * 4, y - by / m * 4); ctx.lineTo(x + bx / m * 4, y + by / m * 4); ctx.stroke(); }
      ctx.globalAlpha = 1;
      if (st.lines) { ctx.strokeStyle = c.lineF; ctx.lineWidth = 1.2; lines.forEach(l => { const pts = l.pts.filter(p => !inside(p[0], p[1])); if (pts.length < 3) return; ctx.beginPath(); l.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); const k = Math.floor(l.pts.length * 0.4); if (l.pts[k + 2]) { const [a, b] = l.dir > 0 ? [l.pts[k], l.pts[k + 2]] : [l.pts[k + 2], l.pts[k]]; P.arrow(ctx, a[0], a[1], b[0], b[1], c.lineF, 1.2); } }); }
      if (st.type === 'bar') { ctx.fillStyle = c.neg; ctx.fillRect(cx - 72, cy - 16, 72, 32); ctx.fillStyle = c.pos; ctx.fillRect(cx, cy - 16, 72, 32); text(ctx, 'S', cx - 52, cy + 1, '#fff', 16, 'center', 1); text(ctx, 'N', cx + 52, cy + 1, '#fff', 16, 'center', 1); }
      else { ctx.fillStyle = c.neg; ctx.fillRect(cx - 56, cy - 46, 32, 100); ctx.fillRect(cx - 56, cy + 40, 56, 30); ctx.fillStyle = c.pos; ctx.fillRect(cx + 24, cy - 46, 32, 100); ctx.fillRect(cx, cy + 40, 56, 30); text(ctx, 'S', cx - 40, cy - 30, '#fff', 15, 'center', 1); text(ctx, 'N', cx + 40, cy - 30, '#fff', 15, 'center', 1); }
      st.comps.forEach(p => { const [bx, by] = B(p.x, p.y), a = Math.atan2(by, bx); ball(ctx, p.x, p.y, 14, c.surface, c.muted); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
        ctx.fillStyle = c.pos; ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(0, -4); ctx.lineTo(0, 4); ctx.fill(); ctx.fillStyle = c.neg; ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(0, -4); ctx.lineTo(0, 4); ctx.fill(); ctx.restore(); });
      ro.innerHTML = `<span class="r">بوصلات: <b>${st.comps.length}</b></span><span class="r">الخطوط مقفلة، غير مرئية، من N إلى S خارج المغناطيس</span>`;
    }
    drag(cvs.cv, { hit: (x, y) => { const i = st.comps.findIndex(p => Math.hypot(x - p.x, y - p.y) < 16); return i >= 0 ? i : null; }, hover: true,
      move: (t, x, y) => { st.comps[t].x = x; st.comps[t].y = y; draw(); },
      click: (x, y) => { if (inside(x, y)) return; if (st.comps.length >= 16) st.comps.shift(); st.comps.push({ x, y }); draw(); } });
    cvs.onResize = () => { st.filings = []; recalc(); }; cvs.fit(); recalc();
  };

  // ============================================================ L12 المواد المغناطيسية
  SIMS.L12 = function (el) {
    const M = [['البزموث', 'dia'], ['الإنتيمون', 'dia'], ['النحاس', 'dia'], ['السيليكون', 'dia'], ['الفضة', 'dia'], ['الألمنيوم', 'para'], ['الكالسيوم', 'para'], ['الصوديوم', 'para'], ['التيتانيوم', 'para'], ['الحديد', 'ferro'], ['الفولاذ', 'ferro'], ['النيكل', 'ferro'], ['الكوبلت', 'ferro']];
    const BN = { dia: 'دايا مغناطيسية', para: 'بارا مغناطيسية', ferro: 'فيرومغناطيسية' };
    const st = { placed: {}, sel: null, demo: null, strong: true, t: 0 };
    const tray = h('div', { class: 'tokens', 'aria-label': 'المواد' });
    const bins = h('div', { class: 'bins' }, ...Object.entries(BN).map(([k, v]) => h('div', { class: 'bin', 'data-bin': k }, h('h4', null, v), h('div', { class: 'tokens' }))));
    const ro = readout();
    el.append(note('صنّف مواد الكتاب: اضغط مادة ثم اضغط الصندوق المناسب (أو اسحبها إليه). بعد التصنيف اضغط أي مادة لترى سلوكها قرب المغناطيس.'), tray, bins, ro);
    const cvs = canvasIn(el, 0.3, 160, 220);
    const strongB = btn('مغناطيس قوي', () => { st.strong = !st.strong; strongB.textContent = st.strong ? 'مغناطيس قوي' : 'مغناطيس اعتيادي'; st.t = 0; an.start(); });
    el.append(h('div', { class: 'row', style: 'margin-top:8px' }, h('span', { class: 'small' }, 'نوع المغناطيس في التجربة:'), strongB, btn('أعد التصنيف', () => { st.placed = {}; st.demo = null; render(); })));
    function render() {
      tray.innerHTML = ''; $$('.bin .tokens', bins).forEach(b => b.innerHTML = '');
      M.forEach(([n, k]) => {
        const p = st.placed[n]; const t = h('span', { class: 'token' + (st.sel === n ? ' sel' : '') + (p ? (p === k ? ' right' : ' wrong') : ''), tabindex: '0', role: 'button', 'data-n': n }, n);
        t.onclick = e => { e.stopPropagation(); if (p === k) { st.demo = n; st.t = 0; an.start(); drawDemo(); return; } st.sel = st.sel === n ? null : n; render(); };
        t.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t.click(); } };
        t.addEventListener('pointerdown', e => startDrag(e, n));
        (p ? $(`.bin[data-bin="${p}"] .tokens`, bins) : tray).append(t);
      });
      const right = M.filter(([n, k]) => st.placed[n] === k).length;
      ro.innerHTML = `<span class="r">صحيح: <b>${right} / ${M.length}</b></span>${right === M.length ? '<span class="r"><b>أحسنت! صنّفت كل المواد.</b></span>' : ''}`;
      drawDemo();
    }
    $$('.bin', bins).forEach(b => b.addEventListener('click', () => { if (st.sel) { st.placed[st.sel] = b.dataset.bin; st.sel = null; render(); } }));
    let dragN = null, ghost = null;
    function startDrag(e, n) {
      dragN = n; ghost = null; const sx = e.clientX, sy = e.clientY;
      const mv = ev => { if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) { ghost = h('span', { class: 'token sel', style: 'position:fixed;pointer-events:none;z-index:99' }, n); document.body.append(ghost); }
        if (ghost) { ghost.style.left = ev.clientX + 8 + 'px'; ghost.style.top = ev.clientY + 8 + 'px'; $$('.bin', bins).forEach(b => { const r = b.getBoundingClientRect(); b.classList.toggle('over', ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom); }); } };
      const up = ev => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
        if (ghost) { ghost.remove(); const b = $$('.bin', bins).find(b => b.classList.contains('over')); $$('.bin', bins).forEach(x => x.classList.remove('over')); if (b) { st.placed[n] = b.dataset.bin; st.sel = null; render(); } } };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    }
    const an = loop(el, dt => { st.t = Math.min(1, st.t + dt); drawDemo(); return st.t < 1; });
    function drawDemo() {
      const { ctx, W, H } = cvs, c = col(); if (!ctx) return; ctx.clearRect(0, 0, W, H);
      const mx = 70, cy = H / 2; ctx.fillStyle = c.neg; ctx.fillRect(mx - 50, cy - 18, 50, 36); ctx.fillStyle = c.pos; ctx.fillRect(mx, cy - 18, 50, 36); text(ctx, 'N', mx + 30, cy, '#fff', 15, 'center', 1);
      text(ctx, st.strong ? 'مغناطيس قوي' : 'مغناطيس اعتيادي', mx, cy + 34, c.muted, 11);
      if (!st.demo) { text(ctx, 'صنّف مادة تصنيفاً صحيحاً ثم اضغطها لترى سلوكها هنا', W / 2 + 40, cy, c.muted, 12); return; }
      const k = M.find(m => m[0] === st.demo)[1], base = W * 0.6, e = st.t * st.t * (3 - 2 * st.t);
      let x = base, msg;
      if (k === 'ferro') { x = base - e * (base - mx - 76); msg = 'تنجذب بقوة: مادة فيرومغناطيسية تنجذب حتى بالمغناطيس الاعتيادي.'; }
      else if (!st.strong) { msg = 'لا يظهر عليها تأثير واضح بالمغناطيس الاعتيادي.'; }
      else if (k === 'para') { x = base - e * 30; msg = 'تنجذب انجذاباً ضعيفاً نحو المغناطيس القوي.'; }
      else { x = base + e * 30; msg = 'تتنافر تنافراً ضعيفاً مع المغناطيس القوي.'; }
      ctx.fillStyle = k === 'ferro' ? c.metal : k === 'para' ? c.metalL : c.copper; ctx.fillRect(x - 26, cy - 14, 52, 28); text(ctx, st.demo, x, cy - 26, c.ink, 12, 'center', 1);
      text(ctx, msg, W / 2 + 40, H - 14, c.ink, 12);
    }
    cvs.onResize = drawDemo; cvs.fit(); render();
  };

  // ============================================================ L13 التمغنط بالدلك والحث
  SIMS.L13 = function (el) {
    const st = { pole: 'S', m: 0, strokes: 0, px: 0, py: 0, dragging: false, startX: null, minX: 1e9, maxX: -1e9, dist: 0.6, ipole: 'N' };
    el.append(h('h4', null, '(a) التمغنط بالدلك: إبرة خياطة من الفولاذ'));
    const cvs = canvasIn(el, 0.32, 170, 240); const ro = readout(); el.append(ro);
    const ps = h('select', { class: 'ans', style: 'min-width:0', 'aria-label': 'القطب الدالك' }, h('option', { value: 'S' }, 'الدلك بالقطب الجنوبي S'), h('option', { value: 'N' }, 'الدلك بالقطب الشمالي N'));
    el.append(h('div', { class: 'row', style: 'margin-top:8px' }, ps, btn('ادلك مرة (من اليمين إلى اليسار)', () => auto(-1)), btn('ادلك بالاتجاه المعاكس', () => auto(1)), btn('أعد الإبرة غير ممغنطة', () => { st.m = 0; st.strokes = 0; draw(); })),
      note('اسحب المغناطيس على طول الإبرة باتجاه واحد. كل دلكة كاملة باتجاه واحد تزيد التمغنط، والدلك بالاتجاه المعاكس يضعفه. شدة التمغنط هنا تمثيل نوعي.'));
    ps.onchange = () => { st.pole = ps.value; st.m = 0; st.strokes = 0; draw(); };
    let geo = {};
    const stroke = dir => { st.m = Math.max(-10, Math.min(10, st.m + dir)); st.strokes++; draw(); };
    let anim = null;
    const an = loop(el, dt => { if (!anim) return false; anim.t += dt * 1.3; st.px = anim.from + (anim.to - anim.from) * Math.min(1, anim.t); st.py = geo.ny - 30; if (anim.t >= 1) { stroke(anim.dir); anim = null; st.px = -1; } draw(); return !!anim; });
    function auto(d) { if (anim) return; anim = { from: d < 0 ? geo.x2 : geo.x1, to: d < 0 ? geo.x1 : geo.x2, t: 0, dir: d < 0 ? 1 : -1 }; an.start(); }
    function draw() {
      const { ctx, W, H } = cvs, c = col(); ctx.clearRect(0, 0, W, H);
      const x1 = W * 0.15, x2 = W * 0.85, ny = H * 0.65; geo = { x1, x2, ny };
      ctx.fillStyle = c.metal; ctx.fillRect(x1, ny - 4, x2 - x1, 8); ctx.beginPath(); ctx.moveTo(x1, ny - 4); ctx.lineTo(x1 - 16, ny); ctx.lineTo(x1, ny + 4); ctx.fill();
      // m>0: المغنطة نتجت عن دلك من اليمين إلى اليسار ⇒ نهاية الدلك (اليسار) مخالف للقطب الدالك
      if (Math.abs(st.m) >= 1) { const endLeft = st.m > 0; const opp = st.pole === 'S' ? 'N' : 'S'; const lp = endLeft ? opp : st.pole, rp = endLeft ? st.pole : opp;
        text(ctx, lp, x1 + 4, ny + 20, lp === 'N' ? c.pos : c.neg, 15, 'center', 1); text(ctx, rp, x2 - 4, ny + 20, rp === 'N' ? c.pos : c.neg, 15, 'center', 1); }
      const px = st.px > 0 ? st.px : x2 + 40, py = st.px > 0 ? st.py : ny - 50;
      ctx.fillStyle = st.pole === 'N' ? c.pos : c.neg; ctx.fillRect(px - 14, py - 10, 28, 24); ctx.fillStyle = st.pole === 'N' ? c.neg : c.pos; ctx.fillRect(px - 14, py - 46, 28, 36);
      text(ctx, st.pole, px, py + 2, '#fff', 13, 'center', 1); geo.mx = px; geo.my = py;
      ctx.fillStyle = c.surface2; ctx.fillRect(12, 12, 120, 10); ctx.fillStyle = c.ok; ctx.fillRect(12, 12, 12 * Math.abs(st.m), 10); text(ctx, 'شدة التمغنط', 72, 32, c.muted, 11);
      ro.innerHTML = `<span class="r">دلكات: <b>${st.strokes}</b></span><span class="r">الإبرة: <b>${Math.abs(st.m) >= 1 ? 'ممغنطة' : 'غير ممغنطة'}</b></span><span class="r">القطب في نهاية جهة الدلك مخالف للقطب الدالك</span>`;
    }
    drag(cvs.cv, { hit: (x, y) => Math.abs(x - geo.mx) < 22 && Math.abs(y - geo.my + 10) < 40 ? 1 : null, hover: true,
      down: (t, x) => { st.startX = x; st.minX = x; st.maxX = x; },
      move: (t, x, y) => { st.px = x; st.py = Math.min(y, geo.ny - 18); st.minX = Math.min(st.minX, x); st.maxX = Math.max(st.maxX, x); draw(); },
      up: (t, x) => { if (st.minX <= geo.x1 + 15 && st.maxX >= geo.x2 - 15 && Math.abs(st.py - geo.ny) < 50) stroke(x < st.startX ? 1 : -1); st.px = -1; draw(); } });
    cvs.onResize = draw; cvs.fit(); draw();

    // (b) الحث بالتقريب
    el.append(h('h4', { style: 'margin-top:14px' }, '(b) التمغنط بالحث: تقريب مسمار حديد من مغناطيس قوي'));
    const cv2 = canvasIn(el, 0.3, 160, 220); const ro2 = readout(); el.append(ro2);
    const ip = h('select', { class: 'ans', style: 'min-width:0', 'aria-label': 'القطب المؤثر' }, h('option', { value: 'N' }, 'القطب المقابل للمسمار: N'), h('option', { value: 'S' }, 'القطب المقابل للمسمار: S'));
    const sd = slider('البعد بين المسمار والمغناطيس (من غير تماس)', 0.05, 1, 0.05, st.dist, v => v < 0.35 ? 'قريب' : v < 0.7 ? 'متوسط' : 'بعيد', v => { st.dist = v; draw2(); });
    el.append(h('div', { class: 'row', style: 'margin-top:8px' }, ip), ctl(sd.el));
    ip.onchange = () => { st.ipole = ip.value; draw2(); };
    function draw2() {
      const { ctx, W, H } = cv2, c = col(); ctx.clearRect(0, 0, W, H); const cy = H * 0.45;
      const other = st.ipole === 'N' ? 'S' : 'N';
      ctx.fillStyle = other === 'N' ? c.pos : c.neg; ctx.fillRect(20, cy - 18, 70, 36); ctx.fillStyle = st.ipole === 'N' ? c.pos : c.neg; ctx.fillRect(90, cy - 18, 70, 36);
      text(ctx, other, 55, cy, '#fff', 15, 'center', 1); text(ctx, st.ipole, 125, cy, '#fff', 15, 'center', 1);
      const nx = 170 + st.dist * (W - 360), strength = Math.max(0, 1 - st.dist) ;
      ctx.fillStyle = c.metal; ctx.fillRect(nx, cy - 6, 150, 12); ctx.beginPath(); ctx.moveTo(nx + 150, cy - 6); ctx.lineTo(nx + 168, cy); ctx.lineTo(nx + 150, cy + 6); ctx.fill();
      const mag = strength > 0.15;
      if (mag) { const near = st.ipole === 'N' ? 'S' : 'N'; text(ctx, near, nx + 8, cy - 18, near === 'N' ? c.pos : c.neg, 15, 'center', 1); text(ctx, st.ipole, nx + 158, cy - 18, st.ipole === 'N' ? c.pos : c.neg, 15, 'center', 1);
        const pins = Math.round(strength * 4); for (let i = 0; i < pins; i++) { ctx.strokeStyle = c.metal; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(nx + 160 - i * 5, cy + 6); ctx.lineTo(nx + 158 - i * 5, cy + 34); ctx.stroke(); } }
      ro2.innerHTML = mag ? `<span class="r">الطرف القريب: <b>${st.ipole === 'N' ? 'S' : 'N'}</b> (مخالف للقطب المؤثر)</span><span class="r">الطرف البعيد: <b>${st.ipole}</b> (مشابه)</span><span class="r">التمغنط ${strength > 0.6 ? 'قوي' : 'ضعيف'} (نوعي)</span>` : '<span class="r">المسمار بعيد: التأثير ضعيف جداً</span>';
    }
    cv2.onResize = draw2; cv2.fit(); draw2();
  };

  // ============================================================ L14 المغناطيس الكهربائي
  SIMS.L14 = function (el) {
    const MAT = { iron: ['حديد', 1], steel: ['فولاذ', 1], copper: ['نحاس', 0] };
    const st = { I: 2, N: 40, mat: 'steel' };
    const cvs = canvasIn(el, 0.5, 260, 380); const ro = readout(); el.append(ro);
    const sI = slider('التيار المستمر (وحدات نسبية)', 0, 5, 0.5, st.I, v => v, v => { st.I = v; draw(); });
    const sN = slider('عدد لفات الملف', 0, 100, 10, st.N, v => v, v => { st.N = v; draw(); });
    const sm = h('select', { class: 'ans', style: 'min-width:0', 'aria-label': 'المادة' }, ...Object.entries(MAT).map(([k, v]) => h('option', { value: k }, 'قلب من ' + v[0])));
    sm.value = st.mat; sm.onchange = () => { st.mat = sm.value; draw(); };
    el.append(ctl(sI.el, sN.el), h('div', { class: 'row', style: 'margin-top:8px' }, sm),
      note('<span class="qual">تمثيل نوعي</span> الكتاب يذكر أن قوة المغناطيس الكهربائي تعتمد على مقدار التيار وعدد اللفات ونوع المادة، ولا يعطي قانوناً كمياً. عدد الدبابيس هنا للتوضيح فقط. النحاس ليس مادة فيرومغناطيسية فلا يتمغنط. ولا يقارن الكتاب بين الحديد والفولاذ كمياً، فجعلناهما متساويين هنا.'));
    function draw() {
      const { ctx, W, H } = cvs, c = col(); ctx.clearRect(0, 0, W, H);
      const pins = Math.round(Math.min(20, st.I * st.N / 500 * 20 * MAT[st.mat][1]));
      const x1 = W * 0.2, x2 = W * 0.75, cy = H * 0.3;
      ctx.fillStyle = st.mat === 'copper' ? c.copper : c.metal; ctx.fillRect(x1, cy - 12, x2 - x1, 24);
      const turns = Math.round(st.N / 5);
      for (let i = 0; i < turns; i++) { const x = x1 + 10 + i * (x2 - x1 - 20) / Math.max(1, turns - 1); ctx.strokeStyle = c.copper; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, cy, 4, 18, 0, 0, 7); ctx.stroke(); }
      ctx.strokeStyle = c.copper; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1 + 10, cy + 18); ctx.lineTo(x1 + 10, H - 30); ctx.lineTo(W * 0.4, H - 30); ctx.moveTo(x2 - 10, cy + 18); ctx.lineTo(x2 - 10, H - 30); ctx.lineTo(W * 0.55, H - 30); ctx.stroke();
      ctx.fillStyle = c.muted; ctx.fillRect(W * 0.4, H - 42, W * 0.15, 24); text(ctx, st.I ? 'بطارية' : 'التيار مقطوع', W * 0.475, H - 30, '#fff', 11);
      // الدبابيس
      for (let i = 0; i < pins; i++) { const x = x1 + 20 + (i % 10) * ((x2 - x1 - 40) / 9), y = cy + 14 + Math.floor(i / 10) * 26; ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2, y + 22); ctx.stroke(); ball(ctx, x, y + 1, 2.5, c.ink); }
      const pile = 20 - pins; for (let i = 0; i < pile; i++) { const x = W * 0.82 + (i % 5) * 9, y = H - 22 - Math.floor(i / 5) * 6; ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8, y - 3); ctx.stroke(); }
      text(ctx, 'دبابيس', W * 0.84, H - 54, c.muted, 11);
      ro.innerHTML = `<span class="r">الدبابيس المرفوعة: <b>${pins}</b> من 20</span><span class="r">${st.mat === 'copper' ? 'النحاس لا يتمغنط' : st.I && st.N ? 'مغناطيس كهربائي' : 'لا مغناطيسية: لا تيار أو لا لفات'}</span>`;
      el.dataset.pins = pins;
    }
    cvs.onResize = draw; cvs.fit(); draw();
  };

  // ------------------------------------------------------------ واجهة
  P.lab = {
    mount(id, inLesson) {
      const el = shell(id, inLesson !== false);
      requestAnimationFrame(() => { try { SIMS[id](el); } catch (e) { console.error(e); el.append(h('p', { class: 'box warnbox' }, 'تعذّر تشغيل المحاكاة: ' + e.message)); } });
      return el;
    }
  };
  P.route('lab', function (main, arg) {
    const id = arg ? arg.toUpperCase() : null;
    if (id && SIMS[id]) {
      const m = P.simById[id], idx = P.D.sims.indexOf(m), prev = P.D.sims[idx - 1], next = P.D.sims[idx + 1];
      main.innerHTML = `<div class="crumbs"><a href="#lab">المختبر</a> › ${id}</div><h1>${m.title}</h1>`;
      main.append(P.lab.mount(id, false));
      main.append(h('div', { class: 'nextprev', html: `${prev ? `<a class="btn" href="#lab-${prev.id.toLowerCase()}">→ ${prev.title}</a>` : '<span></span>'}${next ? `<a class="btn" href="#lab-${next.id.toLowerCase()}">${next.title} ←</a>` : ''}` }));
      return;
    }
    main.innerHTML = `<div class="page-head"><div><h1>مختبر الفيزياء</h1><p>14 محاكاة تفاعلية. المحاكاة الموسومة «تمثيل نوعي» توضح ظاهرة يشرحها الكتاب دون قانون كمي.</p></div></div>
      ${P.D.chapters.map(c => `<h2>${c.title}</h2><div class="labgrid" style="margin-bottom:18px">${P.D.sims.filter(s => s.ch === c.n).map(s => { const l = P.lessonById[s.lesson]; return `<a class="card labtile ch${c.n}c" href="#lab-${s.id.toLowerCase()}"><span class="pill">${s.id}</span> <b>${s.title}</b><div class="small muted">الدرس ${l.sec} ${l.title}</div>${s.qualitative ? '<span class="qual">تمثيل نوعي</span>' : ''}</a>`; }).join('')}</div>`).join('')}`;
  });
})(window.P);
