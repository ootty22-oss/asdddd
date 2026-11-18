/* المخطط الذهني: مأخوذ من مكوّن المخطط السابق، ويُبنى الآن من curriculum.json */
(function (P) {
  'use strict';
  const { h, $, $$, store } = P;
  const TYPES = {
    root: { n: 'المنهج', c: 'var(--ink)' }, chapter: { n: 'فصل' }, lesson: { n: 'درس' },
    concept: { n: 'مفهوم', c: '#0f766e' }, def: { n: 'تعريف', c: 'var(--def)' }, law: { n: 'قانون', c: 'var(--law)' },
    ex: { n: 'مثال محلول', c: 'var(--ex)' }, act: { n: 'نشاط', c: 'var(--act)' }, app: { n: 'تطبيق', c: '#0891b2' },
    note: { n: 'تذكّر / ملاحظة', c: 'var(--note)' }, enrich: { n: 'للاطلاع', c: 'var(--enr)' }, q: { n: 'أسئلة الكتاب', c: '#475569' }
  };
  const CH = { 1: ['var(--ch1)', 'var(--ch1-soft)'], 2: ['var(--ch2)', 'var(--ch2-soft)'] };

  function build() {
    let _id = 0;
    const N = (type, t, body, kids, o) => Object.assign({ id: 'm' + (++_id), type, t, body: body || '', kids: kids || [] }, o || {});
    const D = P.D;
    const root = N('root', 'فيزياء الثالث المتوسط', `<p>المخطط مبني من محتوى الكتاب (صفحات 7–46): <b>الفصل الأول (الكهربائية الساكنة)</b> و<b>الفصل الثاني (المغناطيسية)</b>.</p><ul><li>اضغط أي عقدة لترى شرحها هنا.</li><li>الزر الدائري بجانب العقدة يطوي فروعها أو يفتحها.</li><li>اسحب للتحريك، واستعمل العجلة أو إصبعين للتكبير.</li><li>زر «الروابط» يُظهر الصلات بين مفاهيم الفصلين.</li></ul>` + D.global_flags.map(P.flagBox).join(''),
      D.chapters.map(c => N('chapter', c.title, `<p>صفحات الكتاب ${c.pages}.</p>` + (c.contents ? `<ul>${c.contents.map(x => `<li>${x}</li>`).join('')}</ul>` : '') + c.review_flags.map(P.flagBox).join(''),
        [
          ...(c.goals.length ? [N('note', 'الأهداف السلوكية والمصطلحات', `<ul>${c.goals.map(g => `<li>${g}</li>`).join('')}</ul><table>${c.terms.map(t => `<tr><td>${t[0]}</td><td><span class="ltr">${t[1]}</span></td></tr>`).join('')}</table>`, [], { ch: c.n, chapterLink: c.n })] : []),
          ...c.lessons.map(l => N('lesson', l.title, l.summary + l.review_flags.map(P.flagBox).join(''), [
            ...l.explain.map(it => N(it.kind === 'app' ? 'app' : it.kind === 'note' ? 'note' : 'concept', it.title, it.html + (it.fig ? P.fig(it.fig) : ''), [], { iid: it.id, links: it.links })),
            ...l.definitions.map(d => N('def', d.term, `<div class="item def"><p>${d.text}</p></div>` + (d.fig ? P.fig(d.fig) : ''), [], { iid: d.id })),
            ...l.laws.map(x => N('law', x.name, P.renderLaw(x, false), [], { iid: x.id, links: x.links })),
            ...l.examples.filter(e => e.source === 'book').map(e => N('ex', e.title, `<p>${e.text}</p><div class="solhere" data-ex="${e.id}"></div>`, [], { iid: e.id })),
            ...l.activities.map(a => N('act', a.title, `<p><b>الأدوات:</b> ${a.tools}</p><ol>${a.steps.map(s => `<li>${s}</li>`).join('')}</ol><div class="box notebox"><b>النتيجة:</b> ${a.result}</div>`, [], { iid: a.id, links: a.links })),
            ...l.enrich.map(e => N('enrich', e.title, `<div class="item enr"><p>${e.html}</p></div>`, [], { iid: e.id })),
          ], { lid: l.id, sec: l.sec, ch: c.n })),
          N('q', `أسئلة ${c.n === 1 ? 'الفصل الأول ومسائله' : 'الفصل الثاني'}`, `<p>${c.book_questions.length} سؤالاً من الكتاب${c.book_problems.length ? ' و' + c.book_problems.length + ' مسائل' : ''}، بإجابات نموذجية وتصحيح.</p>`, [], { ch: c.n, chapterLink: c.n })
        ], { ch: c.n })));
    const byId = {}, parent = {}, byItem = {};
    (function walk(n, p, depth, ch, side) {
      n.depth = depth; n.ch = n.ch || ch; n.side = side; byId[n.id] = n; if (p) parent[n.id] = p; if (n.iid) byItem[n.iid] = n.id;
      n.kids.forEach((k, i) => walk(k, n, depth + 1, depth === 0 ? i + 1 : n.ch, depth === 0 ? (i === 0 ? 1 : -1) : side));
    })(root, null, 0, 0, 0);
    // روابط ثنائية الاتجاه بين المفاهيم
    const pairs = [], seen = new Set();
    Object.values(byId).forEach(n => (n.links || []).forEach(iid => {
      const m = byItem[iid]; if (!m || m === n.id) return; const k = [n.id, m].sort().join('|');
      if (!seen.has(k)) { seen.add(k); pairs.push([n.id, m]); }
      const mn = byId[m]; mn.xl = mn.xl || []; n.xl = n.xl || []; if (!n.xl.includes(m)) n.xl.push(m); if (!mn.xl.includes(n.id)) mn.xl.push(n.id);
    }));
    return { root, byId, parent, pairs };
  }

  P.route('map', function (main) {
    const M = build(), { root, byId, parent, pairs } = M;
    main.innerHTML = `<div class="page-head"><div><h1>المخطط الذهني للمنهج</h1><p>${Object.keys(byId).length} عقدة من الفصلين. اضغط درساً ثم «افتح الدرس كاملاً».</p></div></div>
      <div id="mapbox"><div class="mtools"><div class="msearch"><input id="mq" type="search" placeholder="ابحث… مثل: كولوم" aria-label="بحث في المخطط"><div id="mresults"></div></div>
        <button class="btn sm" data-lvl="1">الفصول</button><button class="btn sm" data-lvl="2">الدروس</button><button class="btn sm" data-lvl="9">الكل</button>
        <button class="btn sm" id="mxl">الروابط</button><button class="btn sm" id="mzin" aria-label="تكبير">＋</button><button class="btn sm" id="mzout" aria-label="تصغير">－</button><button class="btn sm" id="mfit" aria-label="ملاءمة">⤢</button></div>
        <div id="mstage"><div id="mworld"><svg id="medges"></svg><div id="mnodes"></div></div></div><div id="mlegend"></div>
        <aside id="mpanel" aria-live="polite"><div class="ph"><button class="x" id="mclose" aria-label="إغلاق">×</button><div class="crumbs" id="mcrumbs"></div><span class="pill" id="mbadge"></span><h2 id="mtitle"></h2></div><div class="pb" id="mbody"></div><div class="pf" id="mfoot"></div></aside></div>`;
    const box = $('#mapbox', main), stage = $('#mstage', main), world = $('#mworld', main), nodesEl = $('#mnodes', main), svg = $('#medges', main), panel = $('#mpanel', main);
    const color = n => n.type === 'root' ? 'var(--ink)' : (n.type === 'chapter' || n.type === 'lesson') ? CH[n.ch][0] : TYPES[n.type].c;
    const label = n => n.type === 'lesson' ? 'درس ' + n.sec : n.type === 'chapter' ? 'الفصل ' + (n.ch === 1 ? 'الأول' : 'الثاني') : TYPES[n.type].n;
    let open = new Set();
    const setLevel = lv => { open = new Set(); Object.values(byId).forEach(n => { if (n.depth < lv && n.kids.length) open.add(n.id); }); };
    setLevel(box.clientWidth <= 700 ? 1 : 2);
    const COLW = 235, HC = {}; let pos = {};
    const W = n => n.type === 'root' ? 230 : n.type === 'chapter' ? 200 : 190;
    function layout() {
      pos = {}; pos[root.id] = { x: 0, y: 0 };
      [1, -1].forEach(side => {
        let cur = 0; const placed = [];
        function lay(n, d) {
          const x = side * (d * COLW + 20); const vis = open.has(n.id) ? n.kids : [];
          if (!vis.length) { const hh = (HC[n.id] || 48) + 10; const y = cur + hh / 2; cur += hh; pos[n.id] = { x, y }; placed.push(n.id); return y; }
          const ys = vis.map(k => lay(k, d + 1)); const y = (ys[0] + ys[ys.length - 1]) / 2; pos[n.id] = { x, y }; placed.push(n.id); return y;
        }
        if (open.has(root.id)) lay(root.kids[side === 1 ? 0 : 1], 1);
        const ys = placed.map(id => pos[id].y); if (ys.length) { const off = -(Math.min(...ys) + Math.max(...ys)) / 2; placed.forEach(id => pos[id].y += off); }
      });
    }
    let selected = null, showX = false, typeFilter = null, matches = new Set();
    function render() {
      const ids = [root.id]; (function add(n) { if (open.has(n.id)) n.kids.forEach(k => { ids.push(k.id); add(k); }); })(root);
      nodesEl.innerHTML = ''; const els = {};
      ids.forEach(id => {
        const n = byId[id];
        const done = n.type === 'lesson' && store.s.lessons[n.lid];
        const d = h('div', { class: `mnode ${n.type}${id === selected ? ' sel' : ''}${matches.has(id) ? ' match' : ''}${done ? ' done' : ''}${typeFilter && n.type !== typeFilter && !['root', 'chapter'].includes(n.type) ? ' dim' : ''}`, 'data-id': id });
        d.style.setProperty('--k', color(n)); if (n.type === 'lesson') d.style.setProperty('--soft', CH[n.ch][1]);
        const flag = n.body.includes('warnbox') ? ' <span class="flag" title="فيه ملاحظة تحتاج مراجعة">⚠</span>' : '';
        d.innerHTML = (n.type !== 'root' ? `<span class="k">${label(n)}${flag}</span>` : '') + `<span class="tt">${n.t}</span>`;
        if (n.kids.length && n.type !== 'root') { const b = h('button', { class: 'mtg ' + (n.side === 1 ? 'r' : 'l'), 'data-tg': id, title: open.has(id) ? 'طي الفروع' : 'فتح الفروع', type: 'button' }, open.has(id) ? '−' : String(n.kids.length)); d.append(b); }
        nodesEl.append(d); els[id] = d;
      });
      ids.forEach(id => { if (!HC[id]) HC[id] = els[id].offsetHeight; });
      layout(); ids.forEach(id => { els[id].style.left = pos[id].x + 'px'; els[id].style.top = pos[id].y + 'px'; });
      drawEdges();
    }
    function drawEdges() {
      let s = '';
      Object.keys(pos).forEach(id => {
        const p = parent[id]; if (!p || !pos[p.id]) return; const n = byId[id], a = pos[p.id], b = pos[id], sd = n.side;
        const x1 = a.x + sd * W(p) / 2, x2 = b.x - sd * W(n) / 2, mx = (x1 + x2) / 2;
        s += `<path class="medge" style="${n.depth <= 2 ? 'stroke:' + color(n) : ''}" d="M${x1},${a.y} C${mx},${a.y} ${mx},${b.y} ${x2},${b.y}"/>`;
      });
      pairs.forEach(([u, v]) => {
        const hot = selected && (u === selected || v === selected); if (!(showX || hot) || !pos[u] || !pos[v]) return;
        const a = pos[u], b = pos[v], cy = Math.min(a.y, b.y) - 60 - Math.abs(b.x - a.x) * 0.15;
        s += `<path class="xlink${hot ? ' hot' : ''}" d="M${a.x},${a.y} Q${(a.x + b.x) / 2},${cy} ${b.x},${b.y}"/>`;
      });
      svg.innerHTML = s;
    }
    let T = { x: 0, y: 0, s: .8 };
    const apply = anim => { world.classList.toggle('anim', !!anim && !P.reduced()); world.style.transform = `translate(${T.x}px,${T.y}px) scale(${T.s})`; };
    const zoomAt = (f, cx, cy) => { const ns = Math.min(2.5, Math.max(.15, T.s * f)); T.x = cx - (cx - T.x) * ns / T.s; T.y = cy - (cy - T.y) * ns / T.s; T.s = ns; apply(); };
    const rel = e => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    stage.addEventListener('wheel', e => { e.preventDefault(); const p = rel(e); zoomAt(Math.exp(-e.deltaY * .0015), p.x, p.y); }, { passive: false });
    const ptrs = new Map(); let moved = 0, last = null, pinch = null;
    stage.addEventListener('pointerdown', e => { ptrs.set(e.pointerId, rel(e)); moved = 0; last = rel(e); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: T.s }; } });
    const pm = e => {
      if (!ptrs.has(e.pointerId)) return; const p = rel(e); ptrs.set(e.pointerId, p);
      if (ptrs.size === 2 && pinch) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); zoomAt(pinch.s * d / pinch.d / T.s, (a.x + b.x) / 2, (a.y + b.y) / 2); moved = 99; return; }
      const dx = p.x - last.x, dy = p.y - last.y; moved += Math.abs(dx) + Math.abs(dy); T.x += dx; T.y += dy; last = p; apply();
    };
    const pu = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (ptrs.size === 1) last = [...ptrs.values()][0]; };
    window.addEventListener('pointermove', pm); window.addEventListener('pointerup', pu); window.addEventListener('pointercancel', pu);
    P.onLeave(() => { window.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu); window.removeEventListener('pointercancel', pu); });
    stage.addEventListener('click', e => {
      if (moved > 6) return;
      const tg = e.target.closest('[data-tg]'); if (tg) { const id = tg.dataset.tg; open.has(id) ? open.delete(id) : open.add(id); render(); return; }
      const nd = e.target.closest('.mnode'); if (nd) select(nd.dataset.id, false);
    });
    function fit() {
      layout(); const xs = [], ys = []; Object.keys(pos).forEach(id => { const p = pos[id], w = W(byId[id]) / 2; xs.push(p.x - w, p.x + w); ys.push(p.y - 40, p.y + 40); });
      const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
      const vw = box.clientWidth - 30, top = 64, vh = box.clientHeight - top - 20;
      T.s = Math.min(1.1, Math.max(.15, Math.min(vw / (maxx - minx), vh / (maxy - miny)))); T.x = box.clientWidth / 2 - (minx + maxx) / 2 * T.s; T.y = top + vh / 2 - (miny + maxy) / 2 * T.s; apply(true);
    }
    function centerOn(id) {
      const p = pos[id]; if (!p) return; const mob = box.clientWidth <= 700, pw = panel.classList.contains('open') && !mob ? 440 : 0;
      if (T.s < .6) T.s = .75; T.x = (box.clientWidth + pw) / 2 - p.x * T.s; T.y = (mob ? box.clientHeight * .18 : box.clientHeight / 2) - p.y * T.s; apply(true);
    }
    function select(id, center) {
      const n = byId[id]; selected = id; let p = parent[id]; while (p) { open.add(p.id); p = parent[p.id]; } if (n.kids.length) open.add(id);
      render(); panel.style.setProperty('--k', color(n));
      $('#mbadge', main).textContent = label(n); $('#mtitle', main).innerHTML = n.t;
      const path = []; p = parent[id]; while (p) { path.unshift(p); p = parent[p.id]; }
      $('#mcrumbs', main).innerHTML = path.map(x => `<a href="#map" data-go="${x.id}">${P.strip(x.t)}</a>`).join(' › ');
      let body = n.body;
      if (n.kids.length) body += `<h4>الفروع</h4><div class="chips">${n.kids.map(k => `<button class="chip" style="--k:${color(k)}" data-go="${k.id}" type="button">${k.t} <small class="muted">· ${label(k)}</small></button>`).join('')}</div>`;
      if (n.xl && n.xl.length) body += `<h4>مرتبط بـ</h4><div class="chips">${n.xl.map(x => byId[x]).map(k => `<button class="chip" style="--k:${color(k)}" data-go="${k.id}" type="button">${k.t} <small class="muted">· ${k.ch === 1 ? 'الفصل الأول' : 'الفصل الثاني'}</small></button>`).join('')}</div>`;
      const pb = $('#mbody', main); pb.innerHTML = body; pb.scrollTop = 0;
      $$('.solhere', pb).forEach(el => el.append(P.solutionEl(P.exById[el.dataset.ex], { stepwise: true })));
      const lessonNode = n.type === 'lesson' ? n : (() => { let q = parent[id]; while (q && q.type !== 'lesson') q = parent[q.id]; return q; })();
      const foot = $('#mfoot', main); foot.innerHTML = '';
      if (lessonNode) foot.append(h('a', { class: 'btn primary', href: `#lesson-${lessonNode.lid}` }, 'افتح الدرس كاملاً'));
      if (n.chapterLink) foot.append(h('a', { class: 'btn primary', href: `#chapter-${n.chapterLink}` }, 'افتح أسئلة الفصل'));
      const sib = parent[id] ? parent[id].kids : [n], i = sib.indexOf(n);
      foot.append(h('button', { class: 'btn', type: 'button', disabled: i <= 0, onclick: () => select(sib[i - 1].id, true) }, '→ السابق'), h('button', { class: 'btn', type: 'button', disabled: i >= sib.length - 1, onclick: () => select(sib[i + 1].id, true) }, 'التالي ←'));
      panel.classList.add('open'); if (center !== false) setTimeout(() => centerOn(id), 20);
    }
    panel.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); select(g.dataset.go, true); } });
    $('#mclose', main).onclick = () => { panel.classList.remove('open'); selected = null; render(); };
    $$('[data-lvl]', main).forEach(b => b.onclick = () => { setLevel(+b.dataset.lvl); if (selected) { let p = parent[selected]; while (p) { open.add(p.id); p = parent[p.id]; } } render(); fit(); });
    $('#mxl', main).onclick = e => { showX = !showX; e.currentTarget.classList.toggle('on', showX); if (showX) { pairs.forEach(pr => pr.forEach(id => { let p = parent[id]; while (p) { open.add(p.id); p = parent[p.id]; } })); render(); fit(); } else drawEdges(); };
    $('#mzin', main).onclick = () => zoomAt(1.25, box.clientWidth / 2, box.clientHeight / 2);
    $('#mzout', main).onclick = () => zoomAt(.8, box.clientWidth / 2, box.clientHeight / 2);
    $('#mfit', main).onclick = fit;
    const lg = $('#mlegend', main);
    lg.innerHTML = Object.entries(TYPES).filter(([k]) => !['root', 'chapter', 'lesson'].includes(k)).map(([k, v]) => `<button data-t="${k}" type="button"><i style="background:${v.c}"></i>${v.n}</button>`).join('');
    lg.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; typeFilter = typeFilter === b.dataset.t ? null : b.dataset.t; $$('[data-t]', lg).forEach(x => x.classList.toggle('on', x.dataset.t === typeFilter)); render(); });
    const qi = $('#mq', main), res = $('#mresults', main);
    const IDX = Object.values(byId).map(n => ({ n, t: P.norm(n.t), b: P.norm(n.body) }));
    qi.addEventListener('input', () => {
      const q = P.norm(qi.value); matches = new Set();
      if (q.length < 2) { res.style.display = 'none'; render(); return; }
      const hits = IDX.filter(x => x.t.includes(q) || x.b.includes(q)).sort((a, b) => b.t.includes(q) - a.t.includes(q)).slice(0, 30);
      hits.forEach(x => { matches.add(x.n.id); let p = parent[x.n.id]; while (p) { open.add(p.id); p = parent[p.id]; } });
      res.innerHTML = hits.length ? hits.map(x => `<button data-go="${x.n.id}" type="button">${x.n.t}<small>${label(x.n)}</small></button>`).join('') : '<button disabled type="button">لا توجد نتائج</button>';
      res.style.display = 'block'; render();
    });
    res.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) { res.style.display = 'none'; select(g.dataset.go, true); } });
    render(); fit();
    const ro = new ResizeObserver(() => fit()); ro.observe(box); P.onLeave(() => ro.disconnect());
  });
})(window.P);
